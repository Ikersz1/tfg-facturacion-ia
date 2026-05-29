import Link from "next/link";
import { InteractiveDonut } from "@/components/interactive-donut";
import { InformesInsightPanel } from "@/components/informes-insight-panel";
import { InformesRangeHeading, InformesRangeToolbar } from "@/components/informes-range-toolbar";
import { ReportKpiCard } from "@/components/report-kpi-card";
import { BilledVsCollectedChart } from "@/components/billed-vs-collected-chart";
import { DebtAgingCard } from "@/components/debt-aging-card";
import { ReportsDemoBanner } from "@/components/reports-demo-banner";
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

const moneyIcon = (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 6v12m-3-2.818.879.879c1.171 1.171 3.07 1.171 4.242 0 1.172-1.172 1.172-3.07 0-4.242L12 8.586m-3 3.879L12 8.586m0 0 7.879 7.879a3 3 0 1 0-4.242-4.242L12 8.586"
    />
  </svg>
);

const rateIcon = (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25 15 8.25m-6 .375a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm6.375 5.625a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

const clockIcon = (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0A9 9 0 1 1 3 12a9 9 0 0 1 18 0Z" />
  </svg>
);

const ticketIcon = (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z"
    />
  </svg>
);

export function InformesView({ data }: { data: ReportsData }) {
  const { filters, isDemo } = data;
  const rangePreset = detectInformesPreset(filters.from, filters.to);
  const isEsteMesPeriod = rangePreset === "month";
  const isEstaSemanaPeriod = rangePreset === "week";
  const isSingleDay = filters.from === filters.to;
  const m = data.metrics;
  const comparison = "vs periodo anterior";
  const donutSegmentHrefs: Record<string, string> = isDemo
    ? {}
    : {
        paid: donutInvoicesHref(filters, "paid"),
        pend: donutInvoicesHref(filters, "pend"),
        due: donutInvoicesHref(filters, "due"),
      };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-6 sm:px-6 sm:py-8">
      {isDemo ? <ReportsDemoBanner /> : null}

      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <InformesRangeHeading filters={filters} />
        <InformesRangeToolbar filters={filters} />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ReportKpiCard
          label="Facturado (periodo)"
          value={formatMoneyEUR(m.billed.value)}
          kpi={m.billed}
          icon={moneyIcon}
          comparisonLabel={comparison}
        />
        <ReportKpiCard
          label="Tasa de cobro"
          value={`${m.collectionRate.value.toFixed(0)} %`}
          kpi={m.collectionRate}
          icon={rateIcon}
          comparisonLabel={comparison}
        />
        <ReportKpiCard
          label="Días medios de cobro"
          value={`${m.dsoDays.value} días`}
          kpi={m.dsoDays}
          icon={clockIcon}
          goodWhenDown
          comparisonLabel={comparison}
        />
        <ReportKpiCard
          label="Ticket medio"
          value={formatMoneyEUR(m.avgTicket.value)}
          kpi={m.avgTicket}
          icon={ticketIcon}
          comparisonLabel={comparison}
        />
      </section>

      <section className="overflow-visible rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-blue-800 dark:text-sky-300">Facturado vs cobrado</h2>
            <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
              {formatInformesRangeLabel(filters.from, filters.to)} · cada barra muestra lo facturado y, en
              verde, cuánto se ha cobrado de ello
            </p>
          </div>
          {isEsteMesPeriod || isEstaSemanaPeriod || isSingleDay || isDemo ? null : (
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
        <BilledVsCollectedChart
          points={data.timeSeries}
          emptyMessage={
            isSingleDay
              ? "No hay facturas emitidas en este día."
              : isEstaSemanaPeriod
                ? "No hay facturas emitidas en esta semana."
                : "No hay facturación en este periodo."
          }
        />
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <DebtAgingCard buckets={data.aging} />

        <section className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80">
          <h2 className="mb-4 text-sm font-semibold text-blue-800 dark:text-sky-300">Estado de facturas (importes)</h2>
          <InteractiveDonut
            segments={data.statusDonut}
            emptyMessage="Sin importes en el periodo del informe."
            segmentHrefs={donutSegmentHrefs}
          />
        </section>
      </div>

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
                      {isDemo ? (
                        r.name
                      ) : (
                        <Link href={`/clients/${r.clientId}`} className="text-brand hover:underline dark:text-accent">
                          {r.name}
                        </Link>
                      )}
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

      {isDemo ? null : <InformesInsightPanel filters={filters} />}

      <p className="text-center text-xs text-zinc-400 dark:text-zinc-500">
        {m.invoiceCountInPeriod} facturas emitidas en el periodo del informe ·{" "}
        <Link href="/invoices" className="text-brand hover:underline dark:text-accent">
          Ver listado
        </Link>
      </p>
    </div>
  );
}
