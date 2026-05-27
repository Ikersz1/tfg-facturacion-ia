import "server-only";

import { getAuthSiteUrl } from "@/lib/auth-site-url";
import type { InvoiceIssuedN8nPayload } from "@/lib/n8n/types";

export type NotifyInvoiceIssuedResult =
  | { ok: true; status: number }
  | { ok: false; error: string; status?: number };

export function buildInvoiceIssuedN8nPayload(input: {
  invoiceId: string;
  series: string;
  year: number;
  number: number;
  issueDate: string;
  dueDate: string | null;
  subtotal: number;
  taxAmount: number;
  total: number;
  totalFormatted: string;
  clientId: string;
  clientName: string;
  clientEmail: string | null;
  clientTaxId: string | null;
  clientAddress: string | null;
  issuerLegalName: string;
  issuerTaxId: string;
  issuerAddress: string;
}): InvoiceIssuedN8nPayload {
  const base = getAuthSiteUrl();
  const numberLabel = `${input.series}-${input.year}/${input.number}`;
  const secretConfigured = Boolean(process.env.N8N_WEBHOOK_SECRET?.trim());

  return {
    event: "invoice.issued",
    emitted_at: new Date().toISOString(),
    invoice: {
      id: input.invoiceId,
      number_label: numberLabel,
      series: input.series,
      year: input.year,
      number: input.number,
      status: "issued",
      issue_date: input.issueDate,
      due_date: input.dueDate,
      subtotal: input.subtotal,
      tax_amount: input.taxAmount,
      total: input.total,
      currency: "EUR",
      total_formatted: input.totalFormatted,
      detail_url: `${base}/invoices/${input.invoiceId}`,
      pdf_url: secretConfigured
        ? `${base}/api/integrations/n8n/invoices/${input.invoiceId}/pdf`
        : null,
    },
    client: {
      id: input.clientId,
      name: input.clientName,
      email: input.clientEmail,
      tax_id: input.clientTaxId,
      address: input.clientAddress,
    },
    issuer: {
      legal_name: input.issuerLegalName,
      tax_id: input.issuerTaxId,
      address: input.issuerAddress,
    },
  };
}

export async function notifyInvoiceIssued(
  payload: InvoiceIssuedN8nPayload,
): Promise<NotifyInvoiceIssuedResult> {
  const url = process.env.N8N_INVOICE_ISSUED_WEBHOOK_URL?.trim();
  if (!url) {
    return { ok: false, error: "not_configured" };
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  const secret = process.env.N8N_WEBHOOK_SECRET?.trim();
  if (secret) {
    headers.Authorization = `Bearer ${secret}`;
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20_000),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return {
        ok: false,
        status: res.status,
        error: body.slice(0, 500) || `HTTP ${res.status}`,
      };
    }

    return { ok: true, status: res.status };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}
