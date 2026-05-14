"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuthUserId } from "@/lib/supabase/require-auth-user";
import { verifactuGetStatus } from "@/lib/verifacti/client";
import { parseVerifactuStatusResponse } from "@/lib/verifacti/parse-status-response";
import { revalidatePath } from "next/cache";

export type VerifactiStatusActionState = { ok?: true; error?: string; info?: string };

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

  const { data: inv, error: invErr } = await supabase
    .from("invoices")
    .select("id, verifacti_uuid, verifacti_registro_estado")
    .eq("id", invoiceId)
    .single();

  if (invErr || !inv) return { error: "Factura no encontrada." };
  const uuid = (inv.verifacti_uuid as string | null)?.trim();
  if (!uuid) {
    return {
      error:
        "Esta factura no tiene UUID de Verifacti. Solo las emitidas con Verifacti activo pueden consultar estado.",
    };
  }

  const res = await verifactuGetStatus(uuid);
  if (!res.ok) {
    return {
      error: `Verifacti respondió ${res.status}: ${res.message}`,
    };
  }

  const parsed = parseVerifactuStatusResponse(res.json);
  const nowIso = new Date().toISOString();

  const nextEstado = parsed.estado ?? (inv.verifacti_registro_estado as string | null) ?? null;
  const nextError = parsed.mensajeError?.trim()
    ? parsed.mensajeError.trim().slice(0, 2000)
    : null;

  const patch: Record<string, string | null> = {
    verifacti_registro_estado: nextEstado,
    verifacti_last_error: nextError,
    verifacti_updated_at: nowIso,
  };
  if (parsed.qrBase64) {
    patch.verifacti_qr_base64 = parsed.qrBase64;
  }

  const { error: upErr } = await supabase.from("invoices").update(patch).eq("id", invoiceId);
  if (upErr) return { error: upErr.message };

  await supabase.from("invoice_events").insert({
    invoice_id: invoiceId,
    event_type: "verifacti_status",
    payload: {
      uuid,
      estado: nextEstado,
      tiene_error: Boolean(nextError),
    },
  });

  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/invoices");

  const info = nextEstado
    ? `Estado actual: ${nextEstado}${nextError ? `. Detalle: ${nextError.slice(0, 280)}` : ""}.`
    : "Consulta realizada; revisa el estado en pantalla.";

  return { ok: true, info };
}
