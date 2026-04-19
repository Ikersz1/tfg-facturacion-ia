import "server-only";

import { effectiveInvoiceStatus } from "@/lib/invoice-status";
import { roundCurrencyEUR } from "@/lib/money";
import { createAdminClient } from "@/lib/supabase/admin";

export type MonthlyIncome = { key: string; label: string; amount: number };

export type RecentInvoiceRow = {
  id: string;
  numberLabel: string;
  clientName: string;
  total: number;
  status: string;
  date: string | null;
};

export type DashboardData = {
  billedThisMonth: number;
  pendingToCollect: number;
  overdueAmount: number;
  totalInvoices: number;
  /** Últimos 6 meses (gráfica inicio). */
  monthlyIncome: MonthlyIncome[];
  /** Últimos 12 meses (informes). */
  monthlyIncome12: MonthlyIncome[];
  recentInvoices: RecentInvoiceRow[];
};

function monthKey(y: number, m: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}`;
}

function parseIssueMonth(issueDate: string | null): string | null {
  if (!issueDate) return null;
  const d = new Date(issueDate);
  if (Number.isNaN(d.getTime())) return null;
  return monthKey(d.getFullYear(), d.getMonth());
}

export async function getDashboardData(): Promise<DashboardData> {
  const supabase = createAdminClient();

  const { data: invoices, error: invErr } = await supabase
    .from("invoices")
    .select(
      "id, total, status, issue_date, due_date, created_at, series, year, number, clients ( name )",
    );

  if (invErr || !invoices) {
    return {
      billedThisMonth: 0,
      pendingToCollect: 0,
      overdueAmount: 0,
      totalInvoices: 0,
      monthlyIncome: [],
      monthlyIncome12: [],
      recentInvoices: [],
    };
  }

  const { data: payments } = await supabase.from("payments").select("invoice_id, amount");

  const paidByInvoice = new Map<string, number>();
  for (const p of payments ?? []) {
    const id = p.invoice_id as string;
    const prev = paidByInvoice.get(id) ?? 0;
    paidByInvoice.set(id, roundCurrencyEUR(prev + Number(p.amount)));
  }

  const now = new Date();
  const todayYmd = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
  const thisMonthKey = monthKey(now.getFullYear(), now.getMonth());

  let billedThisMonth = 0;
  let pendingToCollect = 0;
  let overdueAmount = 0;
  let totalInvoices = 0;

  const monthBuckets = new Map<string, number>();
  const months12: MonthlyIncome[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = monthKey(d.getFullYear(), d.getMonth());
    const label = d.toLocaleDateString("es-ES", { month: "short", year: "2-digit" });
    monthBuckets.set(key, 0);
    months12.push({ key, label, amount: 0 });
  }

  for (const inv of invoices) {
    const status = inv.status as string;
    if (status === "cancelled") continue;

    totalInvoices += 1;

    const total = roundCurrencyEUR(Number(inv.total));
    const paid = roundCurrencyEUR(paidByInvoice.get(inv.id) ?? 0);
    const outstanding = roundCurrencyEUR(Math.max(0, total - paid));

    const issue = inv.issue_date as string | null;
    const im = parseIssueMonth(issue);

    if (status !== "draft" && status !== "cancelled") {
      if (im === thisMonthKey) {
        billedThisMonth = roundCurrencyEUR(billedThisMonth + total);
      }
      if (im && monthBuckets.has(im)) {
        monthBuckets.set(im, roundCurrencyEUR((monthBuckets.get(im) ?? 0) + total));
      }
    }

    const eff = effectiveInvoiceStatus({
      status,
      total,
      paidSum: paid,
      issue_date: inv.issue_date as string | null,
      due_date: inv.due_date as string | null,
      todayYmd,
    });
    if (eff === "issued" || eff === "partial" || eff === "overdue") {
      pendingToCollect = roundCurrencyEUR(pendingToCollect + outstanding);
      if (eff === "overdue") {
        overdueAmount = roundCurrencyEUR(overdueAmount + outstanding);
      }
    }
  }

  for (const m of months12) {
    m.amount = monthBuckets.get(m.key) ?? 0;
  }

  const monthlyIncome = months12.slice(-6);

  const sorted = [...invoices].sort((a, b) => {
    const ac = new Date((a.created_at as string) ?? 0).getTime();
    const bc = new Date((b.created_at as string) ?? 0).getTime();
    return bc - ac;
  });

  const recent: RecentInvoiceRow[] = sorted.slice(0, 8).map((inv) => {
    const cr = inv.clients as { name: string } | { name: string }[] | null;
    const client = Array.isArray(cr) ? cr[0] : cr;
    const num =
      inv.number != null
        ? `${inv.series}-${inv.year}/${inv.number}`
        : `${inv.series}-${inv.year}/borrador`;
    const paid = roundCurrencyEUR(paidByInvoice.get(inv.id as string) ?? 0);
    const eff = effectiveInvoiceStatus({
      status: inv.status as string,
      total: Number(inv.total),
      paidSum: paid,
      issue_date: inv.issue_date as string | null,
      due_date: inv.due_date as string | null,
      todayYmd,
    });
    return {
      id: inv.id as string,
      numberLabel: num,
      clientName: client?.name ?? "—",
      total: roundCurrencyEUR(Number(inv.total)),
      status: eff,
      date: (inv.issue_date as string | null) ?? (inv.created_at as string | null)?.slice(0, 10) ?? null,
    };
  });

  return {
    billedThisMonth,
    pendingToCollect,
    overdueAmount,
    totalInvoices,
    monthlyIncome,
    monthlyIncome12: months12,
    recentInvoices: recent,
  };
}
