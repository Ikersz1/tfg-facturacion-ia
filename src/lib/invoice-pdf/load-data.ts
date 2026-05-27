import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireAuthUserId } from "@/lib/supabase/require-auth-user";
import { roundCurrencyEUR } from "@/lib/money";
import type { InvoicePdfData, InvoicePdfVatRow } from "@/lib/invoice-pdf/types";
import {
  type InvoicePdfTemplateId,
  parseInvoicePdfTemplate,
} from "@/lib/invoice-pdf/template-id";

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

type InvoicePdfRow = {
  id: string;
  series: string;
  year: number;
  number: number | null;
  status: string;
  issue_date: string | null;
  due_date: string | null;
  subtotal: number | string;
  tax_amount: number | string;
  total: number | string;
  verifacti_uuid: string | null;
  verifacti_qr_base64: string | null;
  user_id?: string;
  clients:
    | { name: string; tax_id: string | null; address: string | null }
    | { name: string; tax_id: string | null; address: string | null }[]
    | null;
};

function resolveInvoiceClient(
  clientRaw: InvoicePdfRow["clients"],
): { name: string; tax_id: string | null; address: string | null } | null {
  const client = Array.isArray(clientRaw) ? clientRaw[0] : clientRaw;
  if (!client?.name) return null;
  return client;
}

function buildPdfResult(
  invoice: InvoicePdfRow,
  profile: {
    legal_name: string;
    tax_id: string;
    address: string;
    invoice_pdf_template?: string | null;
  } | null,
  lineRows: {
    line_number: number;
    description: string;
    quantity: number;
    unit_price: number;
    tax_rate: number;
    line_net: number;
    line_tax: number;
    line_total: number;
  }[],
):
  | { data: InvoicePdfData; template: InvoicePdfTemplateId }
  | { error: string; status: number } {
  const client = resolveInvoiceClient(invoice.clients);
  if (!client) {
    return { error: "Falta el cliente de la factura.", status: 400 };
  }

  const numberLabel = `${invoice.series}-${invoice.year}/${invoice.number}`;
  const template = parseInvoicePdfTemplate(profile?.invoice_pdf_template);

  return {
    data: {
      numberLabel,
      series: invoice.series,
      year: invoice.year,
      number: invoice.number as number,
      issue_date: invoice.issue_date as string,
      due_date: invoice.due_date ?? null,
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
      lines: lineRows,
      vatRows: buildVatRows(lineRows),
      subtotal: Number(invoice.subtotal),
      tax_amount: Number(invoice.tax_amount),
      total: Number(invoice.total),
      verifacti_uuid: invoice.verifacti_uuid ?? null,
      verifacti_qr_base64: invoice.verifacti_qr_base64 ?? null,
    },
    template,
  };
}

export async function loadInvoicePdfData(
  invoiceId: string,
): Promise<
  | { data: InvoicePdfData; template: InvoicePdfTemplateId }
  | { error: string; status: number }
> {
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

  const { data: profile } = await supabase
    .from("user_fiscal_profile")
    .select("legal_name, tax_id, address, invoice_pdf_template")
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

  return buildPdfResult(invoice as InvoicePdfRow, profile, lines);
}

/** PDF para integraciones (n8n) con service_role; no usar sin verificar Bearer. */
export async function loadInvoicePdfDataForIntegration(
  invoiceId: string,
): Promise<
  | { data: InvoicePdfData; template: InvoicePdfTemplateId }
  | { error: string; status: number }
> {
  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return { error: "Integración no configurada en el servidor.", status: 503 };
  }

  const { data: invoice, error: invErr } = await admin
    .from("invoices")
    .select(
      "id, user_id, series, year, number, status, issue_date, due_date, subtotal, tax_amount, total, verifacti_uuid, verifacti_qr_base64, clients ( name, tax_id, address )",
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

  const { data: profile } = await admin
    .from("user_fiscal_profile")
    .select("legal_name, tax_id, address, invoice_pdf_template")
    .eq("user_id", invoice.user_id as string)
    .maybeSingle();

  const { data: lineRows, error: lineErr } = await admin
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

  return buildPdfResult(invoice as InvoicePdfRow, profile, lines);
}
