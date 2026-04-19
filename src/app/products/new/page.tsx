import { ProductForm } from "@/components/product-form";
import { PageHeader } from "@/components/page-header";

export default function NewProductPage() {
  return (
    <div className="flex w-full flex-1 flex-col">
      <PageHeader
        back={{ href: "/products", label: "← Productos" }}
        eyebrow="Facturación"
        title="Nuevo producto / servicio"
      />
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-8 sm:px-6">
        <ProductForm />
      </div>
    </div>
  );
}
