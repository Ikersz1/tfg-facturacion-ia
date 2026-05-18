export type AssistantLink = {
  label: string;
  href: string;
};

export type PendingPaymentCandidate = {
  index: number;
  invoiceId: string;
  numberLabel: string;
  outstandingEur: number;
  dueDate: string | null;
  status: string;
};

export type PendingPaymentSession = {
  clientId: string;
  clientName: string;
  amountEur: number;
  candidates: PendingPaymentCandidate[];
  createdAt: number;
  /** Una sola factura abierta: aceptar «sí» para confirmar */
  singleInvoiceConfirm?: boolean;
};

export type PaymentChoice = {
  index: number;
  invoiceId: string;
  label: string;
};

export type AssistantSessionContext = {
  pendingPayment?: PendingPaymentSession | null;
};

export type AssistantReply = {
  text: string;
  links: AssistantLink[];
  /** Solo para depuración / memoria TFG; no mostrar al usuario por defecto */
  toolUsed?: string;
  pendingPayment?: PendingPaymentSession | null;
  paymentChoices?: PaymentChoice[];
};

export type ToolName =
  | "get_top_debtors"
  | "get_top_clients_by_billing"
  | "get_client_summary"
  | "get_client_last_invoice"
  | "search_invoices"
  | "get_billing_summary"
  | "get_invoices_due_soon"
  | "compare_billing_periods"
  | "draft_payment_reminder"
  | "prepare_register_payment"
  | "list_clients"
  | "open_filtered_view";

export type ToolCall = {
  name: ToolName;
  args: Record<string, unknown>;
};
