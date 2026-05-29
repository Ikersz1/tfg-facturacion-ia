import type { ReactNode } from "react";
import type { KpiWithDelta } from "@/lib/reports-data";

type Props = {
  label: string;
  /** Valor ya formateado para mostrar (p. ej. "3.600 €", "84 %", "27 días"). */
  value: string;
  kpi: KpiWithDelta;
  icon: ReactNode;
  /** Cuando el KPI mejora al bajar (p. ej. días de cobro), invierte el color del delta. */
  goodWhenDown?: boolean;
  /** Texto del periodo de comparación, p. ej. "vs periodo anterior". */
  comparisonLabel?: string;
};

function DeltaBadge({
  changePct,
  goodWhenDown,
}: {
  changePct: number | null;
  goodWhenDown: boolean;
}) {
  if (changePct === null) {
    return (
      <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
        —
      </span>
    );
  }
  const up = changePct > 0;
  const flat = changePct === 0;
  const positive = flat ? null : goodWhenDown ? !up : up;
  const cls = flat
    ? "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
    : positive
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
      : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300";
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${cls}`}>
      {!flat ? (
        <svg
          className={`h-3 w-3 ${up ? "" : "rotate-180"}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0-6 6m6-6 6 6" />
        </svg>
      ) : null}
      {up ? "+" : ""}
      {changePct.toFixed(1)} %
    </span>
  );
}

export function ReportKpiCard({
  label,
  value,
  kpi,
  icon,
  goodWhenDown = false,
  comparisonLabel = "vs periodo anterior",
}: Props) {
  return (
    <div className="flex flex-col justify-between rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm ring-1 ring-zinc-200/80 dark:border-zinc-700 dark:bg-zinc-900/80 dark:ring-zinc-700/80">
      <div className="flex items-start justify-between gap-2">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft/60 text-brand dark:bg-zinc-800 dark:text-accent">
          {icon}
        </span>
        <DeltaBadge changePct={kpi.changePct} goodWhenDown={goodWhenDown} />
      </div>
      <p className="mt-4 text-2xl font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-zinc-50">
        {value}
      </p>
      <p className="mt-1 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {label}
      </p>
      <p className="mt-2 text-[11px] text-zinc-400 dark:text-zinc-500">{comparisonLabel}</p>
    </div>
  );
}
