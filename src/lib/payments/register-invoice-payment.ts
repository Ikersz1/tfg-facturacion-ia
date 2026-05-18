import "server-only";

import { roundCurrencyEUR } from "@/lib/money";
import type { SupabaseClient } from "@supabase/supabase-js";

export type RegisterPaymentResult =
  | {
      ok: true;
      invoiceId: string;
      amountEur: number;
      sumPaidEur: number;
      invoiceTotalEur: number;
      fullyPaid: boolean;
    }
  | { ok: false; error: string };

function emptyToNull(v: string | undefined | null): string | null {
  const s = v?.trim();
  return s ? s : null;
}

/** Registra un cobro en factura emitida (misma lógica que el formulario de detalle). */
export async function registerInvoicePayment(
  supabase: SupabaseClient,
  input: {
    invoiceId: string;
    amountEur: number;
    paidAt?: string;
    method?: string | null;
    notes?: string | null;
  },
): Promise<RegisterPaymentResult> {
  const amount = roundCurrencyEUR(input.amountEur);
  if (Number.isNaN(amount) || amount <= 0) {
    return { ok: false, error: "Importe no válido." };
  }

  const { data: inv, error: invErr } = await supabase
    .from("invoices")
    .select("id, status, total")
    .eq("id", input.invoiceId)
    .single();

  if (invErr || !inv) return { ok: false, error: "Factura no encontrada." };
  if (inv.status === "draft" || inv.status === "cancelled") {
    return { ok: false, error: "No se pueden registrar pagos en esta factura." };
  }
  if (inv.status === "paid") {
    return { ok: false, error: "La factura ya está marcada como pagada." };
  }

  let paid_at: string;
  if (input.paidAt?.trim()) {
    const d = new Date(input.paidAt.trim());
    if (Number.isNaN(d.getTime())) {
      return { ok: false, error: "Fecha de cobro no válida." };
    }
    paid_at = d.toISOString();
  } else {
    paid_at = new Date().toISOString();
  }

  const { error: insErr } = await supabase.from("payments").insert({
    invoice_id: input.invoiceId,
    amount,
    method: emptyToNull(input.method ?? null),
    notes: emptyToNull(input.notes ?? null),
    paid_at,
  });

  if (insErr) return { ok: false, error: insErr.message };

  const { data: payRows } = await supabase
    .from("payments")
    .select("amount")
    .eq("invoice_id", input.invoiceId);

  const sumPaid = roundCurrencyEUR(
    (payRows ?? []).reduce((s, p) => s + Number(p.amount), 0),
  );
  const total = roundCurrencyEUR(Number(inv.total));

  if (sumPaid >= total) {
    await supabase.from("invoices").update({ status: "paid" }).eq("id", input.invoiceId);
  } else if (sumPaid > 0) {
    await supabase.from("invoices").update({ status: "partial" }).eq("id", input.invoiceId);
  }

  await supabase.from("invoice_events").insert({
    invoice_id: input.invoiceId,
    event_type: "payment_registered",
    payload: {
      amount,
      sum_paid: sumPaid,
      invoice_total: total,
      fully_paid: sumPaid >= total,
      source: "assistant",
    },
  });

  return {
    ok: true,
    invoiceId: input.invoiceId,
    amountEur: amount,
    sumPaidEur: sumPaid,
    invoiceTotalEur: total,
    fullyPaid: sumPaid >= total,
  };
}
