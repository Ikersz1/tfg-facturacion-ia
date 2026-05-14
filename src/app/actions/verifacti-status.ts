"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuthUserId } from "@/lib/supabase/require-auth-user";
import { syncVerifactuStatusForInvoice } from "@/lib/verifacti/sync-invoice-status";
import { revalidatePath } from "next/cache";

export type VerifactiStatusActionState = { ok?: true; error?: string; info?: string };

export type BulkVerifactiStatusActionState = {
  ok?: true;
  error?: string;
  info?: string;
  checked?: number;
  failed?: number;
};

const BULK_PENDING_LIMIT = 20;

/**
 * Facturas con UUID Verifacti y estado de registro vacío o que contiene "pendiente" (heurística AEAT en curso).
 */
export async function refreshPendingVerifactuInvoicesAction(
  _prev: BulkVerifactiStatusActionState,
  _formData: FormData,
): Promise<BulkVerifactiStatusActionState> {
  const supabase = await createClient();
  const auth = await requireAuthUserId(supabase);
  if ("error" in auth) return { error: auth.error };

  if (!process.env.VERIFACTI_NIF_API_KEY?.trim()) {
    return { error: "Verifacti no está configurado en el servidor (VERIFACTI_NIF_API_KEY)." };
  }

  const { data: nullEstado, error: e1 } = await supabase
    .from("invoices")
    .select("id")
    .not("verifacti_uuid", "is", null)
    .is("verifacti_registro_estado", null)
    .limit(BULK_PENDING_LIMIT);

  const { data: pendienteRows, error: e2 } = await supabase
    .from("invoices")
    .select("id")
    .not("verifacti_uuid", "is", null)
    .ilike("verifacti_registro_estado", "%pendiente%")
    .limit(BULK_PENDING_LIMIT);

  if (e1 || e2) {
    return { error: e1?.message ?? e2?.message ?? "No se pudo listar facturas." };
  }

  const idSet = new Set<string>();
  for (const r of nullEstado ?? []) idSet.add(r.id as string);
  for (const r of pendienteRows ?? []) idSet.add(r.id as string);
  const ids = [...idSet].slice(0, BULK_PENDING_LIMIT);

  if (ids.length === 0) {
    return { ok: true, info: "No hay facturas con registro AEAT pendiente.", checked: 0, failed: 0 };
  }

  let failed = 0;
  for (const id of ids) {
    const r = await syncVerifactuStatusForInvoice(supabase, id, "user");
    if (!r.ok) failed++;
  }

  revalidatePath("/invoices");
  for (const id of ids) {
    revalidatePath(`/invoices/${id}`);
  }

  const info =
    failed > 0
      ? `Consultadas ${ids.length} factura(s). ${failed} devolvieron error al consultar Verifacti.`
      : `Actualizado el estado de ${ids.length} factura(s) pendiente(s).`;

  return { ok: true, info, checked: ids.length, failed };
}

export async function refreshVerifactuInvoiceStatusAction(
  _prev: VerifactiStatusActionState,
  formData: FormData,
): Promise<VerifactiStatusActionState> {
  const invoiceId = formData.get("invoice_id")?.toString();
  if (!invoiceId) return { error: "Falta factura." };

  const supabase = await createClient();
  const auth = await requireAuthUserId(supabase);
  if ("error" in auth) return { error: auth.error };

  if (!process.env.VERIFACTI_NIF_API_KEY?.trim()) {
    return { error: "Verifacti no está configurado en el servidor (VERIFACTI_NIF_API_KEY)." };
  }

  const sync = await syncVerifactuStatusForInvoice(supabase, invoiceId, "user");
  if (!sync.ok) return { error: sync.error };

  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/invoices");

  const info = sync.estado
    ? `Estado actual: ${sync.estado}${sync.mensajeError ? `. Detalle: ${sync.mensajeError.slice(0, 280)}` : ""}.`
    : "Consulta realizada; revisa el estado en pantalla.";

  return { ok: true, info };
}
