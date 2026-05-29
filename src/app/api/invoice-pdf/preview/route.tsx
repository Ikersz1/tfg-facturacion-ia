import { renderToBuffer } from "@react-pdf/renderer";
import { InvoicePdfRoot } from "@/lib/invoice-pdf/invoice-document";
import { buildInvoicePdfPreviewData } from "@/lib/invoice-pdf/preview-data";
import { parseInvoicePdfTemplate } from "@/lib/invoice-pdf/template-id";
import { createClient } from "@/lib/supabase/server";
import { requireAuthUserId } from "@/lib/supabase/require-auth-user";

export const dynamic = "force-dynamic";

/** PDF de ejemplo para previsualizar plantilla (inline, apto para iframe). */
export async function GET(request: Request) {
  const supabase = await createClient();
  const auth = await requireAuthUserId(supabase);
  if ("error" in auth) {
    return new Response("Unauthorized", { status: 401 });
  }

  const template = parseInvoicePdfTemplate(
    new URL(request.url).searchParams.get("template"),
  );

  const { data: profile } = await supabase
    .from("user_fiscal_profile")
    .select("legal_name, tax_id, address")
    .eq("user_id", auth.userId)
    .maybeSingle();

  const data = buildInvoicePdfPreviewData(profile);

  const buffer = await renderToBuffer(
    <InvoicePdfRoot data={data} template={template} />,
  );

  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="vista_previa_plantilla.pdf"',
      "Cache-Control": "private, no-store",
    },
  });
}
