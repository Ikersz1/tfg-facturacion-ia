import Link from "next/link";
import { Suspense } from "react";
import { AutoDismissNotice } from "@/components/auto-dismiss-notice";
import { CatalogKindTabs } from "@/components/catalog-kind-tabs";
import { CatalogRowMenu } from "@/components/catalog-row-menu";
import { PageHeader } from "@/components/page-header";
import { ListPagination } from "@/components/list-pagination";
import { buildCatalogListUrl, parseCatalogListSearch } from "@/lib/catalog-list-url";
import { catalogKindLabelPlural } from "@/lib/catalog-kind";
import { paginateRows } from "@/lib/list-page";
import { formatMoneyEUR } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CatalogoPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const filters = parseCatalogListSearch(sp);
  const kind = filters.kind;
  const notice = typeof sp.notice === "string" ? sp.notice : undefined;

  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("products")
    .select("id, name, sku, unit_price, tax_rate, is_active, kind, created_at")
    .eq("kind", kind)
    .order("created_at", { ascending: false });

  const title = catalogKindLabelPlural(kind);
  const newHref = `/catalogo/new?kind=${kind}`;
  const allRows = rows ?? [];
  const { pageRows, currentPage, totalPages, totalItems } = paginateRows(
    allRows,
    filters.page ?? 1,
  );
  const itemLabelSingular = kind === "service" ? "servicio" : "producto";
  const itemLabelPlural = kind === "service" ? "servicios" : "productos";

  return (
    <div className="flex w-full flex-1 flex-col">
      <PageHeader eyebrow="Gestión" title="Catálogo" />
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <CatalogKindTabs activeKind={kind} />
          <Link
            href={newHref}
            className="inline-flex h-10 shrink-0 items-center justify-center rounded-md bg-brand px-4 text-sm font-medium text-brand-fg transition hover:bg-brand-hover"
          >
            Nuevo {kind === "service" ? "servicio" : "producto"}
          </Link>
        </div>

        <section className="min-w-0">
          <Suspense fallback={null}>
            {notice === "deleted" ? (
              <AutoDismissNotice
                tone="success"
                message={`${kind === "service" ? "Servicio" : "Producto"} eliminado correctamente.`}
              />
            ) : null}
            {notice === "deactivated" ? (
              <AutoDismissNotice
                tone="warning"
                message="No se pudo borrar del todo porque está usado en facturas; se ha marcado como inactivo."
              />
            ) : null}
            {notice === "delete_error" ? (
              <AutoDismissNotice
                tone="error"
                message={`No se pudo eliminar el ${itemLabelSingular}. Inténtalo de nuevo.`}
              />
            ) : null}
          </Suspense>
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="text-base font-medium text-zinc-900 dark:text-zinc-100">{title}</h2>
            {totalItems > 0 ? (
              <span className="text-sm text-zinc-500 dark:text-zinc-400">{totalItems}</span>
            ) : null}
          </div>
          {error ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/35 dark:text-red-100">
              No se pudo cargar la lista: {error.message}
              {error.message.includes("kind") ||
              error.message.toLowerCase().includes("column") ? (
                <span className="mt-2 block text-xs opacity-90">
                  Ejecuta en Supabase la migración{" "}
                  <code className="rounded-md bg-red-100/90 px-1.5 py-0.5 font-mono text-[11px] dark:bg-red-900/50">
                    20260514120000_products_catalog_kind.sql
                  </code>
                  .
                </span>
              ) : null}
            </p>
          ) : !rows?.length ? (
            <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-4 py-10 text-center dark:border-zinc-600 dark:bg-zinc-900/50">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">No hay {title.toLowerCase()} todavía.</p>
              <Link
                href={newHref}
                className="mt-4 inline-flex h-9 items-center rounded-md bg-brand px-4 text-sm font-medium text-brand-fg transition hover:bg-brand-hover"
              >
                Crear el primero
              </Link>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[32rem] text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/50">
                      <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">Nombre</th>
                      <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">
                        {kind === "service" ? "Ref." : "SKU"}
                      </th>
                      <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">Precio</th>
                      <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">IVA</th>
                      <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {pageRows.map((p) => (
                      <tr key={p.id as string}>
                        <td className="px-4 py-3 text-zinc-900 dark:text-zinc-50">{p.name as string}</td>
                        <td className="px-4 py-3 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                          {(p.sku as string | null) ?? "—"}
                        </td>
                        <td className="px-4 py-3 tabular-nums text-zinc-700 dark:text-zinc-300">
                          {formatMoneyEUR(p.unit_price)}
                        </td>
                        <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                          {p.tax_rate != null ? `${p.tax_rate} %` : "—"}
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                          <div className="flex items-center justify-between gap-2">
                            <span>{p.is_active ? "Activo" : "Inactivo"}</span>
                            <CatalogRowMenu productId={p.id as string} kind={kind} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ListPagination
                page={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                itemLabelSingular={itemLabelSingular}
                itemLabelPlural={itemLabelPlural}
                hrefForPage={(p) => buildCatalogListUrl(filters, p)}
              />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
