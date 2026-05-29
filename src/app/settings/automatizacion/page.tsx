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
        back={{ href: "/", ariaLabel: "Volver al inicio" }}
        eyebrow="Ajustes"
        title="Automatización"
        description="Configura los flujos automáticos de n8n para emails, recordatorios y resúmenes."
      />
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6">
        {migrationMissing ? (
          <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
            <svg className="size-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            <span>
              Falta aplicar alguna migración de n8n en Supabase. Consulta{" "}
              <code className="rounded bg-red-100 px-1.5 py-0.5 font-mono text-xs dark:bg-red-900/60">supabase/migrations/</code>
            </span>
          </div>
        ) : null}

        <div className="rounded-xl border border-zinc-200/80 bg-gradient-to-br from-zinc-50 to-white p-5 dark:border-zinc-700/50 dark:from-zinc-800/50 dark:to-zinc-900">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                Configuración por usuario
              </p>
              <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                Cada usuario tiene sus propias preferencias. Los flujos deben estar activos en tu instancia de n8n.
                Consulta <code className="rounded bg-zinc-200/60 px-1.5 py-0.5 font-mono text-xs dark:bg-zinc-700/60">docs/</code> para guías de configuración.
              </p>
            </div>
          </div>
        </div>

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
