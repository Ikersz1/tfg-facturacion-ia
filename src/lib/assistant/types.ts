export type AssistantLink = {
  label: string;
  href: string;
};

export type AssistantReply = {
  text: string;
  links: AssistantLink[];
  /** Solo para depuración / memoria TFG; no mostrar al usuario por defecto */
  toolUsed?: string;
};

export type ToolName =
  | "get_top_debtors"
  | "get_client_summary"
  | "get_client_last_invoice"
  | "search_invoices"
  | "get_billing_summary"
  | "list_clients"
  | "open_filtered_view";

export type ToolCall = {
  name: ToolName;
  args: Record<string, unknown>;
};
