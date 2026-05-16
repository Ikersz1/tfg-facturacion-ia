"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { buildClientsListUrl, parseClientListSearch } from "@/lib/client-list-url";

const lbl =
  "text-xs font-medium leading-none text-zinc-500 dark:text-zinc-400";

export function ClientsFiltersPanel({ actionSlot }: { actionSlot?: ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const filters = useMemo(() => {
    const raw = Object.fromEntries(searchParams.entries());
    return parseClientListSearch(raw);
  }, [searchParams]);

  const [draftQ, setDraftQ] = useState(filters.q ?? "");

  useEffect(() => {
    setDraftQ(filters.q ?? "");
  }, [filters.q]);

  const hasActiveFilters = Boolean(
    (filters.q && filters.q.trim() !== "") || filters.sort,
  );

  const commit = useCallback(
    (patch: Partial<{ q: string; sort: string }>) => {
      const kind = searchParams.get("kind") ?? "company";
      const q = searchParams.get("q") ?? "";
      const sort = searchParams.get("sort") ?? "";
      const merged = { q, sort, ...patch };
      router.replace(
        buildClientsListUrl({
          kind: kind === "individual" ? "individual" : "company",
          q: merged.q.trim() || undefined,
          sort: merged.sort || undefined,
        }),
      );
    },
    [router, searchParams],
  );

  const applySearch = useCallback(() => {
    commit({ q: draftQ });
  }, [commit, draftQ]);

  const ctrl =
    "h-10 min-h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";

  return (
    <div className="mb-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div className="flex min-w-0 flex-1 flex-wrap items-end gap-x-3 gap-y-2">
          <div className="flex min-w-0 flex-1 flex-col gap-1 sm:min-w-[12rem] sm:max-w-md">
            <label htmlFor="flt-client-q" className={lbl}>
              Buscar
            </label>
            <div className="flex min-w-0 gap-2">
              <input
                id="flt-client-q"
                type="search"
                value={draftQ}
                onChange={(e) => setDraftQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    applySearch();
                  }
                }}
                onBlur={() => {
                  if (draftQ.trim() !== (filters.q ?? "").trim()) applySearch();
                }}
                placeholder="Nombre, NIF, email o teléfono…"
                className={`${ctrl} min-w-0 flex-1`}
                autoComplete="off"
              />
              <button
                type="button"
                onClick={applySearch}
                className="inline-flex h-10 shrink-0 items-center rounded-md border border-zinc-200 bg-zinc-50 px-3 text-sm font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
              >
                Buscar
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="flt-client-sort" className={lbl}>
              Orden
            </label>
            <select
              id="flt-client-sort"
              value={filters.sort ?? ""}
              onChange={(e) => commit({ sort: e.target.value })}
              className={`${ctrl} w-[11rem] sm:w-[12.5rem]`}
            >
              <option value="">Más recientes</option>
              <option value="name_asc">Nombre A → Z</option>
              <option value="name_desc">Nombre Z → A</option>
            </select>
          </div>

          {hasActiveFilters ? (
            <div className="flex items-end pb-0.5">
              <Link
                href={buildClientsListUrl({
                  kind:
                    searchParams.get("kind") === "individual"
                      ? "individual"
                      : "company",
                })}
                className="group inline-flex h-10 items-center gap-2 rounded-md border border-zinc-200 bg-white px-3.5 text-sm font-medium text-zinc-600 shadow-sm outline-none transition hover:border-brand-border hover:bg-brand-soft hover:text-accent focus-visible:ring-2 focus-visible:ring-brand/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300 dark:shadow-none dark:hover:border-brand-border dark:hover:bg-brand-soft dark:hover:text-accent dark:focus-visible:ring-brand/35 dark:focus-visible:ring-offset-zinc-900"
                title="Quitar todos los filtros"
              >
                <svg
                  className="h-4 w-4 shrink-0 text-zinc-400 transition group-hover:text-brand dark:text-zinc-500 dark:group-hover:text-accent"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  aria-hidden
                >
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
                Limpiar filtros
              </Link>
            </div>
          ) : null}
        </div>

        {actionSlot ? (
          <div className="flex shrink-0 justify-end sm:justify-start">{actionSlot}</div>
        ) : null}
      </div>

      <p className="mt-2 text-xs leading-snug text-zinc-400 dark:text-zinc-500">
        La búsqueda filtra por coincidencia en nombre, NIF/CIF, email o teléfono. Pulsa{" "}
        <span className="text-zinc-500 dark:text-zinc-400">Buscar</span> o Enter; al salir del campo también se aplica.
      </p>
    </div>
  );
}
