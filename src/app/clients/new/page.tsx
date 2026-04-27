import { ClientForm } from "@/components/client-form";
import { PageHeader } from "@/components/page-header";

export default function NewClientPage() {
  return (
    <div className="flex w-full flex-1 flex-col">
      <PageHeader
        back={{ href: "/clients", label: "← Clientes" }}
        eyebrow="Facturación"
        title="Nuevo cliente"
      />
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-8 sm:px-6">
        <ClientForm />
      </div>
    </div>
  );
}
