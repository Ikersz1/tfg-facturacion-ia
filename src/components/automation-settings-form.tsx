"use client";

import { useActionState } from "react";
import {
  updateAutomationSettingsAction,
  type AutomationSettingsState,
} from "@/app/actions/automation-settings";

const initial: AutomationSettingsState = {};

function ToggleRow({
  name,
  defaultChecked,
  title,
}: {
  name: string;
  defaultChecked: boolean;
  title: string;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/40">
      <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{title}</span>
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="peer sr-only" />
      <span
        aria-hidden
        className="relative h-6 w-11 shrink-0 rounded-full bg-zinc-300 transition-colors duration-200 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform after:duration-200 peer-checked:bg-brand peer-checked:after:translate-x-5 peer-focus-visible:ring-2 peer-focus-visible:ring-brand/40 dark:bg-zinc-600"
      />
    </label>
  );
}

export function AutomationSettingsForm({
  initialAutoEmail,
  initialNotifyIssuerOnOverdue,
  initialAutoReminderClient,
  initialWeeklySummary,
  initialGraceDays,
  webhookConfigured,
  secretConfigured,
}: {
  initialAutoEmail: boolean;
  initialNotifyIssuerOnOverdue: boolean;
  initialAutoReminderClient: boolean;
  initialWeeklySummary: boolean;
  initialGraceDays: number;
  webhookConfigured: boolean;
  secretConfigured: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    updateAutomationSettingsAction,
    initial,
  );

  const showIssueWarning = !webhookConfigured;
  const showRemindersWarning = !secretConfigured;

  return (
    <form action={formAction} className="flex w-full flex-col gap-6">
      {state?.error ? (
        <p
          className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-200"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}
      {state?.ok ? (
        <p
          className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100"
          role="status"
        >
          Preferencias guardadas.
        </p>
      ) : null}

      <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
        {showIssueWarning ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
            El envío automático al emitir no está disponible en el servidor.
          </p>
        ) : null}

        <ToggleRow
          name="n8n_auto_email_on_issue"
          defaultChecked={initialAutoEmail}
          title="Enviar factura por email al emitir"
        />

        {showRemindersWarning ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
            Los recordatorios y el resumen semanal no están disponibles en el servidor.
          </p>
        ) : null}

        <ToggleRow
          name="n8n_notify_issuer_on_overdue"
          defaultChecked={initialNotifyIssuerOnOverdue}
          title="Avisarme a mí cuando una factura venza"
        />

        <ToggleRow
          name="n8n_auto_reminder_client"
          defaultChecked={initialAutoReminderClient}
          title="Enviar recordatorio automático al cliente moroso"
        />

        <div className="flex items-center justify-between gap-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/40">
          <label
            htmlFor="n8n_reminder_grace_days"
            className="text-sm font-medium text-zinc-900 dark:text-zinc-50"
          >
            Días de gracia antes del primer recordatorio al cliente
          </label>
          <div className="flex shrink-0 items-center gap-2">
            <input
              id="n8n_reminder_grace_days"
              type="number"
              name="n8n_reminder_grace_days"
              defaultValue={initialGraceDays}
              min={1}
              max={30}
              className="w-16 rounded-lg border border-zinc-300 bg-white px-2 py-2 text-center text-sm text-zinc-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50"
            />
            <span className="text-sm text-zinc-500 dark:text-zinc-400">días</span>
          </div>
        </div>

        <ToggleRow
          name="n8n_weekly_summary_enabled"
          defaultChecked={initialWeeklySummary}
          title="Recibir resumen semanal por email"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-10 max-w-xs items-center justify-center rounded-lg bg-brand px-4 text-sm font-medium text-brand-fg hover:bg-brand-hover disabled:opacity-60"
      >
        {pending ? "Guardando…" : "Guardar preferencias"}
      </button>
    </form>
  );
}
