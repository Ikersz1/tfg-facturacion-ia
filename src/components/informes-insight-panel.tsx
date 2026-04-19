"use client";

import { useActionState } from "react";
import { reportsInsightAction, type InsightState } from "@/app/actions/reports-insight";
import type { ReportsResolvedFilters } from "@/lib/reports-data";

const initial: InsightState = {};

export function InformesInsightPanel({ filters }: { filters: ReportsResolvedFilters }) {
  const [state, formAction, isPending] = useActionState(reportsInsightAction, initial);

  return (
    <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80">
      <h2 className="text-sm font-semibold text-blue-800 dark:text-sky-300">Preguntas rápidas (IA)</h2>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        Respuestas automáticas a partir de los datos del informe (periodo fijo: últimos 12 meses).
      </p>
      <form action={formAction} className="mt-4 flex flex-col gap-3">
        <input type="hidden" name="from" value={filters.from} />
        <input type="hidden" name="to" value={filters.to} />
        <input type="hidden" name="granularity" value={filters.granularity} />
        <input type="hidden" name="client_id" value={filters.clientId ?? "all"} />
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            name="q"
            type="text"
            placeholder='p. ej. "¿Cuál ha sido mi mejor mes?"'
            className="min-h-11 flex-1 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-brand px-4 text-sm font-medium text-brand-fg hover:bg-brand-hover disabled:opacity-60"
          >
            {isPending ? "…" : "Preguntar"}
          </button>
        </div>
      </form>
      {state.error ? (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">{state.error}</p>
      ) : null}
      {state.ok && state.text ? (
        <p className="mt-3 rounded-xl border border-brand/20 bg-brand-soft/30 px-4 py-3 text-sm leading-relaxed text-zinc-800 dark:border-brand/30 dark:bg-zinc-800/60 dark:text-zinc-200">
          {state.text}
        </p>
      ) : null}
      <p className="mt-3 text-[11px] text-zinc-400 dark:text-zinc-500">
        Sugerencias: mejor mes, deuda por cliente, trimestre, comparar con el mes pasado, resumen.
      </p>
    </div>
  );
}
