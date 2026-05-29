import type { InvoicePdfData } from "@/lib/invoice-pdf/types";

/** Datos de ejemplo para previsualizar plantillas PDF en ajustes. */
export function buildInvoicePdfPreviewData(issuer: {
  legal_name: string | null;
  tax_id: string | null;
  address: string | null;
} | null): InvoicePdfData {
  const legalName = issuer?.legal_name?.trim() || "Tu empresa S.L.";
  const taxId = issuer?.tax_id?.trim() || "B12345678";
  const address =
    issuer?.address?.trim() || "Calle Ejemplo 1, 28001 Madrid";

  return {
    numberLabel: "A-2026/1",
    series: "A",
    year: 2026,
    number: 1,
    issue_date: new Date().toISOString().slice(0, 10),
    due_date: null,
    issuer: { legal_name: legalName, tax_id: taxId, address },
    client: {
      name: "Cliente de ejemplo S.L.",
      tax_id: "B87654321",
      address: "Av. Cliente 10, 08001 Barcelona",
    },
    lines: [
      {
        line_number: 1,
        description: "Servicio de consultoría (muestra)",
        quantity: 1,
        unit_price: 100,
        tax_rate: 21,
        line_net: 100,
        line_tax: 21,
        line_total: 121,
      },
    ],
    vatRows: [{ tax_rate: 21, base: 100, tax: 21 }],
    subtotal: 100,
    tax_amount: 21,
    total: 121,
    verifacti_uuid: null,
    verifacti_qr_base64: null,
  };
}
