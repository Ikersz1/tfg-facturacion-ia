import "server-only";

import { ASSISTANT_OPENAI_TOOLS } from "@/lib/assistant/tool-schemas";
import { isToolName } from "@/lib/assistant/match-intent";
import type { ToolCall } from "@/lib/assistant/types";

const SYSTEM = `Eres el asistente de un panel de facturación en español (España).
Tu única tarea es elegir UNA herramienta para responder la pregunta del usuario sobre SUS facturas y clientes.
No inventes datos. No pidas NIF ni datos fiscales. NUNCA respondas cifras (número de clientes, importes, nombres) sin llamar a una herramienta.

Reglas de enrutado:
- get_top_debtors: deuda, moroso, «debe más», pendiente de cobro.
- get_top_clients_by_billing: «mejor cliente», top, más facturación o más ingresos (NO deuda).
- get_invoices_due_soon: facturas que vencen pronto o esta semana.
- compare_billing_periods: comparar facturación entre meses.
- draft_payment_reminder: texto de recordatorio de cobro (requiere clientName).
- prepare_register_payment: el usuario ha cobrado un importe de un cliente (he cobrado X de…).
- list_clients con countOnly true: «cuántos clientes tengo», total de clientes.
- list_clients sin countOnly: listar o buscar clientes por nombre.
- open_filtered_view: view invoices o clients con filtros.
- Si preguntan si puedes emitir/crear facturas: responde brevemente SIN herramienta que no puedes emitir desde el chat.
- Si preguntan en qué puedes ayudar: responde SIN herramienta listando capacidades de consulta (deudores, resúmenes, facturas, listados).

Si no encaja ninguna herramienta y no es meta-pregunta, responde invitando a reformular con un ejemplo concreto.`;

export async function pickToolWithOpenAI(question: string): Promise<
  | { ok: true; tool: ToolCall }
  | { ok: false; directAnswer?: string; error?: string }
> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, error: "no_api_key" };
  }

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: question },
      ],
      tools: ASSISTANT_OPENAI_TOOLS,
      tool_choice: "auto",
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    return { ok: false, error: `OpenAI ${res.status}: ${body.slice(0, 200)}` };
  }

  const json = (await res.json()) as {
    choices?: { message?: { content?: string | null; tool_calls?: { function: { name: string; arguments: string } }[] } }[];
  };

  const message = json.choices?.[0]?.message;
  const toolCalls = message?.tool_calls;
  if (toolCalls?.length) {
    const fn = toolCalls[0].function;
    if (!isToolName(fn.name)) {
      return { ok: false, error: `Tool desconocida: ${fn.name}` };
    }
    let args: Record<string, unknown> = {};
    try {
      args = JSON.parse(fn.arguments || "{}") as Record<string, unknown>;
    } catch {
      args = {};
    }
    return { ok: true, tool: { name: fn.name, args } };
  }

  const text = message?.content?.trim();
  if (text) {
    return { ok: false, directAnswer: text };
  }

  return { ok: false, error: "Sin respuesta del modelo" };
}

export async function polishAnswerWithOpenAI(
  question: string,
  toolName: string,
  toolPayload: Record<string, unknown>,
): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey || process.env.ASSISTANT_SKIP_POLISH === "1") {
    return null;
  }

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content:
            "Redacta en español una respuesta breve (máx. 6 frases) para el usuario de un panel de facturación. Usa SOLO los datos JSON proporcionados. No inventes cifras ni nombres. No menciones NIF ni datos fiscales. Tono profesional y claro. Si la pregunta habla de «mejor cliente» y los datos son de facturación acumulada, no hables de deuda. Si los datos son deudores/morosidad, no digas que es el «mejor» cliente.",
        },
        {
          role: "user",
          content: `Pregunta: ${question}\nHerramienta: ${toolName}\nDatos (JSON): ${JSON.stringify(toolPayload)}`,
        },
      ],
    }),
  });

  if (!res.ok) return null;

  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return json.choices?.[0]?.message?.content?.trim() ?? null;
}
