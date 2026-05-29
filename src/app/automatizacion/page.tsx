import { AutomationSettingsForm } from "@/components/automation-settings-form";
import { PageHeader } from "@/components/page-header";
import { isN8nIntegrationConfigured } from "@/lib/n8n/verify-request";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AutomationPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: row, error } = await supabase
    .from("user_fiscal_profile")
    .select(
      "n8n_auto_email_on_issue, n8n_notify_issuer_on_overdue, n8n_auto_reminder_client, n8n_weekly_summary_enabled, n8n_reminder_grace_days",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  const autoEmail = row?.n8n_auto_email_on_issue === true;
  const notifyIssuerOnOverdue = row?.n8n_notify_issuer_on_overdue === true;
  const autoReminderClient = row?.n8n_auto_reminder_client === true;
  const weeklySummary = row?.n8n_weekly_summary_enabled === true;
  const graceDays = Math.max(1, Number(row?.n8n_reminder_grace_days) || 3);

  const webhookConfigured = isN8nIntegrationConfigured();
  const secretConfigured = Boolean(process.env.N8N_WEBHOOK_SECRET?.trim());

  const migrationMissing =
    error?.message.includes("n8n_auto_email_on_issue") ||
    error?.message.includes("n8n_notify_issuer_on_overdue") ||
    error?.message.includes("n8n_reminder_grace_days") ||
    error?.message.includes("n8n_weekly_summary_enabled");

  return (
    <div className="flex w-full flex-1 flex-col">
      <PageHeader
        eyebrow="Configuración"
        title="Automatización"
        description="Configura los flujos automáticos de n8n: emails al emitir, recordatorios de cobro y resumen semanal."
      />
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
        {migrationMissing ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            Falta aplicar alguna migración de n8n en Supabase. Consulta{" "}
            <code className="rounded bg-red-100 px-1 dark:bg-red-900/60">supabase/migrations/</code>.
          </p>
        ) : null}

        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Cada usuario del panel tiene sus propias preferencias. Los flujos en n8n deben estar
          publicados en tu instancia. Consulta{" "}
          <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">docs/</code> en el
          repositorio para la guía de configuración de cada flujo.
        </p>

        <AutomationSettingsForm
          initialAutoEmail={autoEmail}
          initialNotifyIssuerOnOverdue={notifyIssuerOnOverdue}
          initialAutoReminderClient={autoReminderClient}
          initialWeeklySummary={weeklySummary}
          initialGraceDays={graceDays}
          webhookConfigured={webhookConfigured}
          secretConfigured={secretConfigured}
        />
      </div>
    </div>
  );
}
