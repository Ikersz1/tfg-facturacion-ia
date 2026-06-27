import "server-only";

import { loadAssistantContext } from "@/lib/assistant/context";
import {
  ASSISTANT_HELP_TEXT,
  matchAssistantIntent,
  matchAssistantMeta,
} from "@/lib/assistant/match-intent";
import { pickToolWithOpenAI, polishAnswerWithOpenAI } from "@/lib/assistant/openai";
import {
  handlePaymentFollowUp,
  prepareRegisterPayment,
} from "@/lib/assistant/payment-flow";
import { parseRegisterPaymentIntent } from "@/lib/assistant/parse-payment-intent";
import {
  executeAssistantTool,
  formatToolResultAsText,
} from "@/lib/assistant/tools";
import type { AssistantReply, AssistantSessionContext } from "@/lib/assistant/types";

const PAYMENT_TOOLS = new Set(["prepare_register_payment"]);

export async function askAssistant(
  question: string,
  session?: AssistantSessionContext,
): Promise<AssistantReply> {
  const q = question.trim();
  if (!q) {
    return { text: "Escribe una pregunta sobre tus facturas o clientes.", links: [] };
  }

  if (q.length > 500) {
    return { text: "La pregunta es demasiado larga (máx. 500 caracteres).", links: [] };
  }

  const meta = matchAssistantMeta(q);
  if (meta) {
    return {
      text: meta,
      links: [
        { label: "Ver clientes", href: "/clients" },
        { label: "Ver facturas", href: "/invoices" },
      ],
    };
  }

  const loaded = await loadAssistantContext();
  if (!loaded.ok) {
    return { text: loaded.error, links: [] };
  }
  const { ctx } = loaded;
  const recentMemory = session?.memory?.recent ?? [];

  if (session?.pendingPayment) {
    const followUp = await handlePaymentFollowUp(q, session.pendingPayment, ctx);
    if (followUp) return followUp;
  }

  const payIntent = parseRegisterPaymentIntent(q) ?? inferRegisterPaymentFromMemory(q, recentMemory, ctx.clients);
  if (payIntent) {
    return prepareRegisterPayment(ctx, payIntent.amountEur, payIntent.clientName);
  }

  let toolCall = matchAssistantIntent(q);
  let usedLlmRouter = false;

  if (!toolCall) {
    const picked = await pickToolWithOpenAI(q, recentMemory);
    if (picked.ok) {
      toolCall = picked.tool;
      usedLlmRouter = true;
    } else if (picked.directAnswer) {
      return { text: picked.directAnswer, links: [] };
    }
  }

  if (!toolCall) {
    return {
      text: ASSISTANT_HELP_TEXT,
      links: [
        { label: "Ver clientes", href: "/clients" },
        { label: "Ver facturas", href: "/invoices" },
      ],
    };
  }

  if (toolCall.name === "prepare_register_payment") {
    const amountEur = Number(toolCall.args.amountEur);
    const clientName = String(toolCall.args.clientName ?? "");
    if (!Number.isFinite(amountEur) || amountEur <= 0 || !clientName.trim()) {
      return {
        text: "Indica importe y cliente, por ejemplo: «he cobrado 150 de Acme SL».",
        links: [],
      };
    }
    return prepareRegisterPayment(ctx, amountEur, clientName);
  }

  const result = executeAssistantTool(toolCall.name, toolCall.args, ctx);

  const skipPolish = PAYMENT_TOOLS.has(toolCall.name);
  let text = skipPolish
    ? formatToolResultAsText(toolCall.name, result)
    : ((await polishAnswerWithOpenAI(q, toolCall.name, result.payload, recentMemory)) ??
      formatToolResultAsText(toolCall.name, result));

  const uniqueLinks = dedupeLinks(result.links);

  return {
    text,
    links: uniqueLinks.slice(0, 6),
    toolUsed: usedLlmRouter ? toolCall.name : undefined,
  };
}

function inferRegisterPaymentFromMemory(
  question: string,
  recent: { role: "user" | "assistant"; text: string }[],
  clients: { id: string; name: string }[],
): { amountEur: number; clientName: string } | null {
  const amountEur = parseAmountEur(question);
  if (!amountEur) return null;

  const assistantAskedPaymentDetails = recent.some(
    (entry) =>
      entry.role === "assistant" &&
      /(nombre del cliente|importe|registrar el cobro|cobrado)/i.test(entry.text),
  );
  if (!assistantAskedPaymentDetails) return null;

  const clientName = resolveClientNameFromRecentMemory(recent, clients);
  if (!clientName) return null;

  return { amountEur, clientName };
}

function parseAmountEur(text: string): number | null {
  const q = text.trim();
  if (!q) return null;
  const amountMatch =
    q.match(/(\d{1,8})(?:[.,](\d{1,2}))?\s*(?:€|eur|euros?)?/i) ??
    q.match(/(?:€|eur|euros?)\s*(\d{1,8})(?:[.,](\d{1,2}))?/i);
  if (!amountMatch) return null;
  const whole = amountMatch[1] ?? "";
  const frac = amountMatch[2];
  const parsed = Number.parseFloat((frac != null ? `${whole}.${frac}` : whole).replace(",", "."));
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.round(parsed * 100) / 100;
}

function resolveClientNameFromRecentMemory(
  recent: { role: "user" | "assistant"; text: string }[],
  clients: { id: string; name: string }[],
): string | null {
  const userMessages = recent
    .filter((entry) => entry.role === "user")
    .map((entry) => entry.text.toLowerCase())
    .reverse();

  for (const message of userMessages) {
    for (const client of clients) {
      if (message.includes(client.name.toLowerCase())) {
        return client.name;
      }
    }
  }
  return null;
}

function dedupeLinks(links: { label: string; href: string }[]) {
  const seen = new Set<string>();
  return links.filter((l) => {
    if (seen.has(l.href)) return false;
    seen.add(l.href);
    return true;
  });
}
