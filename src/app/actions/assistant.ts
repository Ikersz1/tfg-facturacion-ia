"use server";

import { askAssistant } from "@/lib/assistant/ask";
import type { AssistantLink } from "@/lib/assistant/types";

export type AssistantActionState = {
  ok?: boolean;
  text?: string;
  links?: AssistantLink[];
  error?: string;
};

export async function assistantAskAction(
  _prev: AssistantActionState,
  formData: FormData,
): Promise<AssistantActionState> {
  const question = formData.get("question")?.toString() ?? "";
  try {
    const reply = await askAssistant(question);
    return { ok: true, text: reply.text, links: reply.links };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al procesar la pregunta.";
    return { error: msg };
  }
}
