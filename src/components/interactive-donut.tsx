"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatMoneyEUR } from "@/lib/money";

export type DonutSeg = { id: string; label: string; amount: number; color: string };

type Props = {
  segments: DonutSeg[];
  emptyMessage?: string;
  /** Clave = id del segmento (p. ej. paid, pend, due). Debe ser serializable (no pasar funciones desde el servidor). */
  segmentHrefs?: Record<string, string>;
};

/** Misma precisión en Node y navegador (evita mismatch de hidratación en paths SVG). */
function svgN(n: number): string {
  return String(Number(n.toFixed(5)));
}

/** Donut sector: arco exterior horario, interior de vuelta (convención habitual SVG). */
function ringSlicePath(
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  a0: number,
  a1: number,
): string {
  if (a1 - a0 < 1e-6) return "";
  const x0 = cx + rOuter * Math.cos(a0);
  const y0 = cy + rOuter * Math.sin(a0);
  const x1 = cx + rOuter * Math.cos(a1);
  const y1 = cy + rOuter * Math.sin(a1);
  const x2 = cx + rInner * Math.cos(a1);
  const y2 = cy + rInner * Math.sin(a1);
  const x3 = cx + rInner * Math.cos(a0);
  const y3 = cy + rInner * Math.sin(a0);
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M ${svgN(x0)} ${svgN(y0)} A ${svgN(rOuter)} ${svgN(rOuter)} 0 ${large} 1 ${svgN(x1)} ${svgN(y1)} L ${svgN(x2)} ${svgN(y2)} A ${svgN(rInner)} ${svgN(rInner)} 0 ${large} 0 ${svgN(x3)} ${svgN(y3)} Z`;
}

export function InteractiveDonut({
  segments,
  emptyMessage = "Sin datos.",
  segmentHrefs,
}: Props) {
  const total = useMemo(() => segments.reduce((s, x) => s + x.amount, 0), [segments]);
  const [hoverId, setHoverId] = useState<string | null>(null);

  const paths = useMemo(() => {
    const cx = 80;
    const cy = 80;
    const rOuter = 72;
    const rInner = 42;
    let angle = -Math.PI / 2;
    const out: { id: string; d: string; color: string }[] = [];
    for (const seg of segments) {
      if (total <= 0) break;
      const sweep = (seg.amount / total) * 2 * Math.PI;
      const a0 = angle;
      const a1 = angle + sweep;
      const d = ringSlicePath(cx, cy, rOuter, rInner, a0, a1);
      if (d) out.push({ id: seg.id, d, color: seg.color });
      angle = a1;
    }
    return out;
  }, [segments, total]);

  const hovered = hoverId ? segments.find((s) => s.id === hoverId) : null;
  const centerLabel: { title: string; value: number } =
    hovered && total > 0 ? { title: hovered.label, value: hovered.amount } : { title: "Total", value: total };

  if (total <= 0) {
    return (
      <p className="py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">{emptyMessage}</p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center sm:gap-8">
      <div className="relative shrink-0">
        <svg
          width="160"
          height="160"
          viewBox="0 0 160 160"
          className="drop-shadow-sm"
          role="img"
          aria-label="Distribución por estado de factura"
        >
          {paths.map((p) => {
            const href = segmentHrefs?.[p.id];
            const common = {
              d: p.d,
              fill: p.color,
              opacity: hoverId === null || hoverId === p.id ? 1 : 0.45,
              className:
                "transition-[filter,opacity] duration-150 " +
                (href
                  ? "cursor-pointer hover:brightness-110 dark:hover:brightness-125"
                  : "cursor-default hover:brightness-110 dark:hover:brightness-125"),
              onMouseEnter: () => setHoverId(p.id),
              onMouseLeave: () => setHoverId(null),
            };
            return href ? (
              <a key={p.id} href={href} className="outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-zinc-900">
                <path {...common} />
              </a>
            ) : (
              <path key={p.id} {...common} />
            );
          })}
          <circle cx="80" cy="80" r="40" className="fill-white dark:fill-zinc-900" />
          <foreignObject x="36" y="52" width="88" height="56" className="pointer-events-none">
            <div className="flex h-full flex-col items-center justify-center px-1 text-center">
              <p className="text-[10px] font-semibold uppercase leading-tight text-zinc-500 dark:text-zinc-400">
                {centerLabel.title}
              </p>
              <p className="mt-0.5 text-sm font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
                {formatMoneyEUR(centerLabel.value)}
              </p>
            </div>
          </foreignObject>
        </svg>
      </div>
      <ul className="flex flex-col gap-2 text-sm">
        {segments.map((s) => {
          const href = segmentHrefs?.[s.id];
          const row = (
            <>
              <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: s.color }} />
              <span className="text-zinc-700 dark:text-zinc-300">{s.label}</span>
              <span className="tabular-nums text-zinc-900 dark:text-zinc-100">{formatMoneyEUR(s.amount)}</span>
              <span className="text-xs text-zinc-400 dark:text-zinc-500">
                ({total > 0 ? ((s.amount / total) * 100).toFixed(1) : "0"} %)
              </span>
            </>
          );
          return (
            <li key={s.id}>
              {href ? (
                <Link
                  href={href}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-0.5 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800/80"
                  onMouseEnter={() => setHoverId(s.id)}
                  onMouseLeave={() => setHoverId(null)}
                >
                  {row}
                </Link>
              ) : (
                <div
                  className="flex cursor-default items-center gap-2 rounded-md px-1 py-0.5 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800/80"
                  onMouseEnter={() => setHoverId(s.id)}
                  onMouseLeave={() => setHoverId(null)}
                >
                  {row}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
