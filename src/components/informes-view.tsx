import Link from "next/link";
import { InteractiveDonut } from "@/components/interactive-donut";
import { InformesInsightPanel } from "@/components/informes-insight-panel";
import { InformesRangeHeading, InformesRangeToolbar } from "@/components/informes-range-toolbar";
import { MetricCard } from "@/components/dashboard-metric-card";
import { RevenueBarChart } from "@/components/revenue-bar-chart";
import { buildInvoicesListUrl } from "@/lib/invoice-list-url";
import {
  buildReportsQueryString,
  type ReportsData,
  type ReportsResolvedFilters,
} from "@/lib/reports-data";
import { detectInformesPreset, formatInformesRangeLabel } from "@/lib/informes-range-presets";
import { formatMoneyEUR } from "@/lib/money";

function donutInvoicesHref(f: ReportsResolvedFilters, segmentId: string) {
  return buildInvoicesListUrl({
    from: f.from,
    to: f.to,
    segment: segmentId,
    ...(f.clientId ? { client_id: f.clientId } : {}),
  });
}

function granularityHref(f: ReportsResolvedFilters, g: "month" | "week"): string {
  return `/informes?${buildReportsQueryString({ ...f, granularity: g })}`;
}

export function InformesView({ data }: { data: ReportsData }) {
  const { filters } = data;
  const rangePreset = detectInformesPreset(filters.from, filters.to);
  const isEsteMesPeriod = rangePreset === "month";
  const isEstaSemanaPeriod = rangePreset === "week";
  const isSingleDay = filters.from === filters.to;
  const m = data.metrics;
  const pct = m.pctChangeVsPreviousMonth;
  const donutSegmentHrefs: Record<string, string> = {
    paid: donutInvoicesHref(filters, "paid"),
    pend: donutInvoicesHref(filters, "pend"),
    due: donutInvoicesHref(filters, "due"),
  };

  return (
    <div className="mr-auto ml-0 flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-6 sm:px-6 sm:py-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <InformesRangeHeading filters={filters} />
        <InformesRangeToolbar filters={filters} />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          value={formatMoneyEUR(m.billedInPeriod)}
          label="Facturado (periodo)"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6v12m-3-2.818.879.879c1.171 1.171 3.07 1.171 4.242 0 1.172-1.172 1.172-3.07 0-4.242L12 8.586m-3 3.879L12 8.586m0 0 7.879 7.879a3 3 0 1 0-4.242-4.242L12 8.586"
              />
            </svg>
          }
        />
        <MetricCard
          value={formatMoneyEUR(m.collectedInPeriod)}
          label="Cobrado (periodo)"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75a.75.75 0 0 1-.75.75H3.75a.75.75 0 0 1-.75-.75V6Z"
              />
            </svg>
          }
        />
        <MetricCard
          value={formatMoneyEUR(m.pendingNow)}
          label="Pendiente de cobro"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6v6h4.5m4.5 0A9 9 0 1 1 3 12a9 9 0 0 1 18 0Z"
              />
            </svg>
          }
          accent="warning"
        />
        <MetricCard
          value={formatMoneyEUR(m.overdueNow)}
          label="Importe vencido"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
              />
            </svg>
          }
          accent="danger"
        />
      </section>

      {pct != null ? (
        <p className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-300">
          <span className="font-medium">Mes calendario actual vs anterior:</span>{" "}
          {formatMoneyEUR(m.billedThisCalendarMonth)} frente a {formatMoneyEUR(m.billedPreviousCalendarMonth)}.
          Variación aproximada:{" "}
          <span className={pct >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}>
            {pct >= 0 ? "+" : ""}
            {pct.toFixed(1)} %
          </span>
          <span className="text-zinc-500 dark:text-zinc-500"> (global, sin filtro de cliente)</span>
        </p>
      ) : null}

      <section className="overflow-visible rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-blue-800 dark:text-sky-300">
              {isSingleDay
                ? "Facturación del día"
                : isEstaSemanaPeriod
                  ? "Facturación de la semana"
                  : isEsteMesPeriod
                    ? "Facturación del mes"
                    : "Facturación en el tiempo"}
            </h2>
            <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
              {formatInformesRangeLabel(filters.from, filters.to)} ·{" "}
              {isSingleDay
                ? "vista diaria: la barra muestra solo la facturación emitida ese día"
                : isEstaSemanaPeriod
                  ? "una barra por día (lun–dom); 0 € si no hubo emisiones ese día"
                  : isEsteMesPeriod
                    ? "una barra por semana del mes; cada semana es lun–dom; 0 € si no hubo emisiones en esa semana"
                    : filters.granularity === "week"
                      ? "solo semanas con emisiones · semanas desde lunes"
                      : "solo meses con emisiones · meses naturales"}
            </p>
          </div>
          {isEsteMesPeriod || isEstaSemanaPeriod || isSingleDay ? null : (
            <div className="flex h-10 w-full shrink-0 rounded-xl border border-zinc-200/90 bg-zinc-50 p-0.5 dark:border-zinc-600 dark:bg-zinc-900 sm:w-auto">
              <Link
                href={granularityHref(filters, "month")}
                className={`flex flex-1 items-center justify-center rounded-[10px] px-4 text-xs font-semibold transition sm:flex-initial sm:min-w-[5.5rem] sm:text-sm ${
                  filters.granularity === "month"
                    ? "bg-brand text-brand-fg shadow-sm dark:bg-brand dark:text-brand-fg"
                    : "text-zinc-600 hover:bg-white/80 dark:text-zinc-400 dark:hover:bg-zinc-800"
                }`}
              >
                Meses
              </Link>
              <Link
                href={granularityHref(filters, "week")}
                className={`flex flex-1 items-center justify-center rounded-[10px] px-4 text-xs font-semibold transition sm:flex-initial sm:min-w-[5.5rem] sm:text-sm ${
                  filters.granularity === "week"
                    ? "bg-brand text-brand-fg shadow-sm dark:bg-brand dark:text-brand-fg"
                    : "text-zinc-600 hover:bg-white/80 dark:text-zinc-400 dark:hover:bg-zinc-800"
                }`}
              >
                Semanas
              </Link>
            </div>
          )}
        </div>
        <RevenueBarChart
          points={data.timeSeries}
          emptyMessage={
            isSingleDay
              ? "No hay facturas emitidas en este día."
              : isEstaSemanaPeriod
                ? "No hay facturas emitidas en esta semana."
                : "No hay facturación en este periodo."
          }
          barAreaClassName="h-40"
          minVisiblePct={5}
        />
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80">
          <h2 className="mb-4 text-sm font-semibold text-blue-800 dark:text-sky-300">Estado de facturas (importes)</h2>
          <InteractiveDonut
            segments={data.statusDonut}
            emptyMessage="Sin importes en el periodo del informe."
            segmentHrefs={donutSegmentHrefs}
          />
        </section>

        <section className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80">
          <h2 className="mb-4 text-sm font-semibold text-blue-800 dark:text-sky-300">Clientes · ranking</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                  <th className="py-2 pr-2 font-medium">Cliente</th>
                  <th className="py-2 pr-2 text-right font-medium">Facturado</th>
                  <th className="py-2 pr-2 text-right font-medium">Cobrado</th>
                  <th className="py-2 text-right font-medium">Pendiente</th>
                </tr>
              </thead>
              <tbody>
                {data.clientsRanking.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-zinc-500 dark:text-zinc-400">
                      Sin movimientos en el periodo.
                    </td>
                  </tr>
                ) : (
                  data.clientsRanking.map((r) => (
                    <tr key={r.clientId} className="border-b border-zinc-50 last:border-0 dark:border-zinc-800/80">
                      <td className="max-w-[160px] truncate py-2 pr-2 font-medium text-zinc-900 dark:text-zinc-100">
                        <Link
                          href={`/clients/${r.clientId}`}
                          className="text-brand hover:underline dark:text-accent"
                        >
                          {r.name}
                        </Link>
                      </td>
                      <td className="py-2 pr-2 text-right tabular-nums">{formatMoneyEUR(r.invoiced)}</td>
                      <td className="py-2 pr-2 text-right tabular-nums text-emerald-800 dark:text-emerald-300">
                        {formatMoneyEUR(r.collected)}
                      </td>
                      <td className="py-2 text-right tabular-nums text-amber-800 dark:text-amber-200">
                        {formatMoneyEUR(r.pending)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80">
        <h2 className="mb-4 text-sm font-semibold text-blue-800 dark:text-sky-300">Productos y servicios más vendidos</h2>
        <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
          Por importe total de líneas (IVA incluido en línea) en facturas del periodo.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[400px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-100 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                <th className="py-2 font-medium">Concepto</th>
                <th className="py-2 text-right font-medium">Cantidad</th>
                <th className="py-2 text-right font-medium">Importe</th>
              </tr>
            </thead>
            <tbody>
              {data.topProducts.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-6 text-center text-zinc-500 dark:text-zinc-400">
                    Sin líneas en facturas emitidas en el periodo.
                  </td>
                </tr>
              ) : (
                data.topProducts.map((p) => (
                  <tr key={p.key} className="border-b border-zinc-50 last:border-0 dark:border-zinc-800/80">
                    <td className="max-w-xs truncate py-2 text-zinc-900 dark:text-zinc-100">{p.name}</td>
                    <td className="py-2 text-right tabular-nums text-zinc-600 dark:text-zinc-400">
                      {p.quantity.toLocaleString("es-ES", { maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 text-right tabular-nums font-medium">{formatMoneyEUR(p.revenue)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <InformesInsightPanel filters={filters} />

      <p className="text-center text-xs text-zinc-400 dark:text-zinc-500">
        {m.invoiceCountInPeriod} facturas emitidas en el periodo del informe ·{" "}
        <Link href="/invoices" className="text-brand hover:underline dark:text-accent">
          Ver listado
        </Link>
      </p>
    </div>
  );
}
