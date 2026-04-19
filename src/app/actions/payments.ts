"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { roundCurrencyEUR } from "@/lib/money";
import { revalidatePath } from "next/cache";

export type PaymentActionState = { ok?: true; error?: string };

export async function addPaymentAction(
  _prev: PaymentActionState,
  formData: FormData,
): Promise<PaymentActionState> {
  const invoiceId = formData.get("invoice_id")?.toString();
  if (!invoiceId) return { error: "Falta factura." };

  const amount = Number(formData.get("amount")?.toString().replace(",", "."));
  if (Number.isNaN(amount) || amount <= 0) {
    return { error: "Importe no válido." };
  }

  const supabase = createAdminClient();
  const { data: inv, error: invErr } = await supabase
    .from("invoices")
    .select("id, status, total")
    .eq("id", invoiceId)
    .single();

  if (invErr || !inv) return { error: "Factura no encontrada." };
  if (inv.status === "draft" || inv.status === "cancelled") {
    return { error: "No se pueden registrar pagos en esta factura." };
  }
  if (inv.status === "paid") {
    return { error: "La factura ya está marcada como pagada." };
  }

  const paidAtRaw = formData.get("paid_at")?.toString().trim();
  let paid_at: string;
  if (paidAtRaw) {
    const d = new Date(paidAtRaw);
    if (Number.isNaN(d.getTime())) {
      return { error: "Fecha de cobro no válida." };
    }
    paid_at = d.toISOString();
  } else {
    paid_at = new Date().toISOString();
  }

  const { error: insErr } = await supabase.from("payments").insert({
    invoice_id: invoiceId,
    amount,
    method: emptyToNull(formData.get("method")),
    notes: emptyToNull(formData.get("notes")),
    paid_at,
  });

  if (insErr) return { error: insErr.message };

  const { data: payRows } = await supabase
    .from("payments")
    .select("amount")
    .eq("invoice_id", invoiceId);

  const sumPaid = roundCurrencyEUR(
    (payRows ?? []).reduce((s, p) => s + Number(p.amount), 0),
  );
  const total = roundCurrencyEUR(Number(inv.total));

  if (sumPaid >= total) {
    await supabase.from("invoices").update({ status: "paid" }).eq("id", invoiceId);
  } else if (sumPaid > 0) {
    await supabase.from("invoices").update({ status: "partial" }).eq("id", invoiceId);
  }

  await supabase.from("invoice_events").insert({
    invoice_id: invoiceId,
    event_type: "payment_registered",
    payload: {
      amount,
      sum_paid: sumPaid,
      invoice_total: total,
      fully_paid: sumPaid >= total,
    },
  });

  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/invoices");
  return { ok: true };
}

function emptyToNull(v: FormDataEntryValue | null) {
  const s = v?.toString().trim();
  return s ? s : null;
}
