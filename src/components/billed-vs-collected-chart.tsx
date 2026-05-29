"use client";

import { formatMoneyEUR } from "@/lib/money";
import type { TimePoint } from "@/lib/reports-data";

type Props = {
  points: TimePoint[];
  emptyMessage?: string;
  barAreaClassName?: string;
};

function PointTooltip({ point }: { point: TimePoint }) {
  const rate = point.amount > 0 ? Math.round((point.collected / point.amount) * 100) : 0;
  return (
    <div className="rounded-2xl border border-zinc-200/90 bg-white px-3.5 py-2.5 shadow-[0_22px_50px_-12px_rgba(15,23,42,0.45)] ring-1 ring-black/5 dark:border-zinc-600 dark:bg-zinc-800 dark:ring-white/10">
      <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {point.label}
      </p>
      <div className="mt-1 space-y-0.5 text-left">
        <p className="flex items-center justify-between gap-4 text-xs tabular-nums">
          <span className="text-zinc-500 dark:text-zinc-400">Facturado</span>
          <span className="font-semibold text-zinc-900 dark:text-zinc-50">{formatMoneyEUR(point.amount)}</span>
        </p>
        <p className="flex items-center justify-between gap-4 text-xs tabular-nums">
          <span className="text-emerald-600 dark:text-emerald-400">Cobrado</span>
          <span className="font-semibold text-emerald-700 dark:text-emerald-300">
            {formatMoneyEUR(point.collected)}
          </span>
        </p>
      </div>
      <p className="mt-1 border-t border-zinc-100 pt-1 text-[10px] font-medium text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
        {rate}% cobrado
      </p>
    </div>
  );
}

export function BilledVsCollectedChart({
  points,
  emptyMessage = "No hay facturación en este periodo.",
  barAreaClassName = "h-44",
}: Props) {
  const max = Math.max(...points.map((p) => p.amount), 1);
  const chartKey = points.map((p) => `${p.key}:${p.amount}:${p.collected}`).join("|");
  const n = points.length;
  const tight = n > 10;
  const sparse = n > 0 && n <= 8;
  const gapClass = tight ? "gap-0.5 sm:gap-1" : sparse ? "gap-2 sm:gap-4" : "gap-1.5 sm:gap-2";
  const barMaxClass = tight ? "max-w-7 sm:max-w-9" : sparse ? "max-w-14 sm:max-w-16" : "max-w-9";
  const rowClass = sparse
    ? `flex min-h-0 w-full min-w-0 flex-wrap justify-center ${gapClass}`
    : `flex min-h-0 w-full min-w-0 ${gapClass}`;
  const colClass = sparse
    ? "group relative flex w-[4.25rem] shrink-0 flex-col items-center gap-1.5 sm:w-28"
    : "group relative flex min-w-0 flex-1 flex-col items-center gap-1.5";

  return (
    <div className="min-h-0 w-full overflow-visible pb-2 pt-1">
      <div className="mb-4 flex flex-wrap items-center gap-4 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-gradient-to-t from-brand to-sky-300" />
          Facturado
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
          Cobrado
        </span>
      </div>

      <div key={chartKey} className={rowClass}>
        {points.length === 0 ? (
          <p className="w-full py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">{emptyMessage}</p>
        ) : (
          points.map((p, i) => {
            const billedPct = max > 0 ? (p.amount / max) * 100 : 0;
            const isZero = p.amount <= 0;
            const barH = !isZero ? Math.max(billedPct, 5) : 0;
            const collectedShare = p.amount > 0 ? Math.min(100, (p.collected / p.amount) * 100) : 0;
            const stagger = i * 48;

            return (
              <div key={p.key} className={colClass}>
                <div className={`relative flex w-full min-w-0 items-end justify-center ${barAreaClassName}`}>
                  <div className="pointer-events-none absolute bottom-full left-1/2 z-[70] mb-3 flex -translate-x-1/2 flex-col items-center opacity-0 transition duration-200 ease-out translate-y-2 group-hover:translate-y-0 group-hover:opacity-100">
                    <PointTooltip point={p} />
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
                        className="revenue-bar-rise relative w-full origin-bottom overflow-hidden rounded-t-sm bg-gradient-to-t from-brand/80 via-sky-500/70 to-sky-300/70 ring-1 ring-inset ring-white/25 dark:from-brand/70 dark:via-sky-600/60 dark:to-sky-400/60 dark:ring-white/10"
                        style={{ height: `${barH}%`, animationDelay: `${stagger}ms` }}
                      >
                        {/* Porción cobrada sobre el total facturado */}
                        <div
                          className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-emerald-600 to-emerald-400 shadow-[0_-6px_20px_-4px_rgba(16,185,129,0.5)]"
                          style={{ height: `${collectedShare}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
                <span
                  className="revenue-label-rise max-w-full min-w-0 truncate px-0.5 text-center text-[8px] font-medium leading-tight text-zinc-500 dark:text-zinc-400 sm:text-[9px]"
                  style={{ animationDelay: `${stagger + 260}ms` }}
                >
                  {p.label}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
