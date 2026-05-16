"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, type ReactNode } from "react";
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

export function InvoicesFiltersPanel({
  clients,
  actionSlot,
}: {
  clients: ClientOpt[];
  actionSlot?: ReactNode;
}) {
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

  const ctrl =
    "h-10 min-h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";

  return (
    <div className="mb-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div className="flex min-w-0 flex-1 flex-wrap items-end gap-x-3 gap-y-2">
        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor="flt-client" className={lbl}>
            Cliente
          </label>
          <select
            id="flt-client"
            value={filters.client_id ?? ""}
            onChange={(e) => commit({ client_id: e.target.value })}
            className={`${ctrl} max-w-[11rem] sm:max-w-[14rem]`}
          >
            <option value="">Todos</option>
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
            className={`${ctrl} w-[8.5rem]`}
          >
            {STATUS_OPTS.map((o) => (
              <option key={o.value || "all"} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex min-w-0 flex-col gap-1">
          <span className={lbl}>Emisión (fecha factura)</span>
          <div className="flex items-center gap-1">
            <input
              id="flt-from"
              type="date"
              value={filters.from ?? ""}
              onChange={(e) => commit({ from: e.target.value })}
              className={`${ctrl} w-[10.25rem]`}
              title="Desde"
            />
            <span className="pb-1 text-xs text-zinc-400">a</span>
            <input
              id="flt-to"
              type="date"
              value={filters.to ?? ""}
              onChange={(e) => commit({ to: e.target.value })}
              className={`${ctrl} w-[10.25rem]`}
              title="Hasta"
            />
          </div>
        </div>

        {hasActiveFilters ? (
          <div className="flex items-end pb-0.5">
            <Link
              href="/invoices"
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
        Las fechas filtran por <span className="text-zinc-500 dark:text-zinc-400">día de emisión</span> de la
        factura. Si marcas rango, no se listan borradores sin fecha.
        {filters.segment ? (
          <span className="mt-1 block text-zinc-500 dark:text-zinc-400">
            Vista desde el donut de informes (segmento{" "}
            {filters.segment === "paid"
              ? "pagadas"
              : filters.segment === "pend"
                ? "pendientes"
                : "vencidas"}
            ). Cambia un filtro para salir de esta vista.
          </span>
        ) : null}
      </p>
    </div>
  );
}
