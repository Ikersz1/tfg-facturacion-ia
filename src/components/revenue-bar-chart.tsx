"use client";

import { formatMoneyEUR } from "@/lib/money";

export type RevenueBarPoint = { key: string; label: string; amount: number };

type Props = {
  points: RevenueBarPoint[];
  emptyMessage?: string;
  barAreaClassName?: string;
  minVisiblePct?: number;
  className?: string;
  maxBarClassName?: string;
};

function PointTooltip({ label, formatted }: { label: string; formatted: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200/90 bg-white px-3.5 py-2.5 text-center shadow-[0_22px_50px_-12px_rgba(15,23,42,0.45)] ring-1 ring-black/5 dark:border-zinc-600 dark:bg-zinc-800 dark:shadow-[0_24px_60px_-12px_rgba(0,0,0,0.65)] dark:ring-white/10">
      <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-0.5 text-base font-bold tabular-nums tracking-tight text-zinc-900 dark:text-zinc-50">{formatted}</p>
    </div>
  );
}

export function RevenueBarChart({
  points,
  emptyMessage = "No hay datos.",
  barAreaClassName = "h-40",
  minVisiblePct = 5,
  className = "",
  maxBarClassName = "max-w-8",
}: Props) {
  const max = Math.max(...points.map((p) => p.amount), 1);
  const chartKey = points.map((p) => `${p.key}:${p.amount}`).join("|");
  const n = points.length;
  const tight = n > 10;
  /** Pocas barras: no estirar a todo el ancho (un solo mes se veía como una barra gigante). */
  const sparse = n > 0 && n <= 8;
  const gapClass = tight ? "gap-0.5 sm:gap-1" : sparse ? "gap-2 sm:gap-4" : "gap-1.5 sm:gap-2";
  const barMaxClass = tight ? "max-w-7 sm:max-w-8" : sparse ? "max-w-14 sm:max-w-16" : maxBarClassName;
  const rowClass = sparse
    ? `flex min-h-0 w-full min-w-0 flex-wrap justify-center ${gapClass}`
    : `flex min-h-0 w-full min-w-0 ${gapClass}`;
  const colClass = sparse
    ? "group relative flex w-[4.25rem] shrink-0 flex-col items-center gap-1.5 sm:w-28"
    : "group relative flex min-w-0 flex-1 flex-col items-center gap-1.5";

  return (
    <div className={`min-h-0 w-full overflow-visible pb-2 pt-1 ${className}`}>
      <div key={chartKey} className={rowClass}>
        {points.length === 0 ? (
          <p className="w-full py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">{emptyMessage}</p>
        ) : (
          points.map((m, i) => {
            const pct = max > 0 ? (m.amount / max) * 100 : 0;
            const isZero = m.amount <= 0;
            const barH = !isZero ? Math.max(pct, minVisiblePct) : 0;
            const stagger = i * 48;
            const formatted = formatMoneyEUR(m.amount);

            return (
              <div key={m.key} className={colClass}>
                <div className={`relative flex w-full min-w-0 items-end justify-center ${barAreaClassName}`}>
                  <div className="pointer-events-none absolute bottom-full left-1/2 z-[70] mb-3 flex -translate-x-1/2 flex-col items-center opacity-0 transition duration-200 ease-out translate-y-2 group-hover:translate-y-0 group-hover:opacity-100">
                    <PointTooltip label={m.label} formatted={formatted} />
                  </div>

                  <div className={`relative flex h-full w-full ${barMaxClass} flex-col justify-end`}>
                    {isZero ? (
                      <div
                        className="revenue-bar-rise w-full shrink-0 rounded-sm border border-zinc-200/90 bg-zinc-100/90 dark:border-zinc-600/80 dark:bg-zinc-700/50"
                        style={{ height: "6px", animationDelay: `${stagger}ms` }}
                        aria-label="Sin facturación en este periodo"
                      />
                    ) : (
                      <div
                        className="revenue-bar-rise relative w-full origin-bottom rounded-t-sm bg-gradient-to-t from-brand via-sky-500 to-sky-300 shadow-[0_-8px_28px_-6px_rgba(37,99,235,0.38)] ring-1 ring-inset ring-white/25 dark:from-brand dark:via-sky-600 dark:to-sky-400 dark:shadow-[0_-10px_32px_-6px_rgba(59,130,246,0.35)] dark:ring-white/10"
                        style={{
                          height: `${barH}%`,
                          animationDelay: `${stagger}ms`,
                        }}
                      />
                    )}
                  </div>
                </div>
                <span
                  className="revenue-label-rise max-w-full min-w-0 truncate px-0.5 text-center text-[8px] font-medium leading-tight text-zinc-500 dark:text-zinc-400 sm:text-[9px]"
                  style={{ animationDelay: `${stagger + 260}ms` }}
                >
                  {m.label}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
