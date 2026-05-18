import "server-only";

import { loadAssistantContext } from "@/lib/assistant/context";
import { matchAssistantIntent } from "@/lib/assistant/match-intent";
import { pickToolWithOpenAI, polishAnswerWithOpenAI } from "@/lib/assistant/openai";
import {
  executeAssistantTool,
  formatToolResultAsText,
} from "@/lib/assistant/tools";
import type { AssistantReply } from "@/lib/assistant/types";

const HELP_TEXT = `Puedo ayudarte con preguntas como:
· ¿Qué cliente me debe más?
· ¿Cuántas facturas tiene [nombre cliente]?
· ¿Cuál es la última factura de [cliente]?
· Resume mi facturación del trimestre
· Lista mis clientes que contengan "…"`;

export async function askAssistant(question: string): Promise<AssistantReply> {
  const q = question.trim();
  if (!q) {
    return { text: "Escribe una pregunta sobre tus facturas o clientes.", links: [] };
  }

  if (q.length > 500) {
    return { text: "La pregunta es demasiado larga (máx. 500 caracteres).", links: [] };
  }

  const loaded = await loadAssistantContext();
  if (!loaded.ok) {
    return { text: loaded.error, links: [] };
  }
  const { ctx } = loaded;

  let toolCall = matchAssistantIntent(q);
  let usedLlmRouter = false;

  if (!toolCall) {
    const picked = await pickToolWithOpenAI(q);
    if (picked.ok) {
      toolCall = picked.tool;
      usedLlmRouter = true;
    } else if (picked.directAnswer) {
      return { text: picked.directAnswer, links: [] };
    }
  }

  if (!toolCall) {
    return { text: HELP_TEXT, links: [{ label: "Ver facturas", href: "/invoices" }] };
  }

  const result = executeAssistantTool(toolCall.name, toolCall.args, ctx);

  let text =
    (await polishAnswerWithOpenAI(q, toolCall.name, result.payload)) ??
    formatToolResultAsText(toolCall.name, result);

  const uniqueLinks = dedupeLinks(result.links);

  return {
    text,
    links: uniqueLinks.slice(0, 6),
    toolUsed: usedLlmRouter ? toolCall.name : undefined,
  };
}

function dedupeLinks(links: { label: string; href: string }[]) {
  const seen = new Set<string>();
  return links.filter((l) => {
    if (seen.has(l.href)) return false;
    seen.add(l.href);
    return true;
  });
}
