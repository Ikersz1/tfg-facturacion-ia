import "server-only";

import { getAuthSiteUrl } from "@/lib/auth-site-url";
import { effectiveInvoiceStatus, todayLocalYMD } from "@/lib/invoice-status";
import { formatMoneyEUR, roundCurrencyEUR } from "@/lib/money";
import {
  formatPeriodLabel,
  rangePreviousWeek,
} from "@/lib/n8n/weekly-summary-range";
import type { SupabaseClient } from "@supabase/supabase-js";

export type WeeklySummaryPayload = {
  type: "weekly_summary";
  week_key: string;
  period: {
    from: string;
    to: string;
    label: string;
  };
  metrics: {
    issued_count: number;
    billed_total: number;
    billed_total_formatted: string;
    collected_in_period: number;
    collected_in_period_formatted: string;
    pending_now: number;
    pending_now_formatted: string;
    overdue_now: number;
    overdue_now_formatted: string;
    overdue_count: number;
  };
  overdue_invoices: Array<{
    number_label: string;
    client_name: string;
    outstanding_formatted: string;
    days_overdue: number;
    detail_url: string;
  }>;
  links: {
    informes_url: string;
    dashboard_url: string;
  };
  issuer: {
    legal_name: string | null;
    tax_id: string | null;
    email: string | null;
  };
  to_email: string;
};

function inYmdRange(iso: string | null | undefined, from: string, to: string): boolean {
  if (!iso) return false;
  const day = iso.slice(0, 10);
  return day >= from && day <= to;
}

type InvoiceRow = {
  id: string;
  series: string;
  year: number;
  number: number;
  total: number;
  status: string;
  issue_date: string | null;
  due_date: string | null;
  clients: unknown;
};

function clientNameFromJoin(clients: unknown): string {
  if (!clients) return "—";
  if (Array.isArray(clients)) {
    const first = clients[0] as { name?: string | null } | undefined;
    return first?.name ?? "—";
  }
  return (clients as { name?: string | null }).name ?? "—";
}

export async function buildWeeklySummaryForUser(
  admin: SupabaseClient,
  input: {
    userId: string;
    issuerEmail: string | null;
    legalName: string | null;
    taxId: string | null;
  },
): Promise<WeeklySummaryPayload | null> {
  if (!input.issuerEmail?.trim()) return null;

  const { from, to, weekKey } = rangePreviousWeek();
  const todayYmd = todayLocalYMD();
  const base = getAuthSiteUrl();

  const { data: invoices } = await admin
    .from("invoices")
    .select(
      "id, client_id, series, year, number, total, status, issue_date, due_date, clients ( name )",
    )
    .eq("user_id", input.userId);

  if (!invoices?.length) {
    return {
      type: "weekly_summary",
      week_key: weekKey,
      period: { from, to, label: formatPeriodLabel(from, to) },
      metrics: {
        issued_count: 0,
        billed_total: 0,
        billed_total_formatted: formatMoneyEUR(0),
        collected_in_period: 0,
        collected_in_period_formatted: formatMoneyEUR(0),
        pending_now: 0,
        pending_now_formatted: formatMoneyEUR(0),
        overdue_now: 0,
        overdue_now_formatted: formatMoneyEUR(0),
        overdue_count: 0,
      },
      overdue_invoices: [],
      links: {
        informes_url: `${base}/informes`,
        dashboard_url: `${base}/`,
      },
      issuer: {
        legal_name: input.legalName,
        tax_id: input.taxId,
        email: input.issuerEmail,
      },
      to_email: input.issuerEmail.trim(),
    };
  }

  const invoiceIds = invoices.map((i) => i.id as string);
  const { data: payments } = await admin
    .from("payments")
    .select("invoice_id, amount, paid_at")
    .in("invoice_id", invoiceIds);

  const paidByInvoice = new Map<string, number>();
  for (const p of payments ?? []) {
    const id = p.invoice_id as string;
    paidByInvoice.set(id, roundCurrencyEUR((paidByInvoice.get(id) ?? 0) + Number(p.amount)));
  }

  let issuedCount = 0;
  let billedTotal = 0;
  let collectedInPeriod = 0;
  let pendingNow = 0;
  let overdueNow = 0;
  let overdueCount = 0;

  const overdueList: WeeklySummaryPayload["overdue_invoices"] = [];

  for (const inv of invoices as unknown as InvoiceRow[]) {
    const st = inv.status;
    if (st === "cancelled") continue;

    const paid = paidByInvoice.get(inv.id) ?? 0;
    const total = roundCurrencyEUR(Number(inv.total));
    const outstanding = roundCurrencyEUR(Math.max(0, total - paid));

    if (st !== "draft" && inYmdRange(inv.issue_date, from, to)) {
      issuedCount += 1;
      billedTotal = roundCurrencyEUR(billedTotal + total);
      collectedInPeriod = roundCurrencyEUR(collectedInPeriod + paid);
    }

    if (st === "draft" || st === "paid" || outstanding <= 0) continue;

    const eff = effectiveInvoiceStatus({
      status: st,
      total: Number(inv.total),
      paidSum: paid,
      issue_date: inv.issue_date,
      due_date: inv.due_date,
      todayYmd,
    });

    if (eff === "issued" || eff === "partial" || eff === "overdue") {
      pendingNow = roundCurrencyEUR(pendingNow + outstanding);
    }

    if (eff === "overdue") {
      overdueNow = roundCurrencyEUR(overdueNow + outstanding);
      overdueCount += 1;

      const dueDate = (inv.due_date ?? inv.issue_date ?? "").slice(0, 10);
      const daysOverdue = dueDate
        ? Math.max(
            0,
            Math.floor(
              (new Date(todayYmd).getTime() - new Date(dueDate).getTime()) /
                (1000 * 60 * 60 * 24),
            ),
          )
        : 0;

      overdueList.push({
        number_label: `${inv.series}-${inv.year}/${inv.number}`,
        client_name: clientNameFromJoin(inv.clients),
        outstanding_formatted: formatMoneyEUR(outstanding),
        days_overdue: daysOverdue,
        detail_url: `${base}/invoices/${inv.id}`,
      });
    }
  }

  overdueList.sort((a, b) => b.days_overdue - a.days_overdue);

  return {
    type: "weekly_summary",
    week_key: weekKey,
    period: { from, to, label: formatPeriodLabel(from, to) },
    metrics: {
      issued_count: issuedCount,
      billed_total: billedTotal,
      billed_total_formatted: formatMoneyEUR(billedTotal),
      collected_in_period: collectedInPeriod,
      collected_in_period_formatted: formatMoneyEUR(collectedInPeriod),
      pending_now: pendingNow,
      pending_now_formatted: formatMoneyEUR(pendingNow),
      overdue_now: overdueNow,
      overdue_now_formatted: formatMoneyEUR(overdueNow),
      overdue_count: overdueCount,
    },
    overdue_invoices: overdueList.slice(0, 5),
    links: {
      informes_url: `${base}/informes`,
      dashboard_url: `${base}/`,
    },
    issuer: {
      legal_name: input.legalName,
      tax_id: input.taxId,
      email: input.issuerEmail,
    },
    to_email: input.issuerEmail.trim(),
  };
}
