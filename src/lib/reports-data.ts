import "server-only";

import { effectiveInvoiceStatus, todayLocalYMD } from "@/lib/invoice-status";
import { formatYMD } from "@/lib/invoice-list-url";
import { roundCurrencyEUR } from "@/lib/money";
import { rangeLast12Months, rangeThisMonth, rangeThisWeek } from "@/lib/informes-range-presets";
import type { ReportsResolvedFilters } from "@/lib/reports-query";
import { createAdminClient } from "@/lib/supabase/admin";

export type { ReportsResolvedFilters } from "@/lib/reports-query";
export { buildReportsQueryString } from "@/lib/reports-query";

export type TimePoint = { key: string; label: string; amount: number };

export type ClientRankingRow = {
  clientId: string;
  name: string;
  invoiced: number;
  collected: number;
  pending: number;
};

export type DonutSegment = { id: string; label: string; amount: number; color: string };

export type ProductTopRow = {
  key: string;
  name: string;
  quantity: number;
  revenue: number;
};

export type ReportsData = {
  filters: ReportsResolvedFilters;
  metrics: {
    billedInPeriod: number;
    collectedInPeriod: number;
    pendingNow: number;
    overdueNow: number;
    invoiceCountInPeriod: number;
    /** Facturación mes calendario actual vs anterior (global). */
    billedThisCalendarMonth: number;
    billedPreviousCalendarMonth: number;
    pctChangeVsPreviousMonth: number | null;
  };
  timeSeries: TimePoint[];
  clientsRanking: ClientRankingRow[];
  statusDonut: DonutSegment[];
  topProducts: ProductTopRow[];
  aiHints: {
    bestPeriodLabel: string;
    bestPeriodAmount: number;
    topDebtClientName: string;
    topDebtAmount: number;
    lastQuarterBilled: number;
  };
};

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function monthKey(y: number, m: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}`;
}

function parseYmd(s: string): Date {
  const [y, mo, da] = s.split("-").map(Number);
  return new Date(y, mo - 1, da);
}

function defaultRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setMonth(from.getMonth() - 12);
  return { from: ymd(from), to: ymd(to) };
}

function inYmdRange(iso: string | null | undefined, from: string, to: string): boolean {
  if (!iso) return false;
  const day = iso.slice(0, 10);
  return day >= from && day <= to;
}

function startOfWeekMonday(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - day);
  return x;
}

function weekKeyFromIssue(iso: string): string {
  const d = parseYmd(iso.slice(0, 10));
  return ymd(startOfWeekMonday(d));
}

function labelMonth(key: string): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString("es-ES", { month: "short", year: "2-digit" });
}

function labelWeek(weekStartYmd: string): string {
  const s = parseYmd(weekStartYmd);
  const e = new Date(s);
  e.setDate(e.getDate() + 6);
  const f = (x: Date) =>
    x.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  return `${f(s)} – ${f(e)}`;
}

function labelSingleDay(ymdStr: string, todayYmd: string): string {
  const d = parseYmd(ymdStr);
  const short = d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  if (ymdStr === todayYmd) return `Hoy · ${short}`;
  return d.toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" });
}

function daysBetweenInclusive(fromStr: string, toStr: string): string[] {
  const out: string[] = [];
  let cur = parseYmd(fromStr);
  const end = parseYmd(toStr);
  while (cur.getTime() <= end.getTime()) {
    out.push(formatYMD(cur));
    cur = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 1);
  }
  return out;
}

/** Lunes de cada semana que solapa [from, to] (mismas claves que `weekKeyFromIssue`). */
function weeksBetweenInclusive(fromStr: string, toStr: string): string[] {
  const keys: string[] = [];
  let cur = startOfWeekMonday(parseYmd(fromStr));
  const lastWeekStart = startOfWeekMonday(parseYmd(toStr));
  while (cur.getTime() <= lastWeekStart.getTime()) {
    keys.push(ymd(cur));
    const next = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 7);
    cur = next;
  }
  return keys;
}

/** Etiqueta corta por día dentro de la vista «Esta semana». */
function labelWeekDay(ymdStr: string, todayYmd: string): string {
  const d = parseYmd(ymdStr);
  const rest = d.toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" });
  if (ymdStr === todayYmd) return `Hoy · ${rest}`;
  return rest;
}

export function resolveReportsFilters(sp: Record<string, string | string[] | undefined>): ReportsResolvedFilters {
  const def = defaultRange();
  const rawFrom = typeof sp.from === "string" ? sp.from : def.from;
  const rawTo = typeof sp.to === "string" ? sp.to : def.to;
  let from = rawFrom.slice(0, 10);
  let to = rawTo.slice(0, 10);
  if (parseYmd(from) > parseYmd(to)) {
    const t = from;
    from = to;
    to = t;
  }
  const clientRaw = sp.client_id;
  const clientId =
    typeof clientRaw === "string" && clientRaw.length > 0 && clientRaw !== "all" ? clientRaw : null;
  let g: "month" | "week" = sp.granularity === "week" ? "week" : "month";
  const esteMes = rangeThisMonth();
  const estaSemana = rangeThisWeek();
  if (from === esteMes.from && to === esteMes.to) {
    g = "week";
  }
  if (from === estaSemana.from && to === estaSemana.to) {
    g = "week";
  }
  const last12 = rangeLast12Months();
  if (from === last12.from && to === last12.to) {
    g = "month";
  }
  return { from, to, clientId, granularity: g };
}

export async function getReportsData(sp: Record<string, string | string[] | undefined>): Promise<ReportsData> {
  const filters = resolveReportsFilters(sp);
  const { from, to, clientId, granularity } = filters;

  const supabase = createAdminClient();

  const [invRes, payRes, linesRes, clientsRes, productsRes] = await Promise.all([
    supabase
      .from("invoices")
      .select("id, client_id, total, status, issue_date, due_date, created_at, series, year, number"),
    supabase.from("payments").select("invoice_id, amount, paid_at"),
    supabase.from("invoice_lines").select("invoice_id, product_id, description, quantity, line_total"),
    supabase.from("clients").select("id, name").order("name"),
    supabase.from("products").select("id, name"),
  ]);

  const invoices = invRes.data ?? [];
  const payments = payRes.data ?? [];
  const lines = linesRes.data ?? [];
  const clientsList = clientsRes.data ?? [];
  const productsList = productsRes.data ?? [];

  const clientName = new Map<string, string>();
  for (const c of clientsList) {
    clientName.set(c.id as string, (c.name as string) ?? "—");
  }

  const productName = new Map<string, string>();
  for (const p of productsList) {
    productName.set(p.id as string, (p.name as string) ?? "—");
  }

  const paidByInvoice = new Map<string, number>();
  for (const p of payments) {
    const id = p.invoice_id as string;
    paidByInvoice.set(id, roundCurrencyEUR((paidByInvoice.get(id) ?? 0) + Number(p.amount)));
  }

  const invoiceById = new Map<string, (typeof invoices)[0]>();
  for (const inv of invoices) {
    invoiceById.set(inv.id as string, inv);
  }

  const invMatchesClient = (inv: (typeof invoices)[0]) =>
    !clientId || (inv.client_id as string) === clientId;

  const invIssuedInPeriod = (inv: (typeof invoices)[0]) => {
    const st = inv.status as string;
    if (st === "draft" || st === "cancelled") return false;
    return inYmdRange(inv.issue_date as string | null, from, to) && invMatchesClient(inv);
  };

  let billedInPeriod = 0;
  let collectedInPeriod = 0;
  let invoiceCountInPeriod = 0;

  const now = new Date();
  const thisMk = monthKey(now.getFullYear(), now.getMonth());
  const prevD = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMk = monthKey(prevD.getFullYear(), prevD.getMonth());

  let billedThisCalendarMonth = 0;
  let billedPreviousCalendarMonth = 0;

  for (const inv of invoices) {
    const st = inv.status as string;
    if (st === "cancelled") continue;

    const issue = inv.issue_date as string | null;
    const im = issue ? issue.slice(0, 7) : null;
    if (im === thisMk && st !== "draft") {
      billedThisCalendarMonth = roundCurrencyEUR(billedThisCalendarMonth + Number(inv.total));
    }
    if (im === prevMk && st !== "draft") {
      billedPreviousCalendarMonth = roundCurrencyEUR(billedPreviousCalendarMonth + Number(inv.total));
    }

    if (invIssuedInPeriod(inv)) {
      billedInPeriod = roundCurrencyEUR(billedInPeriod + Number(inv.total));
      invoiceCountInPeriod += 1;
    }
  }

  /** Cobrado del periodo = suma de cobros en facturas emitidas en el periodo (todas las fechas de pago). */
  for (const inv of invoices) {
    if (!invIssuedInPeriod(inv)) continue;
    const paid = roundCurrencyEUR(paidByInvoice.get(inv.id as string) ?? 0);
    collectedInPeriod = roundCurrencyEUR(collectedInPeriod + paid);
  }

  let pendingNow = 0;
  let overdueNow = 0;
  const todayYmd = todayLocalYMD();
  for (const inv of invoices) {
    const st = inv.status as string;
    if (st === "cancelled" || st === "draft" || st === "paid") continue;
    if (!invMatchesClient(inv)) continue;
    const total = roundCurrencyEUR(Number(inv.total));
    const paid = roundCurrencyEUR(paidByInvoice.get(inv.id as string) ?? 0);
    const out = roundCurrencyEUR(Math.max(0, total - paid));
    const eff = effectiveInvoiceStatus({
      status: st,
      total: Number(inv.total),
      paidSum: paid,
      issue_date: inv.issue_date as string | null,
      due_date: inv.due_date as string | null,
      todayYmd,
    });
    if (eff === "issued" || eff === "partial" || eff === "overdue") {
      pendingNow = roundCurrencyEUR(pendingNow + out);
    }
    if (eff === "overdue") {
      overdueNow = roundCurrencyEUR(overdueNow + out);
    }
  }

  let pctChangeVsPreviousMonth: number | null = null;
  if (billedPreviousCalendarMonth > 0) {
    pctChangeVsPreviousMonth = roundCurrencyEUR(
      ((billedThisCalendarMonth - billedPreviousCalendarMonth) / billedPreviousCalendarMonth) * 100,
    );
  } else if (billedThisCalendarMonth > 0) {
    pctChangeVsPreviousMonth = 100;
  }

  /** Time series: «Esta semana» = día a día; «Este mes» = semana a semana; resto según granularidad. */
  const estaSemanaR = rangeThisWeek();
  const esteMesR = rangeThisMonth();
  const isEstaSemanaRange = from !== to && from === estaSemanaR.from && to === estaSemanaR.to;
  const isEsteMesRange = from !== to && from === esteMesR.from && to === esteMesR.to;

  const weekDayKeys = isEstaSemanaRange ? daysBetweenInclusive(from, to) : null;
  const monthWeekKeys = isEsteMesRange ? weeksBetweenInclusive(from, to) : null;

  const monthAmounts = new Map<string, number>();
  const weekAmounts = new Map<string, number>();
  const dayAmounts = new Map<string, number>();
  const esteMesWeekAmounts = new Map<string, number>();
  if (weekDayKeys) {
    for (const dk of weekDayKeys) dayAmounts.set(dk, 0);
  }
  if (monthWeekKeys) {
    for (const wk of monthWeekKeys) esteMesWeekAmounts.set(wk, 0);
  }

  for (const inv of invoices) {
    const st = inv.status as string;
    if (st === "draft" || st === "cancelled") continue;
    const issue = inv.issue_date as string | null;
    if (!issue || !inYmdRange(issue, from, to)) continue;
    if (!invMatchesClient(inv)) continue;
    const t = roundCurrencyEUR(Number(inv.total));
    const mk = issue.slice(0, 7);
    monthAmounts.set(mk, roundCurrencyEUR((monthAmounts.get(mk) ?? 0) + t));
    const wk = weekKeyFromIssue(issue);
    weekAmounts.set(wk, roundCurrencyEUR((weekAmounts.get(wk) ?? 0) + t));
    if (weekDayKeys) {
      const day = issue.slice(0, 10);
      if (dayAmounts.has(day)) {
        dayAmounts.set(day, roundCurrencyEUR((dayAmounts.get(day) ?? 0) + t));
      }
    }
    if (monthWeekKeys && esteMesWeekAmounts.has(wk)) {
      esteMesWeekAmounts.set(wk, roundCurrencyEUR((esteMesWeekAmounts.get(wk) ?? 0) + t));
    }
  }

  let timeSeries: TimePoint[] = [];
  if (from === to) {
    /** Un solo día: una barra con etiqueta de día (no confundir con mes/semana completa). */
    const mk = from.slice(0, 7);
    const amt = monthAmounts.get(mk) ?? 0;
    timeSeries =
      amt > 0
        ? [{ key: `day:${from}`, label: labelSingleDay(from, todayYmd), amount: amt }]
        : [];
  } else if (weekDayKeys) {
    timeSeries = weekDayKeys.map((d) => ({
      key: `day:${d}`,
      label: labelWeekDay(d, todayYmd),
      amount: dayAmounts.get(d) ?? 0,
    }));
  } else if (monthWeekKeys) {
    timeSeries = monthWeekKeys.map((wk) => ({
      key: `w:${wk}`,
      label: labelWeek(wk),
      amount: esteMesWeekAmounts.get(wk) ?? 0,
    }));
  } else if (granularity === "month") {
    const keys = [...monthAmounts.keys()].sort();
    timeSeries = keys
      .filter((k) => (monthAmounts.get(k) ?? 0) > 0)
      .map((k) => ({
        key: k,
        label: labelMonth(k),
        amount: monthAmounts.get(k) ?? 0,
      }));
  } else {
    const keys = [...weekAmounts.keys()].sort();
    timeSeries = keys
      .filter((k) => (weekAmounts.get(k) ?? 0) > 0)
      .map((k) => ({
        key: k,
        label: labelWeek(k),
        amount: weekAmounts.get(k) ?? 0,
      }));
  }

  /** Donut: importes en situación dentro del periodo (facturas emitidas en rango) */
  let dPaid = 0;
  let dPending = 0;
  let dOverdue = 0;
  for (const inv of invoices) {
    const st = inv.status as string;
    if (st === "draft" || st === "cancelled") continue;
    const issue = inv.issue_date as string | null;
    if (!issue || !inYmdRange(issue, from, to)) continue;
    if (!invMatchesClient(inv)) continue;
    const total = roundCurrencyEUR(Number(inv.total));
    const paid = roundCurrencyEUR(paidByInvoice.get(inv.id as string) ?? 0);
    const eff = effectiveInvoiceStatus({
      status: st,
      total: Number(inv.total),
      paidSum: paid,
      issue_date: inv.issue_date as string | null,
      due_date: inv.due_date as string | null,
      todayYmd,
    });
    if (eff === "paid") {
      dPaid = roundCurrencyEUR(dPaid + total);
    } else if (eff === "overdue") {
      dOverdue = roundCurrencyEUR(dOverdue + Math.max(0, total - paid));
    } else if (eff === "issued" || eff === "partial") {
      dPending = roundCurrencyEUR(dPending + Math.max(0, total - paid));
    }
  }

  const statusDonut: DonutSegment[] = [
    { id: "paid", label: "Pagadas", amount: dPaid, color: "#10b981" },
    { id: "pend", label: "Pendientes", amount: dPending, color: "#f59e0b" },
    { id: "due", label: "Vencidas", amount: dOverdue, color: "#ef4444" },
  ];

  /** Client ranking */
  const byClient = new Map<
    string,
    { invoiced: number; collected: number; pending: number }
  >();

  for (const inv of invoices) {
    const cid = inv.client_id as string;
    if (!byClient.has(cid)) {
      byClient.set(cid, { invoiced: 0, collected: 0, pending: 0 });
    }
  }
  for (const c of clientsList) {
    if (!byClient.has(c.id as string)) byClient.set(c.id as string, { invoiced: 0, collected: 0, pending: 0 });
  }

  for (const inv of invoices) {
    const cid = inv.client_id as string;
    const row = byClient.get(cid)!;
    if (invIssuedInPeriod(inv)) {
      row.invoiced = roundCurrencyEUR(row.invoiced + Number(inv.total));
    }
  }

  for (const inv of invoices) {
    if (!invIssuedInPeriod(inv)) continue;
    const cid = inv.client_id as string;
    const row = byClient.get(cid);
    if (!row) continue;
    const paid = roundCurrencyEUR(paidByInvoice.get(inv.id as string) ?? 0);
    row.collected = roundCurrencyEUR(row.collected + paid);
  }

  for (const inv of invoices) {
    const st = inv.status as string;
    if (st === "cancelled" || st === "draft" || st === "paid") continue;
    const cid = inv.client_id as string;
    if (clientId && cid !== clientId) continue;
    const total = roundCurrencyEUR(Number(inv.total));
    const paid = roundCurrencyEUR(paidByInvoice.get(inv.id as string) ?? 0);
    const out = roundCurrencyEUR(Math.max(0, total - paid));
    const row = byClient.get(cid);
    const eff = effectiveInvoiceStatus({
      status: st,
      total: Number(inv.total),
      paidSum: paid,
      issue_date: inv.issue_date as string | null,
      due_date: inv.due_date as string | null,
      todayYmd,
    });
    if (row && (eff === "issued" || eff === "partial" || eff === "overdue")) {
      row.pending = roundCurrencyEUR(row.pending + out);
    }
  }

  const clientsRanking: ClientRankingRow[] = [...byClient.entries()]
    .map(([clientId, v]) => ({
      clientId,
      name: clientName.get(clientId) ?? "—",
      invoiced: v.invoiced,
      collected: v.collected,
      pending: v.pending,
    }))
    .filter((r) => r.invoiced > 0 || r.collected > 0 || r.pending > 0)
    .sort((a, b) => b.invoiced - a.invoiced)
    .slice(0, 25);

  /** Top products */
  const prodAgg = new Map<string, { name: string; quantity: number; revenue: number }>();
  for (const line of lines) {
    const inv = invoiceById.get(line.invoice_id as string);
    if (!inv) continue;
    const st = inv.status as string;
    if (st === "draft" || st === "cancelled") continue;
    const issue = inv.issue_date as string | null;
    if (!issue || !inYmdRange(issue, from, to)) continue;
    if (!invMatchesClient(inv)) continue;

    const pid = line.product_id as string | null;
    const key = pid ? `p:${pid}` : `d:${(line.description as string).slice(0, 80)}`;
    const nm = pid ? productName.get(pid) ?? "Producto" : (line.description as string) || "Línea libre";
    const qty = Number(line.quantity);
    const rev = roundCurrencyEUR(Number(line.line_total));
    const prev = prodAgg.get(key);
    if (prev) {
      prev.quantity = prev.quantity + qty;
      prev.revenue = roundCurrencyEUR(prev.revenue + rev);
    } else {
      prodAgg.set(key, { name: nm, quantity: qty, revenue: rev });
    }
  }

  const topProducts: ProductTopRow[] = [...prodAgg.entries()]
    .map(([key, v]) => ({
      key,
      name: v.name,
      quantity: v.quantity,
      revenue: v.revenue,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 15);

  /** AI hints */
  let bestPeriodLabel = "—";
  let bestPeriodAmount = 0;
  for (const p of timeSeries) {
    if (p.amount > bestPeriodAmount) {
      bestPeriodAmount = p.amount;
      bestPeriodLabel = p.label;
    }
  }

  let topDebtClientName = "—";
  let topDebtAmount = 0;
  for (const r of clientsRanking) {
    if (r.pending > topDebtAmount) {
      topDebtAmount = r.pending;
      topDebtClientName = r.name;
    }
  }

  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const qFrom = ymd(threeMonthsAgo);
  let lastQuarterBilled = 0;
  for (const inv of invoices) {
    const st = inv.status as string;
    if (st === "draft" || st === "cancelled") continue;
    const issue = inv.issue_date as string | null;
    if (!issue || issue.slice(0, 10) < qFrom) continue;
    if (!invMatchesClient(inv)) continue;
    lastQuarterBilled = roundCurrencyEUR(lastQuarterBilled + Number(inv.total));
  }

  return {
    filters,
    metrics: {
      billedInPeriod,
      collectedInPeriod,
      pendingNow,
      overdueNow,
      invoiceCountInPeriod,
      billedThisCalendarMonth,
      billedPreviousCalendarMonth,
      pctChangeVsPreviousMonth,
    },
    timeSeries,
    clientsRanking,
    statusDonut,
    topProducts,
    aiHints: {
      bestPeriodLabel,
      bestPeriodAmount,
      topDebtClientName,
      topDebtAmount,
      lastQuarterBilled,
    },
  };
}

export type InvoiceExportRow = {
  numberLabel: string;
  clientName: string;
  issueDate: string;
  total: number;
  collected: number;
  pending: number;
  statusLabel: string;
};

const STATUS_ES: Record<string, string> = {
  draft: "Borrador",
  issued: "Emitida",
  partial: "Parcialmente pagada",
  paid: "Pagada",
  cancelled: "Anulada",
  overdue: "Vencida",
};

export async function getInvoiceExportRows(
  sp: Record<string, string | string[] | undefined>,
): Promise<InvoiceExportRow[]> {
  const filters = resolveReportsFilters(sp);
  const { from, to, clientId } = filters;

  const supabase = createAdminClient();
  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, client_id, total, status, issue_date, due_date, series, year, number, clients ( name )");
  const { data: payments } = await supabase.from("payments").select("invoice_id, amount");

  if (!invoices?.length) return [];

  const paidByInvoice = new Map<string, number>();
  for (const p of payments ?? []) {
    const id = p.invoice_id as string;
    paidByInvoice.set(id, roundCurrencyEUR((paidByInvoice.get(id) ?? 0) + Number(p.amount)));
  }

  const rows: InvoiceExportRow[] = [];
  for (const inv of invoices) {
    const st = inv.status as string;
    if (st === "draft") continue;
    const issue = inv.issue_date as string | null;
    if (!issue || !inYmdRange(issue, from, to)) continue;
    if (clientId && (inv.client_id as string) !== clientId) continue;

    const cr = inv.clients as { name: string } | { name: string }[] | null;
    const client = Array.isArray(cr) ? cr[0] : cr;
    const num =
      inv.number != null
        ? `${inv.series}-${inv.year}/${inv.number}`
        : `${inv.series}-${inv.year}/borrador`;
    const total = roundCurrencyEUR(Number(inv.total));
    const collected = roundCurrencyEUR(paidByInvoice.get(inv.id as string) ?? 0);
    const pending =
      st === "paid" ? 0 : roundCurrencyEUR(Math.max(0, total - collected));

    const eff = effectiveInvoiceStatus({
      status: st,
      total: Number(inv.total),
      paidSum: collected,
      issue_date: inv.issue_date as string | null,
      due_date: inv.due_date as string | null,
    });

    rows.push({
      numberLabel: num,
      clientName: client?.name ?? "—",
      issueDate: issue.slice(0, 10),
      total,
      collected,
      pending,
      statusLabel: STATUS_ES[eff] ?? eff,
    });
  }

  rows.sort((a, b) => (a.issueDate < b.issueDate ? 1 : -1));
  return rows;
}
