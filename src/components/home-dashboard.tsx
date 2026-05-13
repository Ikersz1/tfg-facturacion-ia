import Link from "next/link";
import { MetricCard } from "@/components/dashboard-metric-card";
import { RevenueBarChart } from "@/components/revenue-bar-chart";
import type { DashboardData, MonthlyIncome } from "@/lib/dashboard-data";
import { formatMoneyEUR } from "@/lib/money";

function statusBadgeClass(status: string): string {
  switch (status) {
    case "paid":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200";
    case "issued":
    case "partial":
      return "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100";
    case "overdue":
      return "bg-red-100 text-red-800 dark:bg-red-900/45 dark:text-red-200";
    case "draft":
      return "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200";
    case "cancelled":
      return "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400";
    default:
      return "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";
  }
}

function statusLabel(s: string): string {
  const map: Record<string, string> = {
    draft: "Borrador",
    issued: "Pendiente",
    partial: "Parcial",
    paid: "Pagada",
    cancelled: "Anulada",
    overdue: "Vencida",
  };
  return map[s] ?? s;
}

function formatShortDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

function RevenueChart({ months }: { months: MonthlyIncome[] }) {
  return (
    <div className="overflow-visible rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-blue-800 dark:text-sky-300">Ingresos por mes</h2>
        <span className="text-[11px] text-zinc-500 dark:text-zinc-400">Últimos 6 meses</span>
      </div>
      <RevenueBarChart
        points={months}
        emptyMessage="Sin datos en este rango."
        barAreaClassName="h-32"
        minVisiblePct={8}
      />
    </div>
  );
}

export function HomeDashboard({ data }: { data: DashboardData }) {
  return (
    <div className="mr-auto ml-0 flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          value={formatMoneyEUR(data.billedThisMonth)}
          label="Facturado este mes"
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
          value={formatMoneyEUR(data.pendingToCollect)}
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
          value={formatMoneyEUR(data.overdueAmount)}
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
        <MetricCard
          value={String(data.totalInvoices)}
          label="Total facturas"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 8.25H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75M21 12.75v-4.875c0-.621-.504-1.125-1.125-1.125h-4.5"
              />
            </svg>
          }
        />
      </section>

      <RevenueChart months={data.monthlyIncome} />

      <div className="grid gap-8 lg:grid-cols-[1fr_minmax(220px,280px)]">
        <div className="rounded-2xl border border-zinc-200/90 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80">
          <div className="border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
            <h2 className="text-sm font-semibold text-blue-800 dark:text-sky-300">Últimas facturas</h2>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">Las más recientes por fecha de creación</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                  <th className="px-5 py-3 font-medium">Número</th>
                  <th className="px-5 py-3 font-medium">Cliente</th>
                  <th className="px-5 py-3 font-medium">Importe</th>
                  <th className="px-5 py-3 font-medium">Estado</th>
                  <th className="px-5 py-3 font-medium">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {data.recentInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-zinc-500 dark:text-zinc-400">
                      No hay facturas todavía. Crea la primera desde acciones rápidas.
                    </td>
                  </tr>
                ) : (
                  data.recentInvoices.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-zinc-50 last:border-0 dark:border-zinc-800/80"
                    >
                      <td className="px-5 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                        <Link href={`/invoices/${row.id}`} className="text-brand hover:underline dark:text-accent">
                          {row.numberLabel}
                        </Link>
                      </td>
                      <td className="max-w-[140px] truncate px-5 py-3 text-zinc-700 dark:text-zinc-300">
                        {row.clientName}
                      </td>
                      <td className="px-5 py-3 tabular-nums text-zinc-900 dark:text-zinc-100">
                        {formatMoneyEUR(row.total)}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(row.status)}`}
                        >
                          {statusLabel(row.status)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-zinc-600 dark:text-zinc-400">
                        {formatShortDate(row.date)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="flex flex-col gap-4">
          <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80">
            <h2 className="text-sm font-semibold text-blue-800 dark:text-sky-300">Acciones rápidas</h2>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Crear registros nuevos</p>
            <ul className="mt-4 flex flex-col gap-2">
              <li>
                <Link
                  href="/invoices/new"
                  className="flex min-h-11 items-center gap-2 rounded-xl border border-zinc-200 bg-brand px-4 text-sm font-medium text-brand-fg shadow-sm transition hover:bg-brand-hover dark:border-brand dark:bg-brand dark:text-brand-fg dark:hover:bg-brand-hover"
                >
                  <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Nueva factura
                </Link>
              </li>
              <li>
                <Link
                  href="/clients/new"
                  className="flex min-h-11 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:border-zinc-500 dark:hover:bg-zinc-800"
                >
                  <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
                    />
                  </svg>
                  Nuevo cliente
                </Link>
              </li>
              <li>
                <Link
                  href="/catalogo/new"
                  className="flex min-h-11 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:border-zinc-500 dark:hover:bg-zinc-800"
                >
                  <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z"
                    />
                  </svg>
                  Nuevo en catálogo
                </Link>
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/80 p-5 dark:border-zinc-600 dark:bg-zinc-900/50">
            <div className="flex items-center gap-2">
              <span
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-200/80 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                aria-hidden
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z"
                  />
                </svg>
              </span>
              <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Asistente por voz / texto</h2>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
              Pregunta en lenguaje natural: listados, recordatorios o borradores. Integración con IA en roadmap.
            </p>
            <div className="mt-4 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-400 dark:border-zinc-700 dark:bg-zinc-950">
              ¿Qué quieres hacer?
            </div>
            <p className="mt-3 text-center text-xs font-semibold uppercase tracking-wide text-brand dark:text-accent">
              Próximamente
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
