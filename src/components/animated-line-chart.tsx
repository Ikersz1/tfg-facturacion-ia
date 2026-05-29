"use client";

import { useId, useRef, useState } from "react";

export type LinePoint = { label: string; value: number };
export type LineSeries = { id: string; name: string; color: string; points: LinePoint[] };

type Props = {
  series: LineSeries[];
  /** Relleno de área degradado bajo la primera serie. */
  area?: boolean;
  formatValue?: (n: number) => string;
  /** Altura del área de dibujo. */
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

/** Curva suave (Catmull-Rom → Bézier) para un trazo bonito. */
function smoothPath(coords: { x: number; y: number }[]): string {
  if (coords.length === 0) return "";
  if (coords.length === 1) return `M ${coords[0].x} ${coords[0].y}`;
  let d = `M ${coords[0].x} ${coords[0].y}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = coords[i - 1] ?? coords[i];
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const p3 = coords[i + 2] ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d;
}

export function AnimatedLineChart({
  series,
  area = false,
  formatValue = (n) => String(n),
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

  return (
    <div className="w-full">
      <div
        ref={containerRef}
        className={`relative w-full ${heightClassName}`}
        onMouseMove={handleMove}
        onMouseLeave={() => setActive(null)}
      >
        {/* Líneas de base horizontales */}
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

          {area && series[0] ? (
            (() => {
              const coords = series[0].points.map((p, i) => ({ x: xAt(i, n), y: yAt(p.value, max) }));
              const line = smoothPath(coords);
              const areaPath = `${line} L 100 100 L 0 100 Z`;
              return (
                <path
                  className="area-fade"
                  d={areaPath}
                  fill={`url(#${gradientId})`}
                  style={{ animationDelay: "0.9s" }}
                />
              );
            })()
          ) : null}

          {series.map((s) => {
            const coords = s.points.map((p, i) => ({ x: xAt(i, n), y: yAt(p.value, max) }));
            return (
              <path
                key={s.id}
                className="line-draw"
                d={smoothPath(coords)}
                fill="none"
                stroke={s.color}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                pathLength={1}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        </svg>

        {/* Guía vertical en el punto activo */}
        {active !== null ? (
          <div
            className="pointer-events-none absolute top-0 bottom-0 w-px bg-zinc-300 dark:bg-zinc-600"
            style={{ left: `${xAt(active, n)}%` }}
          />
        ) : null}

        {/* Puntos (uno por serie) */}
        {series.map((s) =>
          s.points.map((p, i) => {
            const isActive = active === i;
            return (
              <span
                key={`${s.id}-${i}`}
                className="dot-pop absolute z-10 block rounded-full border-2 border-white shadow-sm dark:border-zinc-900"
                style={{
                  left: `${xAt(i, n)}%`,
                  top: `${yAt(p.value, max)}%`,
                  width: isActive ? 12 : 8,
                  height: isActive ? 12 : 8,
                  backgroundColor: s.color,
                  animationDelay: `${1.1 + i * 0.05}s`,
                }}
              />
            );
          }),
        )}

        {/* Tooltip */}
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
                      {formatValue(s.points[active]?.value ?? 0)}
                    </span>
                  </p>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Etiquetas del eje X */}
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
