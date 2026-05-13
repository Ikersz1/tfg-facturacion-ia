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
        description="Productos y servicios que puedes enlazar en las líneas de factura."
      />
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CatalogKindTabs activeKind={kind} />
          <Link
            href={newHref}
            className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-brand px-4 text-sm font-medium text-brand-fg shadow-sm hover:bg-brand-hover"
          >
            Nuevo {kind === "service" ? "servicio" : "producto"}
          </Link>
        </div>

        <section className="min-w-0">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            {title}
          </h2>
          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
              No se pudo cargar la lista: {error.message}
              {error.message.includes("kind") ||
              error.message.toLowerCase().includes("column") ? (
                <span className="mt-2 block text-xs opacity-90">
                  Ejecuta en Supabase la migración{" "}
                  <code className="rounded bg-red-100 px-1 dark:bg-red-900/50">
                    20260514120000_products_catalog_kind.sql
                  </code>
                  .
                </span>
              ) : null}
            </p>
          ) : !rows?.length ? (
            <p className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400">
              Aún no hay {title.toLowerCase()}.{" "}
              <Link href={newHref} className="font-medium text-accent underline-offset-2 hover:text-accent-hover hover:underline">
                Crea el primero
              </Link>
              .
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
              <table className="w-full min-w-[32rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800">
                    <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">Nombre</th>
                    <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">
                      {kind === "service" ? "Ref." : "SKU"}
                    </th>
                    <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">P. unitario</th>
                    <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">IVA</th>
                    <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">Activo</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((p) => (
                    <tr
                      key={p.id as string}
                      className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/80"
                    >
                      <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-50">{p.name as string}</td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                        {(p.sku as string | null) ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                        {formatMoneyEUR(p.unit_price)}
                      </td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                        {p.tax_rate != null ? `${p.tax_rate} %` : "—"}
                      </td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                        {p.is_active ? "Sí" : "No"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
