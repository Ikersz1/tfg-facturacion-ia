import "server-only";

import type { AssistantContext, AssistantInvoice } from "@/lib/assistant/context";
import { findClientsByQuery, resolveClient } from "@/lib/assistant/resolve-client";
import type { AssistantLink, ToolName } from "@/lib/assistant/types";
import { buildClientsListUrl } from "@/lib/client-list-url";
import { rangeLast12Months, rangeThisMonth } from "@/lib/informes-range-presets";
import { getPresetDateRange } from "@/lib/invoice-list-url";
import { formatMoneyEUR } from "@/lib/money";

const STATUS_LABEL: Record<string, string> = {
  draft: "Borrador",
  issued: "Emitida",
  partial: "Parcialmente pagada",
  paid: "Pagada",
  overdue: "Vencida",
  cancelled: "Anulada",
};

function statusLabel(st: string): string {
  return STATUS_LABEL[st] ?? st;
}

function clientLink(id: string, name: string): AssistantLink {
  return { label: name, href: `/clients/${id}` };
}

function invoiceLink(id: string, label: string): AssistantLink {
  return { label, href: `/invoices/${id}` };
}

function issuedInvoices(invoices: AssistantInvoice[]): AssistantInvoice[] {
  return invoices.filter((i) => i.status !== "draft" && i.status !== "cancelled");
}

function sortByIssueDesc(a: AssistantInvoice, b: AssistantInvoice): number {
  const da = a.issueDate ?? a.createdAt;
  const db = b.issueDate ?? b.createdAt;
  return db.localeCompare(da);
}

export type ToolResult = {
  payload: Record<string, unknown>;
  links: AssistantLink[];
};

export function executeAssistantTool(
  name: ToolName,
  args: Record<string, unknown>,
  ctx: AssistantContext,
): ToolResult {
  switch (name) {
    case "get_top_debtors":
      return toolGetTopDebtors(ctx, args);
    case "get_top_clients_by_billing":
      return toolGetTopClientsByBilling(ctx, args);
    case "get_client_summary":
      return toolGetClientSummary(ctx, args);
    case "get_client_last_invoice":
      return toolGetClientLastInvoice(ctx, args);
    case "search_invoices":
      return toolSearchInvoices(ctx, args);
    case "get_billing_summary":
      return toolGetBillingSummary(ctx, args);
    case "get_invoices_due_soon":
      return toolGetInvoicesDueSoon(ctx, args);
    case "compare_billing_periods":
      return toolCompareBillingPeriods(ctx, args);
    case "draft_payment_reminder":
      return toolDraftPaymentReminder(ctx, args);
    case "list_clients":
      return toolListClients(ctx, args);
    case "open_filtered_view":
      return toolOpenFilteredView(args);
    default:
      return {
        payload: { error: "Herramienta desconocida." },
        links: [],
      };
  }
}

function toolGetTopDebtors(ctx: AssistantContext, args: Record<string, unknown>): ToolResult {
  const limit = Math.min(10, Math.max(1, Number(args.limit) || 5));
  const byClient = new Map<string, { name: string; pending: number; invoiceCount: number }>();

  for (const inv of ctx.invoices) {
    if (inv.status === "draft" || inv.status === "cancelled" || inv.status === "paid") continue;
    if (inv.outstanding <= 0) continue;
    if (!["issued", "partial", "overdue"].includes(inv.effectiveStatus)) continue;

    const prev = byClient.get(inv.clientId);
    if (prev) {
      prev.pending = Math.round((prev.pending + inv.outstanding) * 100) / 100;
      prev.invoiceCount += 1;
    } else {
      byClient.set(inv.clientId, {
        name: inv.clientName,
        pending: inv.outstanding,
        invoiceCount: 1,
      });
    }
  }

  const rows = [...byClient.entries()]
    .map(([clientId, v]) => ({ clientId, ...v }))
    .sort((a, b) => b.pending - a.pending)
    .slice(0, limit);

  return {
    payload: {
      debtors: rows.map((r) => ({
        clientName: r.name,
        pendingEur: r.pending,
        openInvoiceCount: r.invoiceCount,
      })),
      empty: rows.length === 0,
    },
    links: rows.map((r) => clientLink(r.clientId, r.name)),
  };
}

