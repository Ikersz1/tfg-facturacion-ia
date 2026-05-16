import "server-only";

import { createClient } from "@/lib/supabase/server";
import { requireAuthUserId } from "@/lib/supabase/require-auth-user";
import { roundCurrencyEUR } from "@/lib/money";
import type { InvoicePdfData, InvoicePdfVatRow } from "@/lib/invoice-pdf/types";

function buildVatRows(
  lines: { tax_rate: number; line_net: number; line_tax: number }[],
): InvoicePdfVatRow[] {
  const buckets = new Map<number, { base: number; tax: number }>();
  for (const l of lines) {
    const rate = roundCurrencyEUR(Number(l.tax_rate));
    const prev = buckets.get(rate) ?? { base: 0, tax: 0 };
    prev.base = roundCurrencyEUR(prev.base + Number(l.line_net));
    prev.tax = roundCurrencyEUR(prev.tax + Number(l.line_tax));
    buckets.set(rate, prev);
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => a - b)
    .map(([tax_rate, { base, tax }]) => ({ tax_rate, base, tax }));
}

export async function loadInvoicePdfData(
  invoiceId: string,
): Promise<{ data: InvoicePdfData } | { error: string; status: number }> {
  const supabase = await createClient();
  const auth = await requireAuthUserId(supabase);
  if ("error" in auth) return { error: auth.error, status: 401 };

  const { data: invoice, error: invErr } = await supabase
    .from("invoices")
    .select(
      "id, series, year, number, status, issue_date, due_date, subtotal, tax_amount, total, verifacti_uuid, verifacti_qr_base64, clients ( name, tax_id, address )",
    )
    .eq("id", invoiceId)
    .maybeSingle();

  if (invErr) return { error: invErr.message, status: 500 };
  if (!invoice) return { error: "Factura no encontrada.", status: 404 };
  if (invoice.status === "draft" || invoice.number == null) {
    return { error: "Solo se puede generar PDF de facturas emitidas.", status: 400 };
  }
  if (!invoice.issue_date) {
    return { error: "La factura no tiene fecha de emisión.", status: 400 };
  }

  const clientRaw = invoice.clients as
    | { name: string; tax_id: string | null; address: string | null }
    | { name: string; tax_id: string | null; address: string | null }[]
    | null;
  const client = Array.isArray(clientRaw) ? clientRaw[0] : clientRaw;
  if (!client?.name) {
    return { error: "Falta el cliente de la factura.", status: 400 };
  }

  const { data: profile } = await supabase
    .from("user_fiscal_profile")
    .select("legal_name, tax_id, address")
    .eq("user_id", auth.userId)
    .maybeSingle();

  const { data: lineRows, error: lineErr } = await supabase
    .from("invoice_lines")
    .select(
      "line_number, description, quantity, unit_price, tax_rate, line_net, line_tax, line_total",
    )
    .eq("invoice_id", invoiceId)
    .order("line_number", { ascending: true });

  if (lineErr) return { error: lineErr.message, status: 500 };
  if (!lineRows?.length) {
    return { error: "La factura no tiene líneas.", status: 400 };
  }

  const lines = lineRows.map((l) => ({
    line_number: l.line_number as number,
    description: l.description as string,
    quantity: Number(l.quantity),
    unit_price: Number(l.unit_price),
    tax_rate: Number(l.tax_rate),
    line_net: Number(l.line_net),
    line_tax: Number(l.line_tax),
    line_total: Number(l.line_total),
  }));

  const numberLabel = `${invoice.series}-${invoice.year}/${invoice.number}`;

  return {
    data: {
      numberLabel,
      series: invoice.series as string,
      year: invoice.year as number,
      number: invoice.number as number,
      issue_date: invoice.issue_date as string,
      due_date: (invoice.due_date as string | null) ?? null,
      issuer: profile
        ? {
            legal_name: profile.legal_name,
            tax_id: profile.tax_id,
            address: profile.address,
          }
        : null,
      client: {
        name: client.name,
        tax_id: client.tax_id ?? null,
        address: client.address ?? null,
      },
      lines,
      vatRows: buildVatRows(lines),
      subtotal: Number(invoice.subtotal),
      tax_amount: Number(invoice.tax_amount),
      total: Number(invoice.total),
      verifacti_uuid: (invoice.verifacti_uuid as string | null) ?? null,
      verifacti_qr_base64: (invoice.verifacti_qr_base64 as string | null) ?? null,
    },
  };
}
