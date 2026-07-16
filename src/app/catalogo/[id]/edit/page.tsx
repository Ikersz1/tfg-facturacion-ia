import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { ProductForm } from "@/components/product-form";
import { parseCatalogKind } from "@/lib/catalog-kind";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function CatalogItemEditPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: product, error } = await supabase
    .from("products")
    .select("id, name, description, sku, unit_price, tax_rate, is_active, kind")
    .eq("id", id)
    .maybeSingle();

  if (error || !product) {
    notFound();
  }

  const kind = parseCatalogKind(typeof product.kind === "string" ? product.kind : undefined);

  return (
    <div className="flex w-full flex-1 flex-col">
      <PageHeader
        back={{ href: `/catalogo?kind=${kind}`, ariaLabel: "Volver al catálogo" }}
        eyebrow="Catálogo"
        title="Editar ítem de catálogo"
        description="Modifica el producto o servicio y guarda los cambios."
      />
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-8 sm:px-6">
        <div className="mx-auto w-full max-w-lg">
          <ProductForm
            mode="edit"
            productId={product.id}
            defaultKind={kind}
            lockKind
            initialValues={{
              name: product.name ?? "",
              description: product.description,
              sku: product.sku,
              unitPrice: Number(product.unit_price),
              taxRate: Number(product.tax_rate),
              isActive: Boolean(product.is_active),
            }}
          />
        </div>
      </div>
    </div>
  );
}
