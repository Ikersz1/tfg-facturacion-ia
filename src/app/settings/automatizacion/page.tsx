import { AutomationSettingsForm } from "@/components/automation-settings-form";
import { PageHeader } from "@/components/page-header";
import { isN8nIntegrationConfigured } from "@/lib/n8n/verify-request";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AutomationSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: row, error } = await supabase
    .from("user_fiscal_profile")
    .select("n8n_auto_email_on_issue")
    .eq("user_id", user.id)
    .maybeSingle();

  const autoEmail = row?.n8n_auto_email_on_issue === true;
  const webhookConfigured = isN8nIntegrationConfigured();

  return (
    <div className="flex w-full flex-1 flex-col">
      <PageHeader
        back={{ href: "/", ariaLabel: "Volver al inicio" }}
        eyebrow="Automatización"
        title="Integraciones (n8n)"
        description="Controla si al emitir una factura se envía automáticamente el correo al cliente."
      />
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
        {error?.message.includes("n8n_auto_email_on_issue") ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            Falta aplicar la migración{" "}
            <code className="rounded bg-red-100 px-1 dark:bg-red-900/60">
              20260527190000_n8n_auto_email_on_issue.sql
            </code>{" "}
            en Supabase.
          </p>
        ) : null}

        <p className="max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          Cada usuario del panel tiene su propia preferencia. El flujo en n8n (webhook → descarga
          PDF → Gmail) debe estar publicado en tu instancia de n8n. Consulta{" "}
          <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">
            docs/n8n-flujo-1-factura-emitida.md
          </code>{" "}
          en el repositorio.
        </p>

        <AutomationSettingsForm
          initialAutoEmail={autoEmail}
          webhookConfigured={webhookConfigured}
        />
      </div>
    </div>
  );
}
