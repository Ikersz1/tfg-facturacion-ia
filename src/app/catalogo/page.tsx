import Link from "next/link";
import { CatalogKindTabs } from "@/components/catalog-kind-tabs";
import { PageHeader } from "@/components/page-header";
import { catalogKindLabelPlural, parseCatalogKind, type CatalogKind } from "@/lib/catalog-kind";
import { formatMoneyEUR } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CatalogoPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const raw = typeof sp.kind === "string" ? sp.kind : undefined;
  const kind: CatalogKind = parseCatalogKind(raw);

  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("products")
    .select("id, name, sku, unit_price, tax_rate, is_active, kind, created_at")
    .eq("kind", kind)
    .order("created_at", { ascending: false });

  const title = catalogKindLabelPlural(kind);
  const newHref = `/catalogo/new?kind=${kind}`;

  return (
    <div className="flex w-full flex-1 flex-col">
      <PageHeader
        eyebrow="Gestión"
        title="Catálogo"
        description="Unifica productos y servicios: mismos precios e IVA, distintas pestañas para organizarlos."
      />
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-5 rounded-2xl border border-zinc-200/90 bg-gradient-to-br from-white via-zinc-50/50 to-brand-soft/20 p-5 shadow-sm ring-1 ring-zinc-100/80 dark:border-zinc-700/90 dark:from-zinc-900 dark:via-zinc-950 dark:to-brand/5 dark:ring-zinc-800/80 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-6">
          <CatalogKindTabs activeKind={kind} />
          <Link
            href={newHref}
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-brand px-5 text-sm font-semibold text-brand-fg shadow-md transition hover:bg-brand-hover hover:shadow-lg active:scale-[0.99]"
          >
            <svg className="h-4 w-4 opacity-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Nuevo {kind === "service" ? "servicio" : "producto"}
          </Link>
        </div>

        <section className="min-w-0">
          <div className="mb-4 flex items-end justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              {title}
            </h2>
            {rows && rows.length > 0 ? (
              <span className="text-xs text-zinc-500 dark:text-zinc-500">
                {rows.length} {rows.length === 1 ? "ítem" : "ítems"}
              </span>
            ) : null}
          </div>
          {error ? (
            <p className="rounded-2xl border border-red-200/80 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/35 dark:text-red-100">
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
            <div className="rounded-2xl border border-dashed border-zinc-300/90 bg-zinc-50/80 px-6 py-14 text-center dark:border-zinc-600 dark:bg-zinc-900/40">
              <p className="text-base font-medium text-zinc-800 dark:text-zinc-200">Aún no hay {title.toLowerCase()}</p>
              <p className="mx-auto mt-2 max-w-sm text-sm text-zinc-600 dark:text-zinc-400">
                Crea el primero para usarlo al añadir líneas en las facturas.
              </p>
              <Link
                href={newHref}
                className="mt-6 inline-flex h-10 items-center rounded-xl bg-brand px-5 text-sm font-semibold text-brand-fg shadow-sm transition hover:bg-brand-hover"
              >
                Añadir {kind === "service" ? "servicio" : "producto"}
              </Link>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-md ring-1 ring-zinc-100/60 dark:border-zinc-700 dark:bg-zinc-900 dark:ring-zinc-800/60">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[32rem] text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 bg-zinc-50/90 dark:border-zinc-700 dark:bg-zinc-800/80">
                      <th className="px-5 py-3.5 font-semibold text-zinc-700 dark:text-zinc-300">Nombre</th>
                      <th className="px-5 py-3.5 font-semibold text-zinc-700 dark:text-zinc-300">
                        {kind === "service" ? "Ref." : "SKU"}
                      </th>
                      <th className="px-5 py-3.5 font-semibold text-zinc-700 dark:text-zinc-300">P. unitario</th>
                      <th className="px-5 py-3.5 font-semibold text-zinc-700 dark:text-zinc-300">IVA</th>
                      <th className="px-5 py-3.5 font-semibold text-zinc-700 dark:text-zinc-300">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {rows.map((p) => (
                      <tr
                        key={p.id as string}
                        className="transition-colors hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40"
                      >
                        <td className="px-5 py-3.5 font-medium text-zinc-900 dark:text-zinc-50">{p.name as string}</td>
                        <td className="px-5 py-3.5 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                          {(p.sku as string | null) ?? "—"}
                        </td>
                        <td className="px-5 py-3.5 tabular-nums text-zinc-700 dark:text-zinc-300">
                          {formatMoneyEUR(p.unit_price)}
                        </td>
                        <td className="px-5 py-3.5 text-zinc-600 dark:text-zinc-400">
                          {p.tax_rate != null ? `${p.tax_rate} %` : "—"}
                        </td>
                        <td className="px-5 py-3.5">
                          {p.is_active ? (
                            <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200">
                              Activo
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full bg-zinc-200 px-2.5 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300">
                              Inactivo
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
