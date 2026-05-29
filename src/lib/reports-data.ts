import "server-only";

import { effectiveInvoiceStatus, overdueReferenceYmd, todayLocalYMD } from "@/lib/invoice-status";
import { formatYMD } from "@/lib/invoice-list-url";
import { roundCurrencyEUR } from "@/lib/money";
import { rangeLast12Months, rangeThisMonth, rangeThisWeek } from "@/lib/informes-range-presets";
import type { ReportsResolvedFilters } from "@/lib/reports-query";
import { createClient } from "@/lib/supabase/server";

export type { ReportsResolvedFilters } from "@/lib/reports-query";
export { buildReportsQueryString } from "@/lib/reports-query";

export type TimePoint = { key: string; label: string; amount: number; collected: number };

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

/** Antigüedad de la deuda viva (importe pendiente por tramos de días vencidos). */
export type AgingBucket = { id: string; label: string; amount: number };

/**
 * Valor de un KPI con su comparación al periodo inmediatamente anterior
 * (mismo número de días justo antes de `from`).
 * `changePct` es null cuando no hay base previa con la que comparar.
 */
export type KpiWithDelta = {
  value: number;
  previous: number;
  changePct: number | null;
};

export type ReportsData = {
  filters: ReportsResolvedFilters;
  /** true => la cuenta aún no tiene facturas reales; se muestran datos de ejemplo. */
  isDemo: boolean;
  metrics: {
    billedInPeriod: number;
    collectedInPeriod: number;
    pendingNow: number;
    overdueNow: number;
    invoiceCountInPeriod: number;
    /** KPIs analíticos del periodo con delta vs periodo anterior. */
    billed: KpiWithDelta;
    /** Tasa de cobro: cobrado / facturado (0–100). */
    collectionRate: KpiWithDelta;
    /** Días medios de cobro (DSO) ponderados por importe. */
    dsoDays: KpiWithDelta;
    /** Ticket medio = facturado / nº facturas. */
    avgTicket: KpiWithDelta;
    /** Facturación mes calendario actual vs anterior (global). */
    billedThisCalendarMonth: number;
    billedPreviousCalendarMonth: number;
    pctChangeVsPreviousMonth: number | null;
  };
  timeSeries: TimePoint[];
  aging: AgingBucket[];
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

/** Nº de días que abarca [from, to] (inclusivo). */
function periodLengthDays(from: string, to: string): number {
  const ms = parseYmd(to).getTime() - parseYmd(from).getTime();
  return Math.max(1, Math.round(ms / 86_400_000) + 1);
}

/** Periodo inmediatamente anterior, de la misma longitud, justo antes de `from`. */
function previousPeriod(from: string, to: string): { from: string; to: string } {
  const len = periodLengthDays(from, to);
  const prevTo = parseYmd(from);
  prevTo.setDate(prevTo.getDate() - 1);
  const prevFrom = new Date(prevTo);
  prevFrom.setDate(prevFrom.getDate() - (len - 1));
  return { from: ymd(prevFrom), to: ymd(prevTo) };
}

/** Variación porcentual; null si no hay base previa con la que comparar. */
function pctChange(current: number, previous: number): number | null {
  if (previous <= 0) return current > 0 ? 100 : null;
  return roundCurrencyEUR(((current - previous) / previous) * 100);
}

function daysBetween(fromYmd: string, toYmd: string): number {
  const ms = parseYmd(toYmd).getTime() - parseYmd(fromYmd).getTime();
  return Math.round(ms / 86_400_000);
}

type InvoiceRow = {
  id: string;
  client_id: string;
  total: number;
  status: string;
  issue_date: string | null;
};

type PaymentRow = { amount: number; paid_at: string | null };

type PeriodAggregates = {
  billed: number;
  collected: number;
  count: number;
  /** Días medios de cobro ponderados por importe (0 si no hay cobros con fecha). */
  dso: number;
};

/** Agregados de un periodo arbitrario, reutilizable para periodo actual y anterior. */
function computePeriodAggregates(
  invoices: InvoiceRow[],
  paymentsByInvoice: Map<string, PaymentRow[]>,
  from: string,
  to: string,
  clientId: string | null,
): PeriodAggregates {
  let billed = 0;
  let collected = 0;
  let count = 0;
  let dsoWeighted = 0;
  let dsoWeight = 0;

  for (const inv of invoices) {
    const st = inv.status;
    if (st === "draft" || st === "cancelled") continue;
    if (clientId && inv.client_id !== clientId) continue;
    if (!inYmdRange(inv.issue_date, from, to)) continue;

    billed = roundCurrencyEUR(billed + Number(inv.total));
    count += 1;

    const issue = (inv.issue_date ?? "").slice(0, 10);
    const pays = paymentsByInvoice.get(inv.id) ?? [];
    for (const p of pays) {
      const amt = Number(p.amount);
      collected = roundCurrencyEUR(collected + amt);
      if (p.paid_at && issue) {
        const d = Math.max(0, daysBetween(issue, p.paid_at.slice(0, 10)));
        dsoWeighted += d * amt;
        dsoWeight += amt;
      }
    }
  }

  const dso = dsoWeight > 0 ? Math.round(dsoWeighted / dsoWeight) : 0;
  return { billed, collected, count, dso };
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

  const supabase = await createClient();

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
  const paymentsByInvoice = new Map<string, PaymentRow[]>();
  for (const p of payments) {
    const id = p.invoice_id as string;
    paidByInvoice.set(id, roundCurrencyEUR((paidByInvoice.get(id) ?? 0) + Number(p.amount)));
    const list = paymentsByInvoice.get(id) ?? [];
    list.push({ amount: Number(p.amount), paid_at: (p.paid_at as string | null) ?? null });
    paymentsByInvoice.set(id, list);
  }

  /** ¿La cuenta tiene alguna factura real (no borrador/anulada)? Decide demo vs datos reales. */
  const hasAnyInvoices = invoices.some(
    (inv) => inv.status !== "draft" && inv.status !== "cancelled",
  );

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
  /** Cobrado por bucket (mismas claves que los *Amounts) para la serie Facturado vs Cobrado. */
  const monthCollected = new Map<string, number>();
  const weekCollected = new Map<string, number>();
  const dayCollected = new Map<string, number>();
  const esteMesWeekCollected = new Map<string, number>();
  if (weekDayKeys) {
    for (const dk of weekDayKeys) {
      dayAmounts.set(dk, 0);
      dayCollected.set(dk, 0);
    }
  }
  if (monthWeekKeys) {
    for (const wk of monthWeekKeys) {
      esteMesWeekAmounts.set(wk, 0);
      esteMesWeekCollected.set(wk, 0);
    }
  }

  for (const inv of invoices) {
    const st = inv.status as string;
    if (st === "draft" || st === "cancelled") continue;
    const issue = inv.issue_date as string | null;
    if (!issue || !inYmdRange(issue, from, to)) continue;
    if (!invMatchesClient(inv)) continue;
    const t = roundCurrencyEUR(Number(inv.total));
    const c = roundCurrencyEUR(paidByInvoice.get(inv.id as string) ?? 0);
    const mk = issue.slice(0, 7);
    monthAmounts.set(mk, roundCurrencyEUR((monthAmounts.get(mk) ?? 0) + t));
    monthCollected.set(mk, roundCurrencyEUR((monthCollected.get(mk) ?? 0) + c));
    const wk = weekKeyFromIssue(issue);
    weekAmounts.set(wk, roundCurrencyEUR((weekAmounts.get(wk) ?? 0) + t));
    weekCollected.set(wk, roundCurrencyEUR((weekCollected.get(wk) ?? 0) + c));
    if (weekDayKeys) {
      const day = issue.slice(0, 10);
      if (dayAmounts.has(day)) {
        dayAmounts.set(day, roundCurrencyEUR((dayAmounts.get(day) ?? 0) + t));
        dayCollected.set(day, roundCurrencyEUR((dayCollected.get(day) ?? 0) + c));
      }
    }
    if (monthWeekKeys && esteMesWeekAmounts.has(wk)) {
      esteMesWeekAmounts.set(wk, roundCurrencyEUR((esteMesWeekAmounts.get(wk) ?? 0) + t));
      esteMesWeekCollected.set(wk, roundCurrencyEUR((esteMesWeekCollected.get(wk) ?? 0) + c));
    }
  }

  let timeSeries: TimePoint[] = [];
  if (from === to) {
    /** Un solo día: una barra con etiqueta de día (no confundir con mes/semana completa). */
    const mk = from.slice(0, 7);
    const amt = monthAmounts.get(mk) ?? 0;
    timeSeries =
      amt > 0
        ? [
            {
              key: `day:${from}`,
              label: labelSingleDay(from, todayYmd),
              amount: amt,
              collected: monthCollected.get(mk) ?? 0,
            },
          ]
        : [];
  } else if (weekDayKeys) {
    timeSeries = weekDayKeys.map((d) => ({
      key: `day:${d}`,
      label: labelWeekDay(d, todayYmd),
      amount: dayAmounts.get(d) ?? 0,
      collected: dayCollected.get(d) ?? 0,
    }));
  } else if (monthWeekKeys) {
    timeSeries = monthWeekKeys.map((wk) => ({
      key: `w:${wk}`,
      label: labelWeek(wk),
      amount: esteMesWeekAmounts.get(wk) ?? 0,
      collected: esteMesWeekCollected.get(wk) ?? 0,
    }));
  } else if (granularity === "month") {
    const keys = [...monthAmounts.keys()].sort();
    timeSeries = keys
      .filter((k) => (monthAmounts.get(k) ?? 0) > 0)
      .map((k) => ({
        key: k,
        label: labelMonth(k),
        amount: monthAmounts.get(k) ?? 0,
        collected: monthCollected.get(k) ?? 0,
      }));
  } else {
    const keys = [...weekAmounts.keys()].sort();
    timeSeries = keys
      .filter((k) => (weekAmounts.get(k) ?? 0) > 0)
      .map((k) => ({
        key: k,
        label: labelWeek(k),
        amount: weekAmounts.get(k) ?? 0,
        collected: weekCollected.get(k) ?? 0,
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

  /** KPIs analíticos del periodo + comparación con el periodo anterior de igual longitud. */
  const invoiceRows: InvoiceRow[] = invoices.map((inv) => ({
    id: inv.id as string,
    client_id: inv.client_id as string,
    total: Number(inv.total),
    status: inv.status as string,
    issue_date: inv.issue_date as string | null,
  }));
  const prev = previousPeriod(from, to);
  const curAgg = computePeriodAggregates(invoiceRows, paymentsByInvoice, from, to, clientId);
  const prevAgg = computePeriodAggregates(invoiceRows, paymentsByInvoice, prev.from, prev.to, clientId);

  const curRate = curAgg.billed > 0 ? roundCurrencyEUR((curAgg.collected / curAgg.billed) * 100) : 0;
  const prevRate = prevAgg.billed > 0 ? roundCurrencyEUR((prevAgg.collected / prevAgg.billed) * 100) : 0;
  const curTicket = curAgg.count > 0 ? roundCurrencyEUR(curAgg.billed / curAgg.count) : 0;
  const prevTicket = prevAgg.count > 0 ? roundCurrencyEUR(prevAgg.billed / prevAgg.count) : 0;

  const billedKpi: KpiWithDelta = {
    value: curAgg.billed,
    previous: prevAgg.billed,
    changePct: pctChange(curAgg.billed, prevAgg.billed),
  };
  const collectionRateKpi: KpiWithDelta = {
    value: curRate,
    previous: prevRate,
    changePct: pctChange(curRate, prevRate),
  };
  const dsoKpi: KpiWithDelta = {
    value: curAgg.dso,
    previous: prevAgg.dso,
    changePct: pctChange(curAgg.dso, prevAgg.dso),
  };
  const avgTicketKpi: KpiWithDelta = {
    value: curTicket,
    previous: prevTicket,
    changePct: pctChange(curTicket, prevTicket),
  };

  /** Aging: importe pendiente vivo (hoy) por antigüedad de días vencidos, respeta filtro de cliente. */
  let aging0 = 0;
  let aging30 = 0;
  let aging60 = 0;
  let aging90 = 0;
  for (const inv of invoices) {
    const st = inv.status as string;
    if (st === "cancelled" || st === "draft" || st === "paid") continue;
    if (!invMatchesClient(inv)) continue;
    const total = roundCurrencyEUR(Number(inv.total));
    const paid = roundCurrencyEUR(paidByInvoice.get(inv.id as string) ?? 0);
    const out = roundCurrencyEUR(Math.max(0, total - paid));
    if (out <= 0) continue;
    const ref = overdueReferenceYmd(inv.issue_date as string | null, inv.due_date as string | null);
    const overdueDays = ref ? Math.max(0, daysBetween(ref, todayYmd)) : 0;
    if (overdueDays <= 30) aging0 = roundCurrencyEUR(aging0 + out);
    else if (overdueDays <= 60) aging30 = roundCurrencyEUR(aging30 + out);
    else if (overdueDays <= 90) aging60 = roundCurrencyEUR(aging60 + out);
    else aging90 = roundCurrencyEUR(aging90 + out);
  }
  const aging: AgingBucket[] = [
    { id: "0-30", label: "0–30 días", amount: aging0 },
    { id: "31-60", label: "31–60 días", amount: aging30 },
    { id: "61-90", label: "61–90 días", amount: aging60 },
    { id: "90+", label: "+90 días", amount: aging90 },
  ];

  if (!hasAnyInvoices) {
    return demoReportsData(filters);
  }

  return {
    filters,
    isDemo: false,
    metrics: {
      billedInPeriod,
      collectedInPeriod,
      pendingNow,
      overdueNow,
      invoiceCountInPeriod,
      billed: billedKpi,
      collectionRate: collectionRateKpi,
      dsoDays: dsoKpi,
      avgTicket: avgTicketKpi,
      billedThisCalendarMonth,
      billedPreviousCalendarMonth,
      pctChangeVsPreviousMonth,
    },
    timeSeries,
    aging,
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

/** Datos de ejemplo para cuentas sin facturas: muestran cómo se verá el informe. */
function demoReportsData(filters: ReportsResolvedFilters): ReportsData {
  const months = ["ene", "feb", "mar", "abr", "may", "jun"];
  const billedSeries = [1850, 2400, 2100, 3200, 2950, 3600];
  const collectedSeries = [1850, 2200, 2100, 2600, 2300, 2400];
  const timeSeries: TimePoint[] = months.map((label, i) => ({
    key: `demo:${i}`,
    label,
    amount: billedSeries[i],
    collected: collectedSeries[i],
  }));
  const billed = billedSeries.reduce((a, b) => a + b, 0);
  const collected = collectedSeries.reduce((a, b) => a + b, 0);

  return {
    filters,
    isDemo: true,
    metrics: {
      billedInPeriod: billed,
      collectedInPeriod: collected,
      pendingNow: 1900,
      overdueNow: 650,
      invoiceCountInPeriod: 18,
      billed: { value: billed, previous: 12800, changePct: 24.5 },
      collectionRate: {
        value: roundCurrencyEUR((collected / billed) * 100),
        previous: 78,
        changePct: 5.1,
      },
      dsoDays: { value: 27, previous: 34, changePct: -20.6 },
      avgTicket: { value: roundCurrencyEUR(billed / 18), previous: 720, changePct: 12.3 },
      billedThisCalendarMonth: 3600,
      billedPreviousCalendarMonth: 2950,
      pctChangeVsPreviousMonth: 22,
    },
    timeSeries,
    aging: [
      { id: "0-30", label: "0–30 días", amount: 1250 },
      { id: "31-60", label: "31–60 días", amount: 430 },
      { id: "61-90", label: "61–90 días", amount: 220 },
      { id: "90+", label: "+90 días", amount: 0 },
    ],
    clientsRanking: [
      { clientId: "demo-1", name: "Estudio Marsal, S.L.", invoiced: 4200, collected: 3800, pending: 400 },
      { clientId: "demo-2", name: "Talleres Nuria", invoiced: 3100, collected: 3100, pending: 0 },
      { clientId: "demo-3", name: "Clínica Vega", invoiced: 2650, collected: 1900, pending: 750 },
      { clientId: "demo-4", name: "Café Central", invoiced: 1450, collected: 1450, pending: 0 },
    ],
    statusDonut: [
      { id: "paid", label: "Pagadas", amount: collected, color: "#10b981" },
      { id: "pend", label: "Pendientes", amount: 1250, color: "#f59e0b" },
      { id: "due", label: "Vencidas", amount: 650, color: "#ef4444" },
    ],
    topProducts: [
      { key: "demo-a", name: "Consultoría (h)", quantity: 64, revenue: 4800 },
      { key: "demo-b", name: "Mantenimiento mensual", quantity: 12, revenue: 3600 },
      { key: "demo-c", name: "Diseño de marca", quantity: 3, revenue: 2400 },
      { key: "demo-d", name: "Soporte premium", quantity: 8, revenue: 1200 },
    ],
    aiHints: {
      bestPeriodLabel: "jun",
      bestPeriodAmount: 3600,
      topDebtClientName: "Clínica Vega",
      topDebtAmount: 750,
      lastQuarterBilled: 9750,
    },
  };
}

export type InvoiceExportSummaryRow = {
  invoiceId: string;
  invoiceNumber: string;
  series: string;
  year: number;
  status: string;
  issueDate: string;
  dueDate: string;
  customerId: string;
  customerName: string;
  customerTaxId: string;
  currency: "EUR";
  subtotalAmount: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  createdAt: string;
};

export type InvoiceExportLineRow = {
  invoiceId: string;
  invoiceNumber: string;
  lineIndex: number;
  itemName: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  lineSubtotal: number;
  lineTax: number;
  lineTotal: number;
};

const STATUS_ES: Record<string, string> = {
  draft: "Borrador",
  issued: "Emitida",
  partial: "Parcialmente pagada",
  paid: "Pagada",
  cancelled: "Anulada",
  overdue: "Vencida",
};

function invoiceNumberLabelForExport(inv: {
  status: string;
  series: string;
  year: number;
  number: number | null;
}): string {
  if (inv.number != null) {
    return `${inv.series}-${inv.year}/${inv.number}`;
  }
  if (inv.status === "draft") {
    return `${inv.series}-${inv.year}/draft`;
  }
  return `${inv.series}-${inv.year}/—`;
}

export async function getInvoiceExportSummaryRows(
  sp: Record<string, string | string[] | undefined>,
): Promise<InvoiceExportSummaryRow[]> {
  const filters = resolveReportsFilters(sp);
  const { from, to, clientId } = filters;

  const supabase = await createClient();
  const { data: invoices } = await supabase
    .from("invoices")
    .select(
      "id, client_id, subtotal, tax_amount, total, status, issue_date, due_date, created_at, series, year, number, clients ( name, tax_id )",
    );
  const { data: payments } = await supabase.from("payments").select("invoice_id, amount");

  if (!invoices?.length) return [];

  const paidByInvoice = new Map<string, number>();
  for (const p of payments ?? []) {
    const id = p.invoice_id as string;
    paidByInvoice.set(id, roundCurrencyEUR((paidByInvoice.get(id) ?? 0) + Number(p.amount)));
  }

  const rows: InvoiceExportSummaryRow[] = [];
  for (const inv of invoices) {
    const st = inv.status as string;
    if (st === "draft") continue;
    const issue = inv.issue_date as string | null;
    if (!issue || !inYmdRange(issue, from, to)) continue;
    if (clientId && (inv.client_id as string) !== clientId) continue;

    const cr = inv.clients as { name: string; tax_id?: string | null } | { name: string; tax_id?: string | null }[] | null;
    const client = Array.isArray(cr) ? cr[0] : cr;
    const num = invoiceNumberLabelForExport({
      status: st,
      series: String(inv.series),
      year: Number(inv.year),
      number: inv.number != null ? Number(inv.number) : null,
    });
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
      invoiceId: String(inv.id),
      invoiceNumber: num,
      series: String(inv.series),
      year: Number(inv.year),
      status: STATUS_ES[eff] ?? eff,
      issueDate: issue.slice(0, 10),
      dueDate: ((inv.due_date as string | null) ?? "").slice(0, 10),
      customerId: String(inv.client_id),
      customerName: client?.name ?? "—",
      customerTaxId: client?.tax_id ?? "",
      currency: "EUR",
      subtotalAmount: roundCurrencyEUR(Number(inv.subtotal ?? 0)),
      taxAmount: roundCurrencyEUR(Number(inv.tax_amount ?? 0)),
      totalAmount: total,
      paidAmount: collected,
      dueAmount: pending,
      createdAt: String(inv.created_at ?? "").slice(0, 19),
    });
  }

  rows.sort((a, b) => (a.issueDate < b.issueDate ? 1 : -1));
  return rows;
}

export async function getInvoiceExportLineRows(
  sp: Record<string, string | string[] | undefined>,
): Promise<InvoiceExportLineRow[]> {
  const filters = resolveReportsFilters(sp);
  const { from, to, clientId } = filters;

  const supabase = await createClient();
  const [invRes, lineRes, prodRes] = await Promise.all([
    supabase
      .from("invoices")
      .select("id, client_id, status, issue_date, series, year, number")
      .neq("status", "draft"),
    supabase
      .from("invoice_lines")
      .select("invoice_id, line_number, product_id, description, quantity, unit_price, tax_rate, line_net, line_tax, line_total"),
    supabase.from("products").select("id, name"),
  ]);

  const invoices = invRes.data ?? [];
  const lines = lineRes.data ?? [];
  const products = prodRes.data ?? [];
  if (invoices.length === 0 || lines.length === 0) return [];

  const productNameById = new Map<string, string>();
  for (const p of products) {
    productNameById.set(String(p.id), String(p.name ?? ""));
  }

  const invoiceById = new Map<string, (typeof invoices)[number]>();
  for (const inv of invoices) {
    const issue = inv.issue_date as string | null;
    if (!issue || !inYmdRange(issue, from, to)) continue;
    if (clientId && String(inv.client_id) !== clientId) continue;
    invoiceById.set(String(inv.id), inv);
  }

  const out: InvoiceExportLineRow[] = [];
  for (const l of lines) {
    const invoiceId = String(l.invoice_id);
    const inv = invoiceById.get(invoiceId);
    if (!inv) continue;

    const invoiceNumber = invoiceNumberLabelForExport({
      status: String(inv.status),
      series: String(inv.series),
      year: Number(inv.year),
      number: inv.number != null ? Number(inv.number) : null,
    });
    const pid = l.product_id != null ? String(l.product_id) : "";
    const itemName = pid ? productNameById.get(pid) ?? "" : "";

    out.push({
      invoiceId,
      invoiceNumber,
      lineIndex: Number(l.line_number ?? 0),
      itemName,
      description: String(l.description ?? ""),
      quantity: Number(l.quantity ?? 0),
      unitPrice: roundCurrencyEUR(Number(l.unit_price ?? 0)),
      taxRate: Number(l.tax_rate ?? 0),
      lineSubtotal: roundCurrencyEUR(Number(l.line_net ?? 0)),
      lineTax: roundCurrencyEUR(Number(l.line_tax ?? 0)),
      lineTotal: roundCurrencyEUR(Number(l.line_total ?? 0)),
    });
  }

  out.sort((a, b) => {
    if (a.invoiceNumber === b.invoiceNumber) return a.lineIndex - b.lineIndex;
    return a.invoiceNumber.localeCompare(b.invoiceNumber, "es");
  });
  return out;
}
