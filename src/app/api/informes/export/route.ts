import {
  getInvoiceExportLineRows,
  getInvoiceExportSummaryRows,
} from "@/lib/reports-data";

export const dynamic = "force-dynamic";

function csvEscape(s: string): string {
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsvValue(v: string | number): string {
  if (typeof v === "number") return String(v);
  return csvEscape(v);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sp: Record<string, string | string[] | undefined> = {};
  url.searchParams.forEach((v, k) => {
    sp[k] = v;
  });
  const type = url.searchParams.get("type") === "lines" ? "lines" : "summary";

  const lines: string[] = [];
  if (type === "lines") {
    const rows = await getInvoiceExportLineRows(sp);
    const header = [
      "invoice_id",
      "invoice_number",
      "line_index",
      "item_name",
      "description",
      "quantity",
      "unit_price",
      "tax_rate",
      "line_subtotal",
      "line_tax",
      "line_total",
    ];
    lines.push(header.join(","));
    for (const r of rows) {
      lines.push(
        [
          toCsvValue(r.invoiceId),
          toCsvValue(r.invoiceNumber),
          toCsvValue(r.lineIndex),
          toCsvValue(r.itemName),
          toCsvValue(r.description),
          toCsvValue(r.quantity),
          toCsvValue(r.unitPrice),
          toCsvValue(r.taxRate),
          toCsvValue(r.lineSubtotal),
          toCsvValue(r.lineTax),
          toCsvValue(r.lineTotal),
        ].join(","),
      );
    }
  } else {
    const rows = await getInvoiceExportSummaryRows(sp);
    const header = [
      "invoice_id",
      "invoice_number",
      "series",
      "year",
      "status",
      "issue_date",
      "due_date",
      "customer_id",
      "customer_name",
      "customer_tax_id",
      "currency",
      "subtotal_amount",
      "tax_amount",
      "total_amount",
      "paid_amount",
      "due_amount",
      "created_at",
    ];
    lines.push(header.join(","));
    for (const r of rows) {
      lines.push(
        [
          toCsvValue(r.invoiceId),
          toCsvValue(r.invoiceNumber),
          toCsvValue(r.series),
          toCsvValue(r.year),
          toCsvValue(r.status),
          toCsvValue(r.issueDate),
          toCsvValue(r.dueDate),
          toCsvValue(r.customerId),
          toCsvValue(r.customerName),
          toCsvValue(r.customerTaxId),
          toCsvValue(r.currency),
          toCsvValue(r.subtotalAmount),
          toCsvValue(r.taxAmount),
          toCsvValue(r.totalAmount),
          toCsvValue(r.paidAmount),
          toCsvValue(r.dueAmount),
          toCsvValue(r.createdAt),
        ].join(","),
      );
    }
  }
  const body = "\uFEFF" + lines.join("\r\n");
  const filenameBase = type === "lines" ? "invoices_lines" : "invoices_summary";
  const filename = `${filenameBase}_${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
