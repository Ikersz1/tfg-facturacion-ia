/** Series de facturación predefinidas (sin CRUD: se amplía editando esta lista). */

export type InvoiceSeriesId = "A" | "R";

export type InvoiceSeriesOption = {
  id: InvoiceSeriesId;
  label: string;
  description: string;
};

export const INVOICE_SERIES: InvoiceSeriesOption[] = [
  {
    id: "A",
    label: "A — Ordinarias",
    description: "Facturas de venta habituales (por defecto).",
  },
  {
    id: "R",
    label: "R — Rectificativas",
    description: "Correcciones de facturas ya emitidas (numeración aparte).",
  },
];

export const DEFAULT_INVOICE_SERIES: InvoiceSeriesId = "A";

const SERIES_IDS = new Set(INVOICE_SERIES.map((s) => s.id));

export function isInvoiceSeriesId(value: string): value is InvoiceSeriesId {
  return SERIES_IDS.has(value as InvoiceSeriesId);
}

export function parseInvoiceSeries(
  raw: FormDataEntryValue | null | undefined,
): InvoiceSeriesId | null {
  const s = raw?.toString().trim().toUpperCase();
  if (!s || !isInvoiceSeriesId(s)) return null;
  return s;
}

export function invoiceSeriesLabel(id: string): string {
  return INVOICE_SERIES.find((s) => s.id === id)?.label ?? id;
}
