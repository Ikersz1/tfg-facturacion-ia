export type InvoicePdfLine = {
  line_number: number;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  line_net: number;
  line_tax: number;
  line_total: number;
};

export type InvoicePdfVatRow = {
  tax_rate: number;
  base: number;
  tax: number;
};

export type InvoicePdfData = {
  numberLabel: string;
  series: string;
  year: number;
  number: number;
  issue_date: string;
  due_date: string | null;
  issuer: {
    legal_name: string;
    tax_id: string;
    address: string;
  } | null;
  client: {
    name: string;
    tax_id: string | null;
    address: string | null;
  };
  lines: InvoicePdfLine[];
  vatRows: InvoicePdfVatRow[];
  subtotal: number;
  tax_amount: number;
  total: number;
  verifacti_uuid: string | null;
  verifacti_qr_base64: string | null;
};
