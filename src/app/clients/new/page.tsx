import { ClientForm } from "@/components/client-form";
import { PageHeader } from "@/components/page-header";
import { clientKindLabel, parseClientKind, type ClientKind } from "@/lib/client-kind";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function NewClientPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const raw = typeof sp.kind === "string" ? sp.kind : undefined;
  const kind: ClientKind = parseClientKind(raw);
  const label = clientKindLabel(kind);

  return (
    <div className="flex w-full flex-1 flex-col">
      <PageHeader
        back={{ href: `/clients?kind=${kind}`, ariaLabel: "Volver a clientes" }}
        eyebrow="Facturación"
        title={`Nuevo ${label.toLowerCase()}`}
      />
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-8 sm:px-6">
        <ClientForm key={kind} defaultKind={kind} lockKind />
      </div>
    </div>
  );
}
