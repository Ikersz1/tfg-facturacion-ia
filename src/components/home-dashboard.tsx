import Link from "next/link";
import { MetricCard } from "@/components/dashboard-metric-card";
import { AnimatedLineChart } from "@/components/animated-line-chart";
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

function RevenueTrendCard({ months }: { months: MonthlyIncome[] }) {
  const total = months.reduce((acc, m) => acc + m.amount, 0);
  const last = months[months.length - 1]?.amount ?? 0;
  const prev = months[months.length - 2]?.amount ?? 0;
  const trendUp = last >= prev;

  return (
    <div className="overflow-visible rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-blue-800 dark:text-sky-300">Evolución de ingresos</h2>
          <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">Últimos 6 meses</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-zinc-50">
            {formatMoneyEUR(total)}
          </p>
          <p
            className={`text-[11px] font-medium ${
              trendUp ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
            }`}
          >
            {trendUp ? "▲" : "▼"} mes actual {formatMoneyEUR(last)}
          </p>
        </div>
      </div>
      <AnimatedLineChart
        series={[
          {
            id: "ingresos",
            name: "Ingresos",
            color: "#2563eb",
            points: months.map((mth) => ({ label: mth.label, value: mth.amount })),
          },
        ]}
        area
        heightClassName="h-48"
        emptyMessage="Sin datos en este rango."
      />
    </div>
  );
}

function QuickActionLink({
  href,
  label,
  primary = false,
}: {
  href: string;
  label: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        primary
          ? "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-brand px-4 text-sm font-medium text-brand-fg shadow-sm transition hover:bg-brand-hover dark:border-brand"
          : "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:border-zinc-500 dark:hover:bg-zinc-800"
      }
    >
      {primary ? (
        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      ) : null}
      {label}
    </Link>
  );
}

export function HomeDashboard({ data }: { data: DashboardData }) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10">
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

      <RevenueTrendCard months={data.monthlyIncome} />

      <section className="rounded-2xl border border-zinc-200/90 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80">
        <div className="flex flex-col gap-4 border-b border-zinc-100 px-5 py-4 dark:border-zinc-800 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-blue-800 dark:text-sky-300">Últimas facturas</h2>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              Las más recientes por fecha de creación
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <QuickActionLink href="/invoices/new" label="Nueva factura" primary />
            <QuickActionLink href="/clients/new" label="Nuevo cliente" />
            <QuickActionLink href="/catalogo/new" label="Nuevo en catálogo" />
          </div>
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
                    No hay facturas todavía.{" "}
                    <Link href="/invoices/new" className="font-medium text-brand hover:underline dark:text-accent">
                      Crea la primera
                    </Link>
                    .
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
                    <td className="max-w-[200px] truncate px-5 py-3 text-zinc-700 dark:text-zinc-300 sm:max-w-none">
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
        {data.recentInvoices.length > 0 ? (
          <div className="border-t border-zinc-100 px-5 py-3 dark:border-zinc-800">
            <Link
              href="/invoices"
              className="text-sm font-medium text-brand hover:underline dark:text-accent"
            >
              Ver todas las facturas →
            </Link>
          </div>
        ) : null}
      </section>
    </div>
  );
}
