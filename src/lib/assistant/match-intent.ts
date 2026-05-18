import type { ToolCall, ToolName } from "@/lib/assistant/types";

export const ASSISTANT_HELP_TEXT = `Puedo ayudarte a consultar tu facturación (no creo ni emito facturas):

· Cuántos clientes tienes y listar clientes
· Cliente que más te debe o más moroso / mejor cliente (más facturación)
· Resumen de un cliente, última factura o borrador de recordatorio de cobro
· Facturas vencidas, pendientes o que vencen esta semana
· Comparar facturación de este mes con el mes pasado
· Resumen del mes o trimestre
· Abrir listados filtrados de facturas o clientes

Pregunta en una frase corta.`;

/** Saludos, ayuda y límites del asistente (sin herramientas ni LLM). */
export function matchAssistantMeta(question: string): string | null {
  const q = question.trim().toLowerCase();
  if (!q) return null;

  if (/^(hola|buenas|hey|hello|buenos días|buenas tardes)\b/i.test(q)) {
    return "¡Hola! Pregúntame por tus clientes, deudas o facturación. Si quieres ver ejemplos, escribe: «¿en qué me puedes ayudar?».";
  }

  if (
    /en qu[eé] (me )?puedes|qu[eé] puedes hacer|qu[eé] sabes hacer|para qu[eé] sirves|ayuda|capacidades|en qu[eé] cosas/i.test(
      q,
    )
  ) {
    return ASSISTANT_HELP_TEXT;
  }

  if (
    /puedes emitir|puedo emitir|emitir facturas?|crear facturas?|hacer facturas?|generar facturas?/i.test(q) &&
    !/cuántas?|cuantas?|últim|ultim|buscar|listar/i.test(q)
  ) {
    return "No puedo emitir ni crear facturas desde el chat. Hazlo en Facturas → Nueva factura. Yo consulto datos, resúmenes y te abro listados filtrados.";
  }

  return null;
}

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
    /cuántos clientes|cuantos clientes|número de clientes|numero de clientes|total de clientes|cuántos tengo.*cliente|cuantos tengo.*cliente/i.test(
      q,
    ) &&
    !clientName
  ) {
    return { name: "list_clients", args: { countOnly: true } };
  }

  if (
    /mejor cliente|top cliente|cliente estrella|más factur|mas factur|más ingres|mas ingres|quién más factura|quien mas factura|cliente principal/i.test(
      q,
    ) &&
    !/debe|deuda|moros|pendiente de cobro|no paga/i.test(q)
  ) {
    return { name: "get_top_clients_by_billing", args: { limit: 5 } };
  }

  if (
    /quién me debe|quien me debe|más deuda|mas deuda|debe más|deben más|moros|no paga|top deudor|más moros|mas moros/i.test(
      q,
    )
  ) {
    return { name: "get_top_debtors", args: { limit: 5 } };
  }

  if (/cuánto debe|cuanto debe|pendiente de|debe dinero|deuda de/i.test(q) && clientName) {
    return { name: "get_client_summary", args: { clientName } };
  }

  if (
    /recordatorio|reclamar|reclama|mensaje de cobro|email de cobro|texto de cobro|whatsapp de cobro/i.test(
      q,
    ) &&
    clientName
  ) {
    return { name: "draft_payment_reminder", args: { clientName } };
  }

  if (
    /vencen esta semana|vencen pronto|próximas a vencer|proximas a vencer|qué vence|que vence|vencimiento próximo|vencimiento proximo/i.test(
      q,
    )
  ) {
    const days = /semana/i.test(q) ? 7 : 14;
    return { name: "get_invoices_due_soon", args: { days, limit: 10 } };
  }

  if (
    /comparar|frente al mes|respecto al mes|mes anterior|mes pasado|subió|subio|bajó|bajo/i.test(q) &&
    /factur|ingres|cobr/i.test(q)
  ) {
    return { name: "compare_billing_periods", args: { mode: "month_over_month" } };
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

  if (/abrir|ll[eé]vame|ir a|mostrar|ver listado/i.test(q) && /clientes/i.test(q)) {
    const search = clientName ?? extractClientAfterKeywords(q);
    return {
      name: "open_filtered_view",
      args: { view: "clients", ...(search ? { search } : {}) },
    };
  }

  if (/abrir|ll[eé]vame|ir a|mostrar/i.test(q) && /facturas/i.test(q)) {
    const status = /vencid/i.test(q)
      ? "overdue"
      : /pendient|por cobrar/i.test(q)
        ? "pending"
        : /parcial/i.test(q)
          ? "partial"
          : /borrador/i.test(q)
            ? "draft"
            : /pagad/i.test(q)
              ? "paid"
              : undefined;
    return {
      name: "open_filtered_view",
      args: { view: "invoices", ...(status ? { status } : {}) },
    };
  }

  if (clientName && /recordatorio|reclamar|cobro/i.test(q)) {
    return { name: "draft_payment_reminder", args: { clientName } };
  }

  if (clientName) {
    return { name: "get_client_summary", args: { clientName } };
  }

  if (/deuda|pendiente|cobrar|moros/i.test(q) && !/mejor cliente|top cliente/i.test(q)) {
    return { name: "get_top_debtors", args: { limit: 5 } };
  }

  return null;
}

export function isToolName(name: string): name is ToolName {
  return [
    "get_top_debtors",
    "get_top_clients_by_billing",
    "get_client_summary",
    "get_client_last_invoice",
    "search_invoices",
    "get_billing_summary",
    "get_invoices_due_soon",
    "compare_billing_periods",
    "draft_payment_reminder",
    "list_clients",
    "open_filtered_view",
  ].includes(name);
}
