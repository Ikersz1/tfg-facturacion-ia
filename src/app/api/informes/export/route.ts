import { getInvoiceExportRows } from "@/lib/reports-data";

export const dynamic = "force-dynamic";

function csvEscape(s: string): string {
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sp: Record<string, string | string[] | undefined> = {};
  url.searchParams.forEach((v, k) => {
    sp[k] = v;
  });

  const rows = await getInvoiceExportRows(sp);
  const header = [
    "numero",
    "cliente",
    "fecha_emision",
    "total_eur",
    "cobrado_eur",
    "pendiente_eur",
    "estado",
  ];
  const lines = [
    header.join(","),
    ...rows.map((r) =>
      [
        csvEscape(r.numberLabel),
        csvEscape(r.clientName),
        r.issueDate,
        String(r.total).replace(".", ","),
        String(r.collected).replace(".", ","),
        String(r.pending).replace(".", ","),
        csvEscape(r.statusLabel),
      ].join(","),
    ),
  ];
  const body = "\uFEFF" + lines.join("\r\n");
  const filename = `informes_facturas_${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
