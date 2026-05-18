"use server";

import { registerInvoicePayment } from "@/lib/payments/register-invoice-payment";
import { createClient } from "@/lib/supabase/server";
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

  const paidAtRaw = formData.get("paid_at")?.toString().trim();
  const supabase = await createClient();
  const result = await registerInvoicePayment(supabase, {
    invoiceId,
    amountEur: amount,
    paidAt: paidAtRaw || undefined,
    method: emptyToNull(formData.get("method")),
    notes: emptyToNull(formData.get("notes")),
  });

  if (!result.ok) return { error: result.error };

  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/invoices");
  revalidatePath("/informes");
  return { ok: true };
}

function emptyToNull(v: FormDataEntryValue | null) {
  const s = v?.toString().trim();
  return s ? s : null;
}
