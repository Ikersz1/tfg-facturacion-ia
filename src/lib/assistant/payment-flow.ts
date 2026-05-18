import "server-only";

import type { AssistantContext, AssistantInvoice } from "@/lib/assistant/context";
import { resolveClient } from "@/lib/assistant/resolve-client";
import type { AssistantReply, PaymentChoice, PendingPaymentSession } from "@/lib/assistant/types";
import { formatMoneyEUR } from "@/lib/money";
import { registerInvoicePayment } from "@/lib/payments/register-invoice-payment";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const STATUS_LABEL: Record<string, string> = {
  issued: "Emitida",
  partial: "Parcial",
  overdue: "Vencida",
};

function statusLabel(st: string): string {
  return STATUS_LABEL[st] ?? st;
}

function openInvoicesForClient(ctx: AssistantContext, clientId: string): AssistantInvoice[] {
  return ctx.invoices
    .filter(
      (inv) =>
        inv.clientId === clientId &&
        inv.outstanding > 0 &&
        ["issued", "partial", "overdue"].includes(inv.effectiveStatus),
    )
    .sort((a, b) => {
      const da = a.dueDate ?? a.issueDate ?? a.createdAt;
      const db = b.dueDate ?? b.issueDate ?? b.createdAt;
      return da.localeCompare(db);
    });
}

export function buildPendingPaymentSession(
  clientId: string,
  clientName: string,
  amountEur: number,
  invoices: AssistantInvoice[],
): PendingPaymentSession {
  return {
    clientId,
    clientName,
    amountEur,
    candidates: invoices.map((inv, i) => ({
      index: i + 1,
      invoiceId: inv.id,
      numberLabel: inv.numberLabel,
      outstandingEur: inv.outstanding,
      dueDate: inv.dueDate,
      status: statusLabel(inv.effectiveStatus),
    })),
    createdAt: Date.now(),
  };
}

export function prepareRegisterPayment(
  ctx: AssistantContext,
  amountEur: number,
  clientQuery: string,
): AssistantReply {
  const resolved = resolveClient(ctx.clients, clientQuery);
  if (!resolved.ok) {
    if (resolved.reason === "ambiguous") {
      const names = resolved.candidates.map((c) => c.name).join("», «");
      return {
        text: `Hay varios clientes parecidos: «${names}». Indica el nombre completo.`,
        links: resolved.candidates.map((c) => ({
          label: c.name,
          href: `/clients/${c.id}`,
        })),
      };
    }
    if (resolved.reason === "missing") {
      return { text: "Indica de qué cliente es el cobro (p. ej. «he cobrado 100 de Acme»).", links: [] };
    }
    return { text: "No encuentro ese cliente.", links: [] };
  }

  const { client } = resolved;
  const open = openInvoicesForClient(ctx, client.id);

  if (open.length === 0) {
    return {
      text: `${client.name} no tiene facturas emitidas, parciales o vencidas con importe pendiente.`,
      links: [{ label: client.name, href: `/clients/${client.id}` }],
    };
  }

  const pending = buildPendingPaymentSession(client.id, client.name, amountEur, open);
  const choices: PaymentChoice[] = pending.candidates.map((c) => ({
    index: c.index,
    invoiceId: c.invoiceId,
    label: `${c.index}. ${c.numberLabel}`,
  }));

  if (open.length === 1) {
    const inv = open[0]!;
    const lines = formatCandidateLine(1, inv);
    return {
      text: `Cobro de ${formatMoneyEUR(amountEur)} para ${client.name}.\n\nSolo hay una factura abierta:\n${lines}\n\nResponde «sí» para registrar el cobro en esa factura.`,
      links: [{ label: inv.numberLabel, href: `/invoices/${inv.id}` }],
      pendingPayment: { ...pending, singleInvoiceConfirm: true },
      paymentChoices: choices,
    };
  }

  const lines = open
    .map((inv, i) => formatCandidateLine(i + 1, inv))
    .join("\n");
  return {
    text: `Cobro de ${formatMoneyEUR(amountEur)} para ${client.name}. Facturas abiertas (emitidas, parciales o vencidas):\n\n${lines}\n\n¿En cuál factura lo registro? Responde con el número (1, 2…) o el código de factura.`,
    links: open.slice(0, 6).map((inv) => ({
      label: inv.numberLabel,
      href: `/invoices/${inv.id}`,
    })),
    pendingPayment: pending,
    paymentChoices: choices,
  };
}

function formatCandidateLine(index: number, inv: AssistantInvoice): string {
  const due = inv.dueDate ? ` · vence ${inv.dueDate}` : "";
  return `${index}. ${inv.numberLabel} — pendiente ${formatMoneyEUR(inv.outstanding)} — ${statusLabel(inv.effectiveStatus)}${due}`;
}