function toolGetTopClientsByBilling(
  ctx: AssistantContext,
  args: Record<string, unknown>,
): ToolResult {
  const limit = Math.min(10, Math.max(1, Number(args.limit) || 5));
  const byClient = new Map<
    string,
    { name: string; billedEur: number; invoiceCount: number }
  >();

  for (const inv of issuedInvoices(ctx.invoices)) {
    const prev = byClient.get(inv.clientId);
    if (prev) {
      prev.billedEur = Math.round((prev.billedEur + inv.total) * 100) / 100;
      prev.invoiceCount += 1;
    } else {
      byClient.set(inv.clientId, {
        name: inv.clientName,
        billedEur: inv.total,
        invoiceCount: 1,
      });
    }
  }

  const rows = [...byClient.entries()]
    .map(([clientId, v]) => ({ clientId, ...v }))
    .sort((a, b) => b.billedEur - a.billedEur)
    .slice(0, limit);

  return {
    payload: {
      clients: rows.map((r) => ({
        clientName: r.name,
        billedEur: r.billedEur,
        invoiceCount: r.invoiceCount,
      })),
      empty: rows.length === 0,
    },
    links: rows.map((r) => clientLink(r.clientId, r.name)),
  };
}

function toolGetClientSummary(ctx: AssistantContext, args: Record<string, unknown>): ToolResult {
  const resolved = resolveClient(ctx.clients, String(args.clientName ?? ""));
  if (!resolved.ok) {
    if (resolved.reason === "ambiguous") {
      return {
        payload: {
          ambiguous: true,
          candidates: resolved.candidates.map((c) => c.name),
        },
        links: resolved.candidates.map((c) => clientLink(c.id, c.name)),
      };
    }
    return {
      payload: {
        notFound: resolved.reason === "not_found",
        missingName: resolved.reason === "missing",
      },
      links: [],
    };
  }

  const { client } = resolved;
  const mine = ctx.invoices.filter((i) => i.clientId === client.id);
  const issued = issuedInvoices(mine);
  const open = issued.filter(
    (i) => i.outstanding > 0 && ["issued", "partial", "overdue"].includes(i.effectiveStatus),
  );
  const pending = open.reduce((s, i) => s + i.outstanding, 0);

  return {
    payload: {
      clientName: client.name,
      totalInvoices: mine.length,
      issuedCount: issued.length,
      draftCount: mine.filter((i) => i.status === "draft").length,
      openInvoiceCount: open.length,
      pendingEur: Math.round(pending * 100) / 100,
    },
    links: [clientLink(client.id, client.name)],
  };
}

function toolGetClientLastInvoice(ctx: AssistantContext, args: Record<string, unknown>): ToolResult {
  const resolved = resolveClient(ctx.clients, String(args.clientName ?? ""));
  if (!resolved.ok) {
    if (resolved.reason === "ambiguous") {
      return {
        payload: {
          ambiguous: true,
          candidates: resolved.candidates.map((c) => c.name),
        },
        links: resolved.candidates.map((c) => clientLink(c.id, c.name)),
      };
    }
    return {
      payload: { notFound: resolved.reason === "not_found", missingName: resolved.reason === "missing" },
      links: [],
    };
  }

  const { client } = resolved;
  const issued = issuedInvoices(ctx.invoices.filter((i) => i.clientId === client.id)).sort(
    sortByIssueDesc,
  );
  const last = issued[0];

  if (!last) {
    return {
      payload: { clientName: client.name, hasInvoice: false },
      links: [clientLink(client.id, client.name)],
    };
  }

  return {
    payload: {
      clientName: client.name,
      hasInvoice: true,
      invoice: {
        numberLabel: last.numberLabel,
        issueDate: last.issueDate,
        totalEur: last.total,
        status: statusLabel(last.effectiveStatus),
        outstandingEur: last.outstanding,
      },
    },
    links: [clientLink(client.id, client.name), invoiceLink(last.id, last.numberLabel)],
  };
}

