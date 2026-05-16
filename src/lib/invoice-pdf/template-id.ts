export const INVOICE_PDF_TEMPLATE_IDS = ["classic", "compact"] as const;

export type InvoicePdfTemplateId = (typeof INVOICE_PDF_TEMPLATE_IDS)[number];

export const DEFAULT_INVOICE_PDF_TEMPLATE: InvoicePdfTemplateId = "classic";

export function parseInvoicePdfTemplate(
  raw: string | null | undefined,
): InvoicePdfTemplateId {
  if (raw === "compact") return "compact";
  return "classic";
}

export const INVOICE_PDF_TEMPLATE_LABELS: Record<
  InvoicePdfTemplateId,
  { title: string; description: string }
> = {
  classic: {
    title: "Clásica",
    description: "Cabecera en tres columnas y tabla estándar (por defecto).",
  },
  compact: {
    title: "Compacta",
    description: "Menos márgenes, cabecera en bloque y misma información fiscal.",
  },
};
