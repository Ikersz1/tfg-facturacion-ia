"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";
import { formatMoneyEUR } from "@/lib/money";

export type LinePoint = { label: string; value: number };
export type LineSeries = { id: string; name: string; color: string; points: LinePoint[] };

type Props = {
  series: LineSeries[];
  area?: boolean;
  heightClassName?: string;
  emptyMessage?: string;
};

const TOP = 8;
const BOTTOM = 92;

function xAt(i: number, n: number): number {
  if (n <= 1) return 50;
  return (i / (n - 1)) * 100;
}

function yAt(value: number, max: number): number {
  if (max <= 0) return BOTTOM;
  return BOTTOM - (value / max) * (BOTTOM - TOP);
}

/** Segmentos rectos: siempre une todos los puntos (meses a 0 € incluidos). */
function polylinePath(coords: { x: number; y: number }[]): string {
  if (coords.length === 0) return "";
  return coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(2)} ${c.y.toFixed(2)}`).join(" ");
}

function AnimatedStrokePath({
  d,
  stroke,
  strokeWidth = 2.5,
}: {
  d: string;
  stroke: string;
  strokeWidth?: number;
}) {
  const ref = useRef<SVGPathElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !d) return;
    const len = el.getTotalLength();
    if (len <= 0) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.style.strokeDasharray = `${len}`;
    el.style.strokeDashoffset = reduced ? "0" : `${len}`;
    el.style.transition = reduced ? "none" : "stroke-dashoffset 1.2s cubic-bezier(0.65, 0, 0.35, 1)";

    if (!reduced) {
      requestAnimationFrame(() => {
        el.style.strokeDashoffset = "0";
      });
    }
  }, [d]);

  return (
    <path
      ref={ref}
      d={d}
      fill="none"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

export function AnimatedLineChart({
  series,
  area = false,
  heightClassName = "h-56",
  emptyMessage = "Sin datos en este periodo.",
}: Props) {
  const gradientId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<number | null>(null);

  const n = series[0]?.points.length ?? 0;
  const labels = series[0]?.points.map((p) => p.label) ?? [];
  const max = Math.max(...series.flatMap((s) => s.points.map((p) => p.value)), 1);
  const hasData = n > 0 && series.some((s) => s.points.some((p) => p.value > 0));

  const primaryCoords =
    series[0]?.points.map((p, i) => ({ x: xAt(i, n), y: yAt(p.value, max) })) ?? [];

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    if (n <= 0) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    setActive(Math.round(ratio * (n - 1)));
  }

  if (!hasData) {
    return (
      <div className={`flex w-full items-center justify-center ${heightClassName}`}>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{emptyMessage}</p>
      </div>
    );
  }

  const lineD = polylinePath(primaryCoords);
  const areaD = lineD ? `${lineD} L 100 ${BOTTOM} L 0 ${BOTTOM} Z` : "";

  return (
    <div className="w-full">
      <div
        ref={containerRef}
        className={`relative w-full ${heightClassName}`}
        onMouseMove={handleMove}
        onMouseLeave={() => setActive(null)}
      >
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between py-1">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-px w-full bg-zinc-100 dark:bg-zinc-800/70" />
          ))}
        </div>

        <svg
          className="absolute inset-0 h-full w-full overflow-visible"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={series[0]?.color ?? "#2563eb"} stopOpacity="0.28" />
              <stop offset="100%" stopColor={series[0]?.color ?? "#2563eb"} stopOpacity="0" />
            </linearGradient>
          </defs>

          {area && areaD ? (
            <path className="area-fade" d={areaD} fill={`url(#${gradientId})`} style={{ animationDelay: "0.85s" }} />
          ) : null}

          {series.map((s) => {
            const coords = s.points.map((p, i) => ({ x: xAt(i, n), y: yAt(p.value, max) }));
            return <AnimatedStrokePath key={s.id} d={polylinePath(coords)} stroke={s.color} />;
          })}

          {/* Puntos en SVG (alineados con la línea) */}
          {series.map((s) =>
            s.points.map((p, i) => {
              const cx = xAt(i, n);
              const cy = yAt(p.value, max);
              const isActive = active === i;
              const isZero = p.value <= 0;
              return (
                <circle
                  key={`${s.id}-${i}`}
                  className="dot-pop"
                  cx={cx}
                  cy={cy}
                  r={isActive ? 2.2 : isZero ? 1.2 : 1.8}
                  fill={isZero ? "transparent" : s.color}
                  stroke={s.color}
                  strokeWidth={isZero ? 1.2 : 0}
                  style={{ animationDelay: `${1 + i * 0.06}s` }}
                />
              );
            }),
          )}
        </svg>

        {active !== null ? (
          <div
            className="pointer-events-none absolute top-0 bottom-0 w-px bg-zinc-300 dark:bg-zinc-600"
            style={{ left: `${xAt(active, n)}%` }}
          />
        ) : null}

        {active !== null ? (
          <div
            className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full"
            style={{
              left: `${Math.min(88, Math.max(12, xAt(active, n)))}%`,
              top: `${Math.max(12, yAt(series[0]?.points[active]?.value ?? 0, max) - 6)}%`,
            }}
          >
            <div className="rounded-xl border border-zinc-200/90 bg-white px-3 py-2 text-left shadow-[0_18px_44px_-14px_rgba(15,23,42,0.5)] ring-1 ring-black/5 dark:border-zinc-600 dark:bg-zinc-800 dark:ring-white/10">
              <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                {labels[active]}
              </p>
              <div className="mt-1 space-y-0.5">
                {series.map((s) => (
                  <p key={s.id} className="flex items-center gap-2 text-xs tabular-nums">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="text-zinc-500 dark:text-zinc-400">{s.name}</span>
                    <span className="ml-auto font-semibold text-zinc-900 dark:text-zinc-50">
                      {formatMoneyEUR(s.points[active]?.value ?? 0)}
                    </span>
                  </p>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-2 flex w-full justify-between">
        {labels.map((label, i) => (
          <span
            key={`${label}-${i}`}
            className="min-w-0 flex-1 truncate px-0.5 text-center text-[9px] font-medium text-zinc-400 dark:text-zinc-500 sm:text-[10px]"
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
