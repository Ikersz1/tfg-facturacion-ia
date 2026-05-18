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

  if (session?.pendingPayment) {
    const followUp = await handlePaymentFollowUp(q, session.pendingPayment, ctx);
    if (followUp) return followUp;
  }

  const payIntent = parseRegisterPaymentIntent(q);
  if (payIntent) {
    return prepareRegisterPayment(ctx, payIntent.amountEur, payIntent.clientName);
  }

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
    : ((await polishAnswerWithOpenAI(q, toolCall.name, result.payload)) ??
      formatToolResultAsText(toolCall.name, result));

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
