import "server-only";

import { invoiceNumberLabel } from "@/lib/assistant/invoice-label";
import { effectiveInvoiceStatus, todayLocalYMD } from "@/lib/invoice-status";
import { roundCurrencyEUR } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";
import { requireAuthUserId } from "@/lib/supabase/require-auth-user";

export type AssistantClient = { id: string; name: string };

export type AssistantInvoice = {
  id: string;
  clientId: string;
  clientName: string;
  numberLabel: string;
  status: string;
  effectiveStatus: string;
  total: number;
  paidSum: number;
  outstanding: number;
  issueDate: string | null;
  dueDate: string | null;
  createdAt: string;
};

export type AssistantContext = {
  clients: AssistantClient[];
  invoices: AssistantInvoice[];
  todayYmd: string;
};

export type AssistantContextResult =
  | { ok: true; ctx: AssistantContext }
  | { ok: false; error: string };

export async function loadAssistantContext(): Promise<AssistantContextResult> {
  const supabase = await createClient();
  const auth = await requireAuthUserId(supabase);
  if ("error" in auth) {
    return { ok: false, error: auth.error };
  }

  const [clientsRes, invoicesRes, paymentsRes] = await Promise.all([
    supabase.from("clients").select("id, name").order("name"),
    supabase
      .from("invoices")
      .select(
        "id, client_id, series, year, number, status, total, issue_date, due_date, created_at, clients ( name )",
      )
      .order("created_at", { ascending: false }),
    supabase.from("payments").select("invoice_id, amount"),
  ]);

  if (clientsRes.error) {
    return { ok: false, error: clientsRes.error.message };
  }
  if (invoicesRes.error) {
    return { ok: false, error: invoicesRes.error.message };
  }

  const paidByInvoice = new Map<string, number>();
  for (const p of paymentsRes.data ?? []) {
    const id = p.invoice_id as string;
    paidByInvoice.set(
      id,
      roundCurrencyEUR((paidByInvoice.get(id) ?? 0) + Number(p.amount)),
    );
  }

  const todayYmd = todayLocalYMD();
  const clients: AssistantClient[] = (clientsRes.data ?? []).map((c) => ({
    id: c.id as string,
    name: (c.name as string) ?? "—",
  }));

  const invoices: AssistantInvoice[] = (invoicesRes.data ?? []).map((inv) => {
    const st = inv.status as string;
    const total = roundCurrencyEUR(Number(inv.total));
    const paidSum = roundCurrencyEUR(paidByInvoice.get(inv.id as string) ?? 0);
    const outstanding = roundCurrencyEUR(Math.max(0, total - paidSum));
    const clientRel = inv.clients as { name?: string } | { name?: string }[] | null;
    const clientName = Array.isArray(clientRel)
      ? (clientRel[0]?.name ?? "—")
      : (clientRel?.name ?? "—");

    const effectiveStatus = effectiveInvoiceStatus({
      status: st,
      total: Number(inv.total),
      paidSum,
      issue_date: inv.issue_date as string | null,
      due_date: inv.due_date as string | null,
      todayYmd,
    });

    return {
      id: inv.id as string,
      clientId: inv.client_id as string,
      clientName,
      numberLabel: invoiceNumberLabel({
        status: st,
        series: inv.series as string,
        year: Number(inv.year),
        number: inv.number != null ? Number(inv.number) : null,
      }),
      status: st,
      effectiveStatus,
      total,
      paidSum,
      outstanding,
      issueDate: (inv.issue_date as string | null)?.slice(0, 10) ?? null,
      dueDate: (inv.due_date as string | null)?.slice(0, 10) ?? null,
      createdAt: inv.created_at as string,
    };
  });

  return { ok: true, ctx: { clients, invoices, todayYmd } };
}
