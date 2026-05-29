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

  const email = user.email ?? "";
  const initial = (email.trim()[0] ?? "U").toUpperCase();
  const legalName = (row?.legal_name as string | null)?.trim();

  return (
    <div className="flex w-full flex-1 flex-col">
      <PageHeader
        eyebrow="Cuenta"
        title="Perfil"
        description="Tu cuenta y los datos fiscales del emisor usados en facturas, PDF e integración Verifacti."
      />
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
        {/* Tarjeta de cuenta */}
        <div className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-gradient-to-br from-brand-soft/40 to-white p-5 shadow-sm dark:border-zinc-700 dark:from-zinc-800/60 dark:to-zinc-900">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-brand text-xl font-bold text-brand-fg">
            {initial}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold text-zinc-900 dark:text-zinc-50">
              {legalName || "Mi cuenta"}
            </p>
            <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">{email}</p>
          </div>
          <span className="hidden shrink-0 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700 sm:inline-flex dark:bg-emerald-900/40 dark:text-emerald-300">
            Sesión activa
          </span>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 px-4 py-3 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/40 dark:text-zinc-400">
          Si defines <code className="rounded bg-zinc-200/70 px-1 dark:bg-zinc-700/70">VERIFACTI_NIF_API_KEY</code>{" "}
          en el servidor (clave <code className="rounded bg-zinc-200/70 px-1 dark:bg-zinc-700/70">vf_test_…</code> de
          Verifacti), al emitir una factura se enviará el registro a Verifacti. El cliente debe tener NIF/CIF. Para
          comprobar el estado en la AEAT usa el botón «Comprobar estado AEAT» en el detalle de la factura.
        </div>

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
