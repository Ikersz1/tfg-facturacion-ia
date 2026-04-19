"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { buildReportsQueryString, type ReportsResolvedFilters } from "@/lib/reports-query";
import {
  detectInformesPreset,
  formatInformesRangeLabel,
  rangeForPreset,
  type InformesRangePresetId,
} from "@/lib/informes-range-presets";

const PRESETS: { id: Exclude<InformesRangePresetId, "custom">; label: string }[] = [
  { id: "week", label: "Esta semana" },
  { id: "month", label: "Este mes" },
  { id: "last12", label: "12 meses" },
];

export function InformesRangeToolbar({ filters }: { filters: ReportsResolvedFilters }) {
  const router = useRouter();
  const active = detectInformesPreset(filters.from, filters.to);
  const [customOpen, setCustomOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState(filters.from);
  const [draftTo, setDraftTo] = useState(filters.to);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCustomOpen(false);
  }, [filters.from, filters.to, filters.clientId, filters.granularity]);

  useEffect(() => {
    if (!customOpen) return;
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setCustomOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [customOpen]);

  function navigate(from: string, to: string) {
    const preset = detectInformesPreset(from, to);
    const next: ReportsResolvedFilters = {
      ...filters,
      from,
      to,
      granularity:
        preset === "month" || preset === "week"
          ? "week"
          : preset === "last12"
            ? "month"
            : filters.granularity,
    };
    router.push(`/informes?${buildReportsQueryString(next)}`);
  }

  function applyCustom() {
    let from = draftFrom.slice(0, 10);
    let to = draftTo.slice(0, 10);
    if (from > to) {
      const t = from;
      from = to;
      to = t;
    }
    navigate(from, to);
    setCustomOpen(false);
  }

  return (
    <div ref={wrapRef} className="relative flex w-full flex-col gap-2 sm:w-auto sm:items-end">
      <div className="flex min-h-10 w-full flex-wrap gap-1 rounded-xl border border-zinc-200/90 bg-zinc-50 p-0.5 dark:border-zinc-600 dark:bg-zinc-900 sm:w-auto sm:flex-nowrap">
        {PRESETS.map(({ id, label }) => {
          const isOn = active === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => {
                const r = rangeForPreset(id);
                navigate(r.from, r.to);
              }}
              className={
                isOn
                  ? "flex min-h-9 flex-1 items-center justify-center rounded-lg bg-white px-2.5 text-xs font-medium text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100 sm:flex-initial sm:px-3"
                  : "flex min-h-9 flex-1 items-center justify-center rounded-lg px-2.5 text-xs font-medium text-zinc-600 transition hover:bg-zinc-100/80 dark:text-zinc-400 dark:hover:bg-zinc-800/80 sm:flex-initial sm:px-3"
              }
            >
              {label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => {
            setCustomOpen((o) => {
              const next = !o;
              if (next) {
                setDraftFrom(filters.from);
                setDraftTo(filters.to);
              }
              return next;
            });
          }}
          className={
            active === "custom"
              ? "flex min-h-9 flex-1 items-center justify-center rounded-lg bg-white px-2.5 text-xs font-medium text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100 sm:flex-initial sm:px-3"
              : "flex min-h-9 flex-1 items-center justify-center rounded-lg px-2.5 text-xs font-medium text-zinc-600 transition hover:bg-zinc-100/80 dark:text-zinc-400 dark:hover:bg-zinc-800/80 sm:flex-initial sm:px-3"
          }
        >
          Personalizado
        </button>
      </div>

      {customOpen ? (
        <div className="absolute right-0 top-full z-20 mt-2 w-[min(100vw-2rem,20rem)] rounded-xl border border-zinc-200 bg-white p-4 shadow-lg dark:border-zinc-600 dark:bg-zinc-900 sm:w-80">
          <p className="mb-3 text-xs font-medium text-zinc-700 dark:text-zinc-300">Rango de fechas</p>
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
              Desde
              <input
                type="date"
                value={draftFrom}
                onChange={(e) => setDraftFrom(e.target.value)}
                className="rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
              Hasta
              <input
                type="date"
                value={draftTo}
                onChange={(e) => setDraftTo(e.target.value)}
                className="rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </label>
            <div className="mt-1 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCustomOpen(false)}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={applyCustom}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 dark:bg-sky-600 dark:hover:bg-sky-500"
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function InformesRangeHeading({ filters }: { filters: ReportsResolvedFilters }) {
  const subtitle = formatInformesRangeLabel(filters.from, filters.to);
  return (
    <div>
      <h2 className="text-sm font-semibold text-blue-800 dark:text-sky-300">Periodo del informe</h2>
      <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">{subtitle}</p>
    </div>
  );
}