export function resolvePaymentInvoiceChoice(
  question: string,
  pending: PendingPaymentSession,
): { invoiceId: string; numberLabel: string } | { error: string } | null {
  const q = question.trim().toLowerCase();
  if (!q) return null;

  if (
    pending.singleInvoiceConfirm &&
    pending.candidates.length === 1 &&
    /^(sí|si|ok|vale|confirmo|confirmar|esa|correcto|adelante)\b/i.test(q)
  ) {
    const c = pending.candidates[0]!;
    return { invoiceId: c.invoiceId, numberLabel: c.numberLabel };
  }

  const numMatch = q.match(/^(?:la\s*)?(\d{1,2})\b/);
  if (numMatch) {
    const idx = Number(numMatch[1]);
    const found = pending.candidates.find((c) => c.index === idx);
    if (found) return { invoiceId: found.invoiceId, numberLabel: found.numberLabel };
    return { error: `No hay una opción ${idx}. Elige entre 1 y ${pending.candidates.length}.` };
  }

  const ordinals: Record<string, number> = {
    primera: 1,
    primero: 1,
    segunda: 2,
    segundo: 2,
    tercera: 3,
    tercero: 3,
    cuarta: 4,
    cuarto: 4,
  };
  for (const [word, idx] of Object.entries(ordinals)) {
    if (q.includes(word)) {
      const found = pending.candidates.find((c) => c.index === idx);
      if (found) return { invoiceId: found.invoiceId, numberLabel: found.numberLabel };
    }
  }

  const normQ = q.replace(/\s+/g, "");
  for (const c of pending.candidates) {
    const normLabel = c.numberLabel.toLowerCase().replace(/\s+/g, "");
    if (normQ.includes(normLabel) || q.includes(c.numberLabel.toLowerCase())) {
      return { invoiceId: c.invoiceId, numberLabel: c.numberLabel };
    }
  }

  return null;
}

export async function confirmRegisterPayment(
  ctx: AssistantContext,
  pending: PendingPaymentSession,
  invoiceId: string,
  numberLabel: string,
): Promise<AssistantReply> {
  const candidate = pending.candidates.find((c) => c.invoiceId === invoiceId);
  if (!candidate) {
    return { text: "Esa factura no está en la lista del cobro pendiente.", links: [] };
  }

  if (pending.amountEur > candidate.outstandingEur + 0.01) {
    return {
      text: `El importe (${formatMoneyEUR(pending.amountEur)}) supera el pendiente de ${numberLabel} (${formatMoneyEUR(candidate.outstandingEur)}). Indica otra factura o un importe menor.`,
      links: [{ label: numberLabel, href: `/invoices/${invoiceId}` }],
      pendingPayment: pending,
    };
  }

  const supabase = await createClient();
  const result = await registerInvoicePayment(supabase, {
    invoiceId,
    amountEur: pending.amountEur,
    notes: `Cobro registrado desde asistente (${pending.clientName})`,
  });

  if (!result.ok) {
    return { text: result.error, links: [] };
  }

  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/invoices");
  revalidatePath("/informes");
  revalidatePath(`/clients/${pending.clientId}`);

  const estado = result.fullyPaid
    ? "La factura queda pagada."
    : "Queda parcialmente pagada.";
  return {
    text: `Registrado cobro de ${formatMoneyEUR(result.amountEur)} en ${numberLabel} (${pending.clientName}). Total cobrado en la factura: ${formatMoneyEUR(result.sumPaidEur)} de ${formatMoneyEUR(result.invoiceTotalEur)}. ${estado}`,
    links: [{ label: `Ver ${numberLabel}`, href: `/invoices/${invoiceId}` }],
    pendingPayment: null,
  };
}

export async function handlePaymentFollowUp(
  question: string,
  pending: PendingPaymentSession,
  ctx: AssistantContext,
): Promise<AssistantReply | null> {
  if (Date.now() - pending.createdAt > 15 * 60 * 1000) {
    return {
      text: "El cobro pendiente ha caducado. Vuelve a decirme «he cobrado X de [cliente]».",
      links: [],
      pendingPayment: null,
    };
  }

  if (/^(cancelar|cancela)$/i.test(question.trim())) {
    return {
      text: "De acuerdo, no registro ningún cobro.",
      links: [],
      pendingPayment: null,
    };
  }

  const choice = resolvePaymentInvoiceChoice(question, pending);
  if (!choice) return null;
  if ("error" in choice) {
    return { text: choice.error, links: [], pendingPayment: pending };
  }

  return confirmRegisterPayment(ctx, pending, choice.invoiceId, choice.numberLabel);
}
