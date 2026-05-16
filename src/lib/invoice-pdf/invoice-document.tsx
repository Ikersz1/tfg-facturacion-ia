import type { InvoicePdfData } from "@/lib/invoice-pdf/types";
import type { InvoicePdfTemplateId } from "@/lib/invoice-pdf/template-id";
import { InvoicePdfClassicDocument } from "@/lib/invoice-pdf/invoice-document-classic";
import { InvoicePdfCompactDocument } from "@/lib/invoice-pdf/invoice-document-compact";

export function InvoicePdfRoot({
  data,
  template,
}: {
  data: InvoicePdfData;
  template: InvoicePdfTemplateId;
}) {
  if (template === "compact") {
    return <InvoicePdfCompactDocument data={data} />;
  }
  return <InvoicePdfClassicDocument data={data} />;
}

export { InvoicePdfClassicDocument } from "@/lib/invoice-pdf/invoice-document-classic";
export { InvoicePdfCompactDocument } from "@/lib/invoice-pdf/invoice-document-compact";
