export type InvoiceIssuedN8nPayload = {
  event: "invoice.issued";
  emitted_at: string;
  invoice: {
    id: string;
    number_label: string;
    series: string;
    year: number;
    number: number;
    status: "issued";
    issue_date: string;
    due_date: string | null;
    subtotal: number;
    tax_amount: number;
    total: number;
    currency: "EUR";
    total_formatted: string;
    detail_url: string;
    pdf_url: string | null;
  };
  client: {
    id: string;
    name: string;
    email: string | null;
    tax_id: string | null;
    address: string | null;
  };
  issuer: {
    legal_name: string;
    tax_id: string;
    address: string;
  };
};
