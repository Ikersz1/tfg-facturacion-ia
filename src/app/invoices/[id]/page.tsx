import { notFound } from "next/navigation";
import { InvoiceDetailForm } from "@/components/invoice-detail-form";
import { PageHeader } from "@/components/page-header";
import { effectiveInvoiceStatus } from "@/lib/invoice-status";
import { roundCurrencyEUR } from "@/lib/money";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function statusLabel(s: string) {
  const map: Record<string, string> = {
    draft: "Borrador",
    issued: "Emitida",
    partial: "Parcialmente pagada",
    paid: "Pagada",
    cancelled: "Anulada",
    overdue: "Vencida",
  };
  return map[s] ?? s;
}

type PageProps = { params: Promise<{ id: string }> };

export default async function InvoiceDetailPage(props: PageProps) {
  const { id } = await props.params;
  const supabase = createAdminClient();

  const { data: invoice, error: invErr } = await supabase
    .from("invoices")
    .select(
      "id, series, year, number, status, issue_date, due_date, subtotal, tax_amount, total, clients ( name, tax_id )",
    )
    .eq("id", id)
    .maybeSingle();

  if (invErr || !invoice) {
    notFound();
  }

  const clientRaw = invoice.clients as
    | { name: string; tax_id: string | null }
    | { name: string; tax_id: string | null }[]
    | null;
  const clientsNormalized = Array.isArray(clientRaw) ? clientRaw[0] ?? null : clientRaw;

  const numLabel =
    invoice.number != null
      ? `${invoice.series}-${invoice.year}/${invoice.number}`
      : `${invoice.series}-${invoice.year}/borrador`;

  const { data: lines } = await supabase
    .from("invoice_lines")
    .select(
      "id, line_number, description, quantity, unit_price, tax_rate, line_net, line_tax, line_total",
    )
    .eq("invoice_id", id)
    .order("line_number", { ascending: true });

  const { data: products } = await supabase
    .from("products")
    .select("id, name, unit_price, tax_rate")
    .eq("is_active", true)
    .order("name");

  const { data: payments } = await supabase
    .from("payments")
    .select("id, amount, paid_at, method, notes")
    .eq("invoice_id", id)
    .order("paid_at", { ascending: false });

  const paidSum = roundCurrencyEUR(
    (payments ?? []).reduce((s, p) => s + Number(p.amount), 0),
  );
  const displayStatus = effectiveInvoiceStatus({
    status: invoice.status as string,
    total: Number(invoice.total),
    paidSum,
    issue_date: invoice.issue_date as string | null,
    due_date: invoice.due_date as string | null,
  });

  return (
    <div className="flex w-full flex-1 flex-col">
      <PageHeader
        back={{ href: "/invoices", label: "← Facturas" }}
        eyebrow={numLabel}
        eyebrowTone="muted"
        title="Factura"
        description={
          <>
            {clientsNormalized?.name ?? "Cliente"}
            {clientsNormalized?.tax_id ? ` · ${clientsNormalized.tax_id}` : null}
          </>
        }
      />
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Estado:{" "}
        <span className="inline-flex rounded-full bg-zinc-200 px-2.5 py-0.5 text-xs font-medium text-zinc-800 dark:bg-zinc-700 dark:text-zinc-100">
          {statusLabel(displayStatus)}
        </span>
      </p>
      <InvoiceDetailForm
        invoice={{
          id: invoice.id,
          series: invoice.series,
          year: invoice.year,
          number: invoice.number,
          status: invoice.status,
          issue_date: invoice.issue_date,
          due_date: invoice.due_date,
          subtotal: Number(invoice.subtotal),
          tax_amount: Number(invoice.tax_amount),
          total: Number(invoice.total),
          clients: clientsNormalized,
        }}
        lines={
          (lines ?? []).map((l) => ({
            id: l.id,
            line_number: l.line_number,
            description: l.description,
            quantity: Number(l.quantity),
            unit_price: Number(l.unit_price),
            tax_rate: Number(l.tax_rate),
            line_net: Number(l.line_net),
            line_tax: Number(l.line_tax),
            line_total: Number(l.line_total),
          }))
        }
        products={
          (products ?? []).map((p) => ({
            id: p.id,
            name: p.name,
            unit_price: Number(p.unit_price),
            tax_rate: Number(p.tax_rate),
          }))
        }
        payments={
          (payments ?? []).map((p) => ({
            id: p.id,
            amount: Number(p.amount),
            paid_at: p.paid_at,
            method: p.method,
            notes: p.notes,
          }))
        }
      />
      </div>
    </div>
  );
}
