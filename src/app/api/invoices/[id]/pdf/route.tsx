import { renderToBuffer } from "@react-pdf/renderer";
import { InvoicePdfRoot } from "@/lib/invoice-pdf/invoice-document";
import { loadInvoicePdfData } from "@/lib/invoice-pdf/load-data";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const loaded = await loadInvoicePdfData(id);
  if ("error" in loaded) {
    return new Response(loaded.error, { status: loaded.status });
  }

  const buffer = await renderToBuffer(
    <InvoicePdfRoot data={loaded.data} template={loaded.template} />,
  );

  const safeName = loaded.data.numberLabel.replace(/[^\w.-]+/g, "_");
  const filename = `factura_${safeName}.pdf`;

  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
