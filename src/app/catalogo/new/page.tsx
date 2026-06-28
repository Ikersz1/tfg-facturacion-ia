import { ProductForm } from "@/components/product-form";
import { PageHeader } from "@/components/page-header";
import { catalogKindLabel, parseCatalogKind, type CatalogKind } from "@/lib/catalog-kind";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CatalogoNewPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const raw = typeof sp.kind === "string" ? sp.kind : undefined;
  const allowKindSelect = sp.allowKindSelect === "1";
  const kind: CatalogKind = parseCatalogKind(raw);
  const label = catalogKindLabel(kind);

  return (
    <div className="flex w-full flex-1 flex-col">
      <PageHeader
        back={{ href: `/catalogo?kind=${kind}`, ariaLabel: "Volver al catálogo" }}
        eyebrow="Catálogo"
        title={allowKindSelect ? "Nuevo ítem de catálogo" : `Nuevo ${label.toLowerCase()}`}
        description="Completa los campos y vuelve al listado."
      />
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-8 sm:px-6">
        <div className="mx-auto w-full max-w-lg">
          <ProductForm key={kind} defaultKind={kind} lockKind={!allowKindSelect} />
        </div>
      </div>
    </div>
  );
}
