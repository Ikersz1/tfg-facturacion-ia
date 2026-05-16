import { NewInvoiceForm } from "@/components/new-invoice-form";
import { PageHeader } from "@/components/page-header";
import { loadInvoiceSeriesHints } from "@/lib/invoice-series-hints";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function NewInvoicePage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const clientIdParam =
    typeof sp.client_id === "string" ? sp.client_id : undefined;

  const supabase = await createClient();
  const { data: clients } = await supabase
    .from("clients")
    .select("id, name")
    .order("name");

  const defaultClientId =
    clientIdParam &&
    clients?.some((c) => c.id === clientIdParam)
      ? clientIdParam
      : undefined;

  const defaultYear = new Date().getFullYear();
  const seriesHints = await loadInvoiceSeriesHints(supabase, defaultYear);

  return (
    <div className="flex w-full flex-1 flex-col">
      <PageHeader
        back={{ href: "/invoices", ariaLabel: "Volver a facturas" }}
        eyebrow="Facturación"
        title="Nueva factura"
        description="Se creará un borrador que podrás editar y numerar al emitir."
      />
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-8 sm:px-6">
        <NewInvoiceForm
          clients={clients ?? []}
          defaultClientId={defaultClientId}
          seriesHints={seriesHints}
          defaultYear={defaultYear}
        />
      </div>
    </div>
  );
}
