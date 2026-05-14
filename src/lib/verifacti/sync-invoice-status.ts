import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { verifactuGetStatus } from "@/lib/verifacti/client";
import { parseVerifactuStatusResponse } from "@/lib/verifacti/parse-status-response";

export type SyncVerifactuSource = "user" | "cron";

/**
 * Consulta Verifacti por UUID y persiste estado / error / QR en la factura.
 */
export async function syncVerifactuStatusForInvoice(
  supabase: SupabaseClient,
  invoiceId: string,
  source: SyncVerifactuSource,
): Promise<
  | { ok: true; estado?: string | null; mensajeError?: string | null }
  | { ok: false; error: string }
> {
  const { data: inv, error: invErr } = await supabase
    .from("invoices")
    .select("id, verifacti_uuid, verifacti_registro_estado")
    .eq("id", invoiceId)
    .single();

  if (invErr || !inv) return { ok: false, error: "Factura no encontrada." };
  const uuid = (inv.verifacti_uuid as string | null)?.trim();
  if (!uuid) {
    return { ok: false, error: "La factura no tiene UUID de Verifacti." };
  }

  const res = await verifactuGetStatus(uuid);
  if (!res.ok) {
    return { ok: false, error: `Verifacti respondió ${res.status}: ${res.message}` };
  }

  const parsed = parseVerifactuStatusResponse(res.json);
  const nowIso = new Date().toISOString();

  const nextEstado =
    parsed.estado ?? (inv.verifacti_registro_estado as string | null) ?? null;
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
  if (upErr) return { ok: false, error: upErr.message };

  await supabase.from("invoice_events").insert({
    invoice_id: invoiceId,
    event_type: "verifacti_status",
    payload: {
      uuid,
      estado: nextEstado,
      tiene_error: Boolean(nextError),
      source,
    },
  });

  return { ok: true, estado: nextEstado, mensajeError: nextError };
}
