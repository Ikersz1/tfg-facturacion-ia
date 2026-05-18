import type { ToolCall, ToolName } from "@/lib/assistant/types";

function extractQuotedName(q: string): string | undefined {
  const m = q.match(/["«]([^"»]+)["»]/);
  if (m?.[1]) return m[1].trim();
  return undefined;
}

/** Tras palabras clave: "cliente Acme", "de Acme SL", etc. */
function extractClientAfterKeywords(q: string): string | undefined {
  const patterns = [
    /(?:cliente|de|para)\s+([a-záéíóúñü0-9][a-záéíóúñü0-9\s.&-]{1,60})/i,
    /(?:tiene|tiene el|tiene la)\s+([a-záéíóúñü0-9][a-záéíóúñü0-9\s.&-]{1,60})/i,
  ];
  for (const re of patterns) {
    const m = q.match(re);
    if (m?.[1]) {
      let name = m[1].trim();
      name = name.replace(/\s+(cuántas?|cuantos?|cuál|cuantas? facturas?|me debe|tiene).*$/i, "");
      if (name.length >= 2) return name;
    }
  }
  return undefined;
}

function extractClientName(q: string): string | undefined {
  return extractQuotedName(q) ?? extractClientAfterKeywords(q);
}

/**
 * Elige herramienta sin LLM (cuando no hay API key o falla OpenAI).
 */
export function matchAssistantIntent(question: string): ToolCall | null {
  const q = question.trim().toLowerCase();
  if (!q) return null;

  const clientName = extractClientName(question);

  if (/últim[ao] factura|ultima factura|factura más reciente|factura mas reciente/i.test(q)) {
    if (clientName) return { name: "get_client_last_invoice", args: { clientName } };
  }

  if (
    /cuántas facturas|cuantas facturas|número de facturas|numero de facturas|cuántas tiene|cuantas tiene/i.test(
      q,
    )
  ) {
    if (clientName) return { name: "get_client_summary", args: { clientName } };
  }

  if (
    /quién me debe|quien me debe|más deuda|mas deuda|debe más|deben más|moros|no paga|top deudor/i.test(
      q,
    )
  ) {
    return { name: "get_top_debtors", args: { limit: 5 } };
  }

  if (/cuánto debe|cuanto debe|pendiente de|debe dinero|deuda de/i.test(q) && clientName) {
    return { name: "get_client_summary", args: { clientName } };
  }

  if (/resumen|resume|cuéntame|cuentame|ingresos del|facturación/i.test(q)) {
    const period = /trimestre|3 meses|tres meses/i.test(q)
      ? "this_quarter"
      : /este mes|mes actual/i.test(q)
        ? "this_month"
        : "last12";
    return { name: "get_billing_summary", args: { period } };
  }

  if (/listar clientes|mis clientes|busca cliente|cliente llamado|cliente que se llama/i.test(q)) {
    const search = clientName ?? extractClientAfterKeywords(q);
    return { name: "list_clients", args: search ? { search } : {} };
  }

  if (/facturas pendientes|facturas vencidas|borradores/i.test(q)) {
    const status = /vencid/i.test(q)
      ? "overdue"
      : /borrador/i.test(q)
        ? "draft"
        : /pendiente|por cobrar/i.test(q)
          ? "issued"
          : undefined;
    return {
      name: "search_invoices",
      args: { ...(clientName ? { clientName } : {}), ...(status ? { status } : {}), limit: 8 },
    };
  }

  if (clientName) {
    return { name: "get_client_summary", args: { clientName } };
  }

  if (/deuda|pendiente|cobrar/i.test(q)) {
    return { name: "get_top_debtors", args: { limit: 5 } };
  }

  return null;
}

export function isToolName(name: string): name is ToolName {
  return [
    "get_top_debtors",
    "get_client_summary",
    "get_client_last_invoice",
    "search_invoices",
    "get_billing_summary",
    "list_clients",
  ].includes(name);
}
