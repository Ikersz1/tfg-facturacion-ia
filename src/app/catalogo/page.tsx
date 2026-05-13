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
        description="Productos y servicios; elige la pestaña y crea ítems para las facturas."
      />
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
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="text-base font-medium text-zinc-900 dark:text-zinc-100">{title}</h2>
            {rows && rows.length > 0 ? (
              <span className="text-sm text-zinc-500 dark:text-zinc-400">
                {rows.length}
              </span>
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
                    {rows.map((p) => (
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
                          {p.is_active ? "Activo" : "Inactivo"}
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