function toolSearchInvoices(ctx: AssistantContext, args: Record<string, unknown>): ToolResult {
  let list = [...ctx.invoices];
  const clientName = args.clientName?.toString().trim();
  if (clientName) {
    const resolved = resolveClient(ctx.clients, clientName);
    if (!resolved.ok) {
      return {
        payload: {
          clientError: resolved.reason,
          candidates:
            resolved.reason === "ambiguous"
              ? resolved.candidates.map((c) => c.name)
              : undefined,
        },
        links:
          resolved.reason === "ambiguous"
            ? resolved.candidates.map((c) => clientLink(c.id, c.name))
            : [],
      };
    }
    list = list.filter((i) => i.clientId === resolved.client.id);
  }

  const statusFilter = args.status?.toString().trim().toLowerCase();
  if (statusFilter) {
    list = list.filter((i) => i.effectiveStatus === statusFilter || i.status === statusFilter);
  }

  const limit = Math.min(15, Math.max(1, Number(args.limit) || 8));
  list.sort(sortByIssueDesc);
  const slice = list.slice(0, limit);

  return {
    payload: {
      count: slice.length,
      invoices: slice.map((i) => ({
        numberLabel: i.numberLabel,
        clientName: i.clientName,
        issueDate: i.issueDate,
        totalEur: i.total,
        status: statusLabel(i.effectiveStatus),
        outstandingEur: i.outstanding > 0 ? i.outstanding : undefined,
      })),
    },
    links: slice.map((i) => invoiceLink(i.id, i.numberLabel)),
  };
}

function toolGetBillingSummary(ctx: AssistantContext, args: Record<string, unknown>): ToolResult {
  const period = (args.period?.toString() || "last12") as string;
  let from: string;
  let to: string;
  let periodLabel: string;

  if (period === "this_month") {
    const r = rangeThisMonth();
    from = r.from;
    to = r.to;
    periodLabel = "este mes";
  } else if (period === "this_quarter") {
    const now = new Date();
    const qStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    const qEnd = new Date(qStart.getFullYear(), qStart.getMonth() + 3, 0);
    from = qStart.toISOString().slice(0, 10);
    to = qEnd.toISOString().slice(0, 10);
    periodLabel = "este trimestre";
  } else {
    const r = rangeLast12Months();
    from = r.from;
    to = r.to;
    periodLabel = "últimos 12 meses";
  }

  let billed = 0;
  let collected = 0;
  let count = 0;
  let pendingNow = 0;
  let overdueNow = 0;

  for (const inv of ctx.invoices) {
    if (inv.status === "draft" || inv.status === "cancelled") continue;

    const issue = inv.issueDate;
    if (issue && issue >= from && issue <= to) {
      billed += inv.total;
      collected += inv.paidSum;
      count += 1;
    }

    if (inv.outstanding > 0 && ["issued", "partial", "overdue"].includes(inv.effectiveStatus)) {
      pendingNow += inv.outstanding;
      if (inv.effectiveStatus === "overdue") overdueNow += inv.outstanding;
    }
  }

  return {
    payload: {
      periodLabel,
      from,
      to,
      billedEur: Math.round(billed * 100) / 100,
      collectedEur: Math.round(collected * 100) / 100,
      invoiceCount: count,
      pendingNowEur: Math.round(pendingNow * 100) / 100,
      overdueNowEur: Math.round(overdueNow * 100) / 100,
    },
    links: [{ label: "Ver informes", href: "/informes" }],
  };
}

