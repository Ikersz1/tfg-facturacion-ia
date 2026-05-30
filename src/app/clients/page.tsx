import Link from "next/link";
import { Suspense } from "react";
import { AssistantContextualCta } from "@/components/assistant-contextual-cta";
import { ClientKindTabs } from "@/components/client-kind-tabs";
import { ClientsFiltersPanel } from "@/components/clients-filters-panel";
import { PageHeader } from "@/components/page-header";
import {
  clientKindLabel,
  clientKindLabelPlural,
  clientTaxIdLabel,
  parseClientKind,
  type ClientKind,
} from "@/lib/client-kind";
import { ListPagination } from "@/components/list-pagination";
import { buildClientsListPageUrl, parseClientListSearch } from "@/lib/client-list-url";
import { paginateRows } from "@/lib/list-page";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  name: string;
  tax_id: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  kind: string;
  created_at: string;
};

function filterByQuery(rows: Row[], q: string | undefined): Row[] {
  const needle = q?.trim().toLowerCase();
  if (!needle) return rows;
  return rows.filter((c) => {
    const hay = [c.name, c.tax_id ?? "", c.email ?? "", c.phone ?? ""]
      .join(" ")
      .toLowerCase();
    return hay.includes(needle);
  });
}

function sortRows(rows: Row[], sort: "name_asc" | "name_desc" | undefined): Row[] {
  const copy = [...rows];
  if (sort === "name_asc") {
    copy.sort((a, b) => a.name.localeCompare(b.name, "es"));
  } else if (sort === "name_desc") {
    copy.sort((a, b) => b.name.localeCompare(a.name, "es"));
  } else {
    copy.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }
  return copy;
}

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ClientsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const filters = parseClientListSearch(sp);
  const kind: ClientKind = filters.kind ?? "company";
  const kindLabel = clientKindLabelPlural(kind);
  const newHref = `/clients/new?kind=${kind}`;

  const supabase = await createClient();
  const { data: raw, error } = await supabase
    .from("clients")
    .select("id, name, tax_id, email, phone, address, kind, created_at")
    .eq("kind", kind)
    .order("created_at", { ascending: false });

  const all = (raw ?? []) as Row[];
  const filtered = filterByQuery(all, filters.q);
  const clients = sortRows(filtered, filters.sort);

  const hasFilters = Boolean(
    (filters.q && filters.q.trim() !== "") || filters.sort,
  );

  const { pageRows, currentPage, totalPages, totalItems } = paginateRows(
    clients,
    filters.page ?? 1,
  );

  return (
    <div className="flex w-full flex-1 flex-col">
      <PageHeader eyebrow="Gestión" title="Clientes" />
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
        <ClientKindTabs activeKind={kind} />
        <Suspense
          fallback={
            <div
              className="mb-4 h-24 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800/80"
              aria-hidden
            />
          }
        >
          <ClientsFiltersPanel
            actionSlot={
              <Link
                href={newHref}
                className="inline-flex h-10 items-center rounded-lg bg-brand px-4 text-sm font-medium text-brand-fg shadow-sm hover:bg-brand-hover"
              >
                Nuevo {kind === "individual" ? "particular" : "cliente"}
              </Link>
            }
          />
        </Suspense>

        <AssistantContextualCta
          source="clients-list"
          questions={[
            "¿Cuántos clientes tengo?",
            "¿Quién es mi cliente más moroso?",
            "Abrir listado de clientes",
          ]}
        />

        <section className="min-w-0">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            {kindLabel}
          </h2>
          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
              No se pudo cargar la lista: {error.message}
              {error.message.includes("kind") ||
              error.message.includes("column") ? (
                <>
                  {" "}
                  ¿Falta la migración{" "}
                  <code className="rounded bg-red-100 px-1 dark:bg-red-900/60">
                    20260517120000_clients_kind.sql
                  </code>
                  ?
                </>
              ) : null}
            </p>
          ) : !all.length ? (
            <p className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400">
              Aún no hay clientes.{" "}
              <Link
                href={newHref}
                className="font-medium text-accent underline-offset-2 hover:text-accent-hover hover:underline"
              >
                Crea el primero
              </Link>
              .
            </p>
          ) : !clients.length ? (
            <p className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-10 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400">
              {hasFilters
                ? "Ningún cliente coincide con la búsqueda o el orden actual. Prueba a limpiar filtros o cambiar el texto."
                : "No hay clientes."}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
              <table className="w-full min-w-[32rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800">
                    <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">
                      Nombre
                    </th>
                    <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">
                      {clientTaxIdLabel(kind)}
                    </th>
                    <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">
                      Email
                    </th>
                    <th className="hidden px-4 py-3 font-medium text-zinc-700 sm:table-cell dark:text-zinc-300">
                      Teléfono
                    </th>
                    <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300" />
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((c) => (
                    <tr
                      key={c.id}
                      className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/80"
                    >
                      <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-50">
                        <span className="block">{c.name}</span>
                        <span className="mt-0.5 text-xs font-normal text-zinc-500 dark:text-zinc-400">
                          {clientKindLabel(parseClientKind(c.kind))}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                        {c.tax_id ?? "—"}
                      </td>
                      <td className="max-w-[12rem] truncate px-4 py-3 text-zinc-600 dark:text-zinc-400">
                        {c.email ?? "—"}
                      </td>
                      <td className="hidden px-4 py-3 text-zinc-600 sm:table-cell dark:text-zinc-400">
                        {c.phone ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/clients/${c.id}`}
                          className="font-medium text-accent hover:text-accent-hover hover:underline"
                        >
                          Ficha
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <ListPagination
                page={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                itemLabelSingular="cliente"
                itemLabelPlural="clientes"
                hrefForPage={(p) => buildClientsListPageUrl(filters, p)}
              />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
