import { FiscalProfileForm } from "@/components/fiscal-profile-form";
import { PageHeader } from "@/components/page-header";
import { parseInvoicePdfTemplate } from "@/lib/invoice-pdf/template-id";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function FiscalSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: row } = await supabase
    .from("user_fiscal_profile")
    .select("legal_name, tax_id, address, invoice_pdf_template")
    .eq("user_id", user.id)
    .maybeSingle();

  const pdfTemplate = parseInvoicePdfTemplate(
    row?.invoice_pdf_template as string | null | undefined,
  );

  return (
    <div className="flex w-full flex-1 flex-col">
      <PageHeader
        back={{ href: "/", ariaLabel: "Volver al inicio" }}
        eyebrow="Cuenta"
        title="Datos fiscales del emisor"
        description="Necesarios para integración Verifacti (factura F1) y para el PDF. No sustituyen asesoramiento fiscal."
      />
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
        <p className="max-w-lg text-sm text-zinc-600 dark:text-zinc-400">
          Si defines <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">VERIFACTI_NIF_API_KEY</code>{" "}
          en el servidor (clave <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">vf_test_…</code> de
          Verifacti), al emitir una factura se enviará el registro a Verifacti. El cliente debe tener NIF/CIF. Para
          comprobar el estado en la AEAT usa el botón «Comprobar estado AEAT» en el detalle de la factura.
        </p>
        <FiscalProfileForm
          initialLegalName={row?.legal_name ?? ""}
          initialTaxId={row?.tax_id ?? ""}
          initialAddress={row?.address ?? ""}
          initialPdfTemplate={pdfTemplate}
        />
      </div>
    </div>
  );
}
