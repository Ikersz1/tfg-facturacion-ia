import { FiscalProfileForm } from "@/components/fiscal-profile-form";
import { PageHeader } from "@/components/page-header";
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
    .select("legal_name, tax_id, address")
    .eq("user_id", user.id)
    .maybeSingle();

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
          Verifacti), al emitir una factura se enviará el registro a Verifacti. El cliente debe tener NIF/CIF.
        </p>
        <p className="max-w-lg text-sm text-zinc-600 dark:text-zinc-400">
          <strong className="font-medium text-zinc-800 dark:text-zinc-200">Webhook (opcional):</strong> endpoint{" "}
          <code className="rounded bg-zinc-100 px-1 text-xs dark:bg-zinc-800">
            POST /api/verifacti/webhook
          </code>
          . URL ejemplo:{" "}
          <code className="break-all rounded bg-zinc-100 px-1 text-xs dark:bg-zinc-800">
            https://TU-PROYECTO.vercel.app/api/verifacti/webhook?token=TU_SECRETO
          </code>
          . Define <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">VERIFACTI_WEBHOOK_SECRET</code> en
          Vercel con el mismo valor que <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">token</code>, y
          añade <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">SUPABASE_SERVICE_ROLE_KEY</code> para que
          el webhook pueda actualizar facturas. En cuenta gratuita Verifacti a veces no habilita webhooks; entonces usa
          el botón «Comprobar estado AEAT» en la factura.
        </p>
        <FiscalProfileForm
          initialLegalName={row?.legal_name ?? ""}
          initialTaxId={row?.tax_id ?? ""}
          initialAddress={row?.address ?? ""}
        />
      </div>
    </div>
  );
}
