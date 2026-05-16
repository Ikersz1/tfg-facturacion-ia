"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { buildInvoicesListUrl, parseInvoiceListSearch } from "@/lib/invoice-list-url";

type ClientOpt = { id: string; name: string };

const STATUS_OPTS = [
  { value: "", label: "Todos" },
  { value: "draft", label: "Borrador" },
  { value: "issued", label: "Emitida" },
  { value: "partial", label: "Parcialmente pagada" },
  { value: "paid", label: "Pagada" },
  { value: "overdue", label: "Vencida" },
  { value: "cancelled", label: "Anulada" },
];

const lbl =
  "text-xs font-medium leading-none text-zinc-500 dark:text-zinc-400";

const ctrl =
  "h-10 min-h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";

export function InvoicesFiltersPanel({ clients }: { clients: ClientOpt[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const filters = useMemo(() => {
    const raw = Object.fromEntries(searchParams.entries());
    return parseInvoiceListSearch(raw);
  }, [searchParams]);

  const hasActiveFilters = Boolean(
    filters.client_id || filters.status || filters.from || filters.to || filters.segment,
  );

  const commit = useCallback(
    (patch: Partial<{ client_id: string; status: string; from: string; to: string; segment: string }>) => {
      const cur = {
        client_id: searchParams.get("client_id") ?? "",
        status: searchParams.get("status") ?? "",
        from: searchParams.get("from") ?? "",
        to: searchParams.get("to") ?? "",
        segment: searchParams.get("segment") ?? "",
      };
      const merged = { ...cur, ...patch };
      if (
        "client_id" in patch ||
        "status" in patch ||
        "from" in patch ||
        "to" in patch
      ) {
        merged.segment = "";
      }
      router.replace(
        buildInvoicesListUrl({
          client_id: merged.client_id || undefined,
          status: merged.status || undefined,
          from: merged.from || undefined,
          to: merged.to || undefined,
          segment: merged.segment || undefined,
        }),
      );
    },
    [router, searchParams],
  );

  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-700 dark:bg-zinc-900/50">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_10rem_9.5rem_9.5rem_auto] lg:items-end">
        <div className="flex min-w-0 flex-col gap-1 sm:col-span-2 lg:col-span-1">
          <label htmlFor="flt-client" className={lbl}>
            Cliente
          </label>
          <select
            id="flt-client"
            value={filters.client_id ?? ""}
            onChange={(e) => commit({ client_id: e.target.value })}
            className={ctrl}
          >
            <option value="">Todos los clientes</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="flt-status" className={lbl}>
            Estado
          </label>
          <select
            id="flt-status"
            value={filters.status ?? ""}
            onChange={(e) => commit({ status: e.target.value })}
            className={ctrl}
          >
            {STATUS_OPTS.map((o) => (
              <option key={o.value || "all"} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="flt-from" className={lbl}>
            Emisión desde
          </label>
          <input
            id="flt-from"
            type="date"
            value={filters.from ?? ""}
            onChange={(e) => commit({ from: e.target.value })}
            className={ctrl}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="flt-to" className={lbl}>
            Emisión hasta
          </label>
          <input
            id="flt-to"
            type="date"
            value={filters.to ?? ""}
            onChange={(e) => commit({ to: e.target.value })}
            className={ctrl}
          />
        </div>

        {hasActiveFilters ? (
          <div className="flex items-end sm:col-span-2 lg:col-span-1">
            <Link
              href="/invoices"
              className="group inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-3.5 text-sm font-medium text-zinc-600 shadow-sm outline-none transition hover:border-brand-border hover:bg-brand-soft hover:text-accent focus-visible:ring-2 focus-visible:ring-brand/30 lg:w-auto dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-brand-border dark:hover:bg-brand-soft dark:hover:text-accent"
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
              Limpiar
            </Link>
          </div>
        ) : (
          <div className="hidden lg:block" aria-hidden />
        )}
      </div>

      <p className="mt-3 text-xs leading-snug text-zinc-500 dark:text-zinc-400">
        Filtra por día de emisión. Con rango de fechas no aparecen borradores sin fecha.
        {filters.segment ? (
          <span className="mt-1 block text-zinc-600 dark:text-zinc-300">
            Vista desde informes (
            {filters.segment === "paid"
              ? "pagadas"
              : filters.segment === "pend"
                ? "pendientes"
                : "vencidas"}
            ). Cambia un filtro para salir.
          </span>
        ) : null}
      </p>
    </div>
  );
}
