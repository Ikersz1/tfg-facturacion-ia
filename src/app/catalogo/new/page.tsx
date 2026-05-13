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
  const kind: CatalogKind = parseCatalogKind(raw);
  const label = catalogKindLabel(kind);

  return (
    <div className="flex w-full flex-1 flex-col">
      <PageHeader
        back={{ href: `/catalogo?kind=${kind}`, label: "← Catálogo" }}
        eyebrow="Gestión · Catálogo"
        title={`Nuevo ${label.toLowerCase()}`}
        description={
          kind === "service"
            ? "Horas, honorarios, mantenimientos u otros servicios facturables."
            : "Artículos físicos o digitales con precio e IVA."
        }
      />
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-8 sm:px-6">
        <div className="mx-auto w-full max-w-lg">
          <ProductForm key={kind} defaultKind={kind} lockKind />
        </div>
      </div>
    </div>
  );
}