function addDaysYmd(ymd: string, days: number): string {
  const d = new Date(`${ymd}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function toolGetInvoicesDueSoon(ctx: AssistantContext, args: Record<string, unknown>): ToolResult {
  const days = Math.min(30, Math.max(1, Number(args.days) || 7));
  const limit = Math.min(15, Math.max(1, Number(args.limit) || 10));
  const until = addDaysYmd(ctx.todayYmd, days);

  const open = ctx.invoices
    .filter(
      (inv) =>
        inv.outstanding > 0 &&
        ["issued", "partial", "overdue"].includes(inv.effectiveStatus) &&
        inv.dueDate &&
        inv.dueDate <= until,
    )
    .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""))
    .slice(0, limit);

  const overdueCount = open.filter((i) => i.effectiveStatus === "overdue").length;

  return {
    payload: {
      days,
      until,
      overdueCount,
      count: open.length,
      invoices: open.map((i) => ({
        numberLabel: i.numberLabel,
        clientName: i.clientName,
        dueDate: i.dueDate,
        outstandingEur: i.outstanding,
        status: statusLabel(i.effectiveStatus),
        isOverdue: i.effectiveStatus === "overdue",
      })),
      empty: open.length === 0,
    },
    links: open.map((i) => invoiceLink(i.id, i.numberLabel)),
  };
}

function sumBilledInRange(invoices: AssistantInvoice[], from: string, to: string): number {
  let sum = 0;
  for (const inv of issuedInvoices(invoices)) {
    const issue = inv.issueDate;
    if (issue && issue >= from && issue <= to) {
      sum += inv.total;
    }
  }
  return Math.round(sum * 100) / 100;
}

function toolCompareBillingPeriods(ctx: AssistantContext, args: Record<string, unknown>): ToolResult {
  const mode = args.mode?.toString() === "last_month_vs_prior" ? "last_month_vs_prior" : "month_over_month";
  let currentLabel: string;
  let previousLabel: string;
  let currentFrom: string;
  let currentTo: string;
  let previousFrom: string;
  let previousTo: string;

  if (mode === "last_month_vs_prior") {
    const last = getPresetDateRange("last_month");
    const priorStart = new Date(`${last.from}T12:00:00`);
    priorStart.setMonth(priorStart.getMonth() - 1);
    const priorEnd = new Date(priorStart.getFullYear(), priorStart.getMonth() + 1, 0);
    currentFrom = last.from;
    currentTo = last.to;
    previousFrom = priorStart.toISOString().slice(0, 10);
    previousTo = priorEnd.toISOString().slice(0, 10);
    currentLabel = "mes pasado";
    previousLabel = "mes anterior al pasado";
  } else {
    const thisM = getPresetDateRange("this_month");
    const lastM = getPresetDateRange("last_month");
    currentFrom = thisM.from;
    currentTo = thisM.to;
    previousFrom = lastM.from;
    previousTo = lastM.to;
    currentLabel = "este mes";
    previousLabel = "mes pasado";
  }

  const currentBilled = sumBilledInRange(ctx.invoices, currentFrom, currentTo);
  const previousBilled = sumBilledInRange(ctx.invoices, previousFrom, previousTo);
  const delta = Math.round((currentBilled - previousBilled) * 100) / 100;
  const pct =
    previousBilled > 0
      ? Math.round(((currentBilled - previousBilled) / previousBilled) * 1000) / 10
      : null;

  return {
    payload: {
      currentLabel,
      previousLabel,
      currentFrom,
      currentTo,
      previousFrom,
      previousTo,
      currentBilledEur: currentBilled,
      previousBilledEur: previousBilled,
      deltaEur: delta,
      deltaPercent: pct,
    },
    links: [{ label: "Ver informes", href: "/informes" }],
  };
}

function toolDraftPaymentReminder(ctx: AssistantContext, args: Record<string, unknown>): ToolResult {
  const resolved = resolveClient(ctx.clients, String(args.clientName ?? ""));
  if (!resolved.ok) {
    if (resolved.reason === "ambiguous") {
      return {
        payload: {
          ambiguous: true,
          candidates: resolved.candidates.map((c) => c.name),
        },
        links: resolved.candidates.map((c) => clientLink(c.id, c.name)),
      };
    }
    return {
      payload: {
        notFound: resolved.reason === "not_found",
        missingName: resolved.reason === "missing",
      },
      links: [],
    };
  }

  const { client } = resolved;
  const open = issuedInvoices(ctx.invoices.filter((i) => i.clientId === client.id)).filter(
    (i) => i.outstanding > 0 && ["issued", "partial", "overdue"].includes(i.effectiveStatus),
  );
  const pending = open.reduce((s, i) => s + i.outstanding, 0);
  const refs = open
    .slice(0, 5)
    .map((i) => i.numberLabel)
    .join(", ");

  if (open.length === 0) {
    return {
      payload: {
        clientName: client.name,
        hasDebt: false,
      },
      links: [clientLink(client.id, client.name)],
    };
  }

  const reminderText = `Hola ${client.name},

Le escribimos para recordarle que tiene un importe pendiente de ${formatMoneyEUR(pending)} en ${open.length} factura(s)${refs ? ` (${refs}${open.length > 5 ? ", …" : ""})` : ""}.

Rogamos proceda al pago a la mayor brevedad posible. Si ya ha realizado el abono, ignore este mensaje.

Gracias.`;

  return {
    payload: {
      clientName: client.name,
      hasDebt: true,
      pendingEur: Math.round(pending * 100) / 100,
      openInvoiceCount: open.length,
      reminderText,
    },
    links: [clientLink(client.id, client.name)],
  };
}

function toolListClients(ctx: AssistantContext, args: Record<string, unknown>): ToolResult {
  const countOnly = args.countOnly === true || args.countOnly === "true";
  const search = args.search?.toString().trim();
  const limit = Math.min(20, Math.max(1, Number(args.limit) || 10));

  if (countOnly) {
    return {
      payload: { countOnly: true, totalClients: ctx.clients.length },
      links: [{ label: "Ver clientes", href: "/clients" }],
    };
  }

  let list = ctx.clients;
  if (search) {
    list = findClientsByQuery(ctx.clients, search, limit);
  } else {
    list = list.slice(0, limit);
  }

  const withCounts = list.map((c) => {
    const invs = ctx.invoices.filter((i) => i.clientId === c.id);
    return {
      clientName: c.name,
      invoiceCount: invs.length,
    };
  });

  return {
    payload: { clients: withCounts, totalClients: ctx.clients.length },
    links: list.map((c) => clientLink(c.id, c.name)),
  };
}

function toolOpenFilteredView(args: Record<string, unknown>): ToolResult {
  const view = String(args.view ?? "invoices");
  const status = args.status?.toString().trim().toLowerCase();

  if (view === "clients") {
    const search = args.search?.toString().trim();
    const kindRaw = args.kind?.toString().trim().toLowerCase();
    const kind =
      kindRaw === "individual" || kindRaw === "company" ? kindRaw : undefined;
    const href = buildClientsListUrl({
      ...(search ? { q: search } : {}),
      ...(kind ? { kind } : {}),
    });
    const label = search
      ? `Abrir clientes: «${search}»`
      : kind === "individual"
        ? "Abrir clientes particulares"
        : kind === "company"
          ? "Abrir clientes empresa"
          : "Abrir listado de clientes";
    return {
      payload: { ok: true, view: "clients", search: search ?? null, kind: kind ?? null, href, label },
      links: [{ label, href }],
    };
  }

  if (view !== "invoices") {
    return {
      payload: { error: "Vista no reconocida." },
      links: [{ label: "Ver facturas", href: "/invoices" }],
    };
  }

  let href = "/invoices";
  let label = "Ver facturas";

  if (status === "overdue") {
    href = "/invoices?status=overdue";
    label = "Abrir facturas vencidas";
  } else if (status === "pending") {
    href = "/invoices?status=issued";
    label = "Abrir facturas pendientes";
  } else if (status === "partial") {
    href = "/invoices?status=partial";
    label = "Abrir facturas parciales";
  } else if (status === "draft") {
    href = "/invoices?status=draft";
    label = "Abrir borradores";
  } else if (status === "paid") {
    href = "/invoices?status=paid";
    label = "Abrir facturas pagadas";
  }

  const clientId = args.client_id?.toString().trim();
  if (clientId) {
    const u = new URL(href, "http://local");
    u.searchParams.set("client_id", clientId);
    href = `${u.pathname}${u.search}`;
    label = "Abrir facturas del cliente";
  }

  return {
    payload: {
      ok: true,
      view: "invoices",
      status: status ?? null,
      href,
      label,
    },
    links: [{ label, href }],
  };
}

/** Respuesta en español sin enviar datos al LLM (modo sin API o fallback). */
export function formatToolResultAsText(name: ToolName, result: ToolResult): string {
  const p = result.payload;

  if (p.error) return String(p.error);

  switch (name) {
    case "get_top_debtors": {
      if (p.empty) return "No tienes clientes con deuda pendiente ahora mismo.";
      const rows = p.debtors as { clientName: string; pendingEur: number; openInvoiceCount: number }[];
      const lines = rows.map(
        (r, i) =>
          `${i + 1}. ${r.clientName}: ${formatMoneyEUR(r.pendingEur)} (${r.openInvoiceCount} factura(s) abiertas)`,
      );
      return `Clientes con más pendiente de cobro (morosidad):\n\n${lines.join("\n")}`;
    }
    case "get_top_clients_by_billing": {
      if (p.empty) {
        return "Aún no hay facturación emitida por cliente para comparar.";
      }
      const rows = p.clients as {
        clientName: string;
        billedEur: number;
        invoiceCount: number;
      }[];
      const lines = rows.map(
        (r, i) =>
          `${i + 1}. ${r.clientName}: ${formatMoneyEUR(r.billedEur)} facturados (${r.invoiceCount} factura(s) emitidas)`,
      );
      return `Clientes con más facturación acumulada:\n\n${lines.join("\n")}`;
    }
    case "get_client_summary": {
      if (p.ambiguous) {
        const names = (p.candidates as string[]).join("», «");
        return `Hay varios clientes parecidos: «${names}». Indica el nombre completo.`;
      }
      if (p.missingName) return "Indica el nombre del cliente en la pregunta.";
      if (p.notFound) return "No encuentro ningún cliente con ese nombre.";
      return `${p.clientName}: ${p.totalInvoices} factura(s) en total (${p.issuedCount} emitidas, ${p.draftCount} borradores). Pendiente de cobro: ${formatMoneyEUR(p.pendingEur as number)} en ${p.openInvoiceCount} factura(s) abiertas.`;
    }
    case "get_client_last_invoice": {
      if (p.ambiguous) {
        const names = (p.candidates as string[]).join("», «");
        return `Hay varios clientes parecidos: «${names}».`;
      }
      if (p.missingName) return "Indica el nombre del cliente.";
      if (p.notFound) return "No encuentro ese cliente.";
      if (!p.hasInvoice) return `${p.clientName} no tiene facturas emitidas todavía.`;
      const inv = p.invoice as {
        numberLabel: string;
        issueDate: string | null;
        totalEur: number;
        status: string;
        outstandingEur: number;
      };
      const date = inv.issueDate ? ` del ${inv.issueDate}` : "";
      const pend =
        inv.outstandingEur > 0
          ? ` Pendiente: ${formatMoneyEUR(inv.outstandingEur)}.`
          : "";
      return `La última factura emitida de ${p.clientName} es ${inv.numberLabel}${date}: ${formatMoneyEUR(inv.totalEur)}, estado ${inv.status}.${pend}`;
    }
    case "search_invoices": {
      if (p.clientError === "ambiguous") {
        return `Varios clientes coinciden: «${(p.candidates as string[]).join("», «")}».`;
      }
      if (p.clientError === "not_found") return "No encuentro ese cliente.";
      const rows = p.invoices as {
        numberLabel: string;
        clientName: string;
        issueDate: string | null;
        totalEur: number;
        status: string;
        outstandingEur?: number;
      }[];
      if (rows.length === 0) return "No hay facturas que coincidan con ese criterio.";
      const lines = rows.map((r) => {
        const d = r.issueDate ?? "sin fecha";
        const pend = r.outstandingEur ? ` · pend. ${formatMoneyEUR(r.outstandingEur)}` : "";
        return `· ${r.numberLabel} (${r.clientName}) — ${d} — ${formatMoneyEUR(r.totalEur)} — ${r.status}${pend}`;
      });
      return `Facturas encontradas (${rows.length}):\n\n${lines.join("\n")}`;
    }
    case "get_billing_summary": {
      return `Resumen (${p.periodLabel}, ${p.from} → ${p.to}): facturado ${formatMoneyEUR(p.billedEur as number)} en ${p.invoiceCount} factura(s), cobrado ${formatMoneyEUR(p.collectedEur as number)}. Ahora mismo pendiente ${formatMoneyEUR(p.pendingNowEur as number)} (vencido ${formatMoneyEUR(p.overdueNowEur as number)}).`;
    }
    case "get_invoices_due_soon": {
      if (p.empty) {
        return `No hay facturas con vencimiento en los próximos ${p.days} días.`;
      }
      const rows = p.invoices as {
        numberLabel: string;
        clientName: string;
        dueDate: string | null;
        outstandingEur: number;
        status: string;
        isOverdue: boolean;
      }[];
      const lines = rows.map((r) => {
        const tag = r.isOverdue ? " · vencida" : "";
        return `· ${r.numberLabel} (${r.clientName}) — vence ${r.dueDate ?? "?"} — ${formatMoneyEUR(r.outstandingEur)} — ${r.status}${tag}`;
      });
      const overdueNote =
        (p.overdueCount as number) > 0
          ? `\n\n${p.overdueCount} ya están vencidas.`
          : "";
      return `Facturas con vencimiento hasta ${p.until} (${p.count}):\n\n${lines.join("\n")}${overdueNote}`;
    }
    case "compare_billing_periods": {
      const cur = formatMoneyEUR(p.currentBilledEur as number);
      const prev = formatMoneyEUR(p.previousBilledEur as number);
      const delta = p.deltaEur as number;
      const sign = delta > 0 ? "+" : "";
      const pct = p.deltaPercent as number | null;
      const pctStr = pct != null ? ` (${sign}${pct} %)` : "";
      return `Facturación ${p.currentLabel} (${p.currentFrom} → ${p.currentTo}): ${cur}.\n${p.previousLabel} (${p.previousFrom} → ${p.previousTo}): ${prev}.\nVariación: ${sign}${formatMoneyEUR(delta)}${pctStr}.`;
    }
    case "draft_payment_reminder": {
      if (p.ambiguous) {
        const names = (p.candidates as string[]).join("», «");
        return `Hay varios clientes parecidos: «${names}». Indica el nombre completo.`;
      }
      if (p.missingName) return "Indica el nombre del cliente para el recordatorio.";
      if (p.notFound) return "No encuentro ese cliente.";
      if (!p.hasDebt) {
        return `${p.clientName} no tiene facturas pendientes de cobro. No hace falta recordatorio.`;
      }
      return `Borrador de recordatorio para ${p.clientName} (${formatMoneyEUR(p.pendingEur as number)} pendientes):\n\n---\n${p.reminderText}\n---\n\nPuedes copiarlo y enviarlo por email o WhatsApp.`;
    }
    case "list_clients": {
      if (p.countOnly) {
        const n = p.totalClients as number;
        return n === 0
          ? "No tienes clientes registrados todavía."
          : `Tienes ${n} cliente${n === 1 ? "" : "s"} registrado${n === 1 ? "" : "s"}.`;
      }
      const rows = p.clients as { clientName: string; invoiceCount: number }[];
      if (rows.length === 0) return "No hay clientes que coincidan.";
      const lines = rows.map((r) => `· ${r.clientName} — ${r.invoiceCount} factura(s)`);
      return `Clientes (${rows.length} de ${p.totalClients}):\n\n${lines.join("\n")}`;
    }
    case "open_filtered_view": {
      if (p.error) return String(p.error);
      return `Listo. Te abro la vista filtrada: ${p.label}.`;
    }
    default:
      return "No he podido interpretar la consulta.";
  }
}
