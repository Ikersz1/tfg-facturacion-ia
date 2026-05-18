"use server";

import { askAssistant } from "@/lib/assistant/ask";
import type {
  AssistantLink,
  AssistantSessionContext,
  PaymentChoice,
  PendingPaymentSession,
} from "@/lib/assistant/types";

export type AssistantActionState = {
  ok?: boolean;
  text?: string;
  links?: AssistantLink[];
  pendingPayment?: PendingPaymentSession | null;
  paymentChoices?: PaymentChoice[];
  error?: string;
};

function parseSessionContext(raw: string | null): AssistantSessionContext | undefined {
  if (!raw?.trim()) return undefined;
  try {
    return JSON.parse(raw) as AssistantSessionContext;
  } catch {
    return undefined;
  }
}

export async function assistantAskAction(
  _prev: AssistantActionState,
  formData: FormData,
): Promise<AssistantActionState> {
  const question = formData.get("question")?.toString() ?? "";
  const session = parseSessionContext(formData.get("context")?.toString() ?? null);
  try {
    const reply = await askAssistant(question, session);
    return {
      ok: true,
      text: reply.text,
      links: reply.links,
      pendingPayment: reply.pendingPayment,
      paymentChoices: reply.paymentChoices,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al procesar la pregunta.";
    return { error: msg };
  }
}
