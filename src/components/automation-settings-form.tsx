"use client";

import { useActionState } from "react";
import {
  updateAutomationSettingsAction,
  type AutomationSettingsState,
} from "@/app/actions/automation-settings";

const initial: AutomationSettingsState = {};

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

  return (
    <form
      action={formAction}
      className="mx-auto flex w-full max-w-lg flex-col gap-6"
    >
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

      {/* Flujo 1 — Al emitir factura */}
      <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Flujo 1 · Al emitir factura
        </h2>

        {!webhookConfigured ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
            Sin{" "}
            <code className="rounded bg-amber-100/80 px-1 dark:bg-amber-900/60">
              N8N_INVOICE_ISSUED_WEBHOOK_URL
            </code>{" "}
            en Vercel, no se enviará correo al emitir aunque la opción esté activa.
          </p>
        ) : null}

        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/40">
          <input
            type="checkbox"
            name="n8n_auto_email_on_issue"
            defaultChecked={initialAutoEmail}
            className="mt-0.5 size-4 rounded border-zinc-300 text-brand focus:ring-brand/40"
          />
          <span className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-zinc-900 dark:text-zinc-50">
              Enviar factura por email al emitir
            </span>
            <span className="text-zinc-600 dark:text-zinc-400">
              Al pulsar «Emitir y numerar», n8n envía el PDF al email del cliente.
            </span>
          </span>
        </label>
      </div>

      {/* Flujo 2 — Recordatorios de facturas vencidas */}
      <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Flujo 2 · Recordatorios de facturas vencidas
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          n8n consulta el endpoint de recordatorios según el horario que configures en tu flujo (p.
          ej. una vez al día).
        </p>

        {!secretConfigured ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
            Sin{" "}
            <code className="rounded bg-amber-100/80 px-1 dark:bg-amber-900/60">
              N8N_WEBHOOK_SECRET
            </code>{" "}
            en Vercel, el endpoint de recordatorios rechazará todas las peticiones de n8n.
          </p>
        ) : null}

        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/40">
          <input
            type="checkbox"
            name="n8n_notify_issuer_on_overdue"
            defaultChecked={initialNotifyIssuerOnOverdue}
            className="mt-0.5 size-4 rounded border-zinc-300 text-brand focus:ring-brand/40"
          />
          <span className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-zinc-900 dark:text-zinc-50">
              Avisarme a mí cuando una factura venza
            </span>
            <span className="text-zinc-600 dark:text-zinc-400">
              La primera vez que una factura aparece vencida, n8n te envía un email a tu cuenta
              con los datos del cliente y el importe pendiente.
            </span>
          </span>
        </label>

        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/40">
          <input
            type="checkbox"
            name="n8n_auto_reminder_client"
            defaultChecked={initialAutoReminderClient}
            className="mt-0.5 size-4 rounded border-zinc-300 text-brand focus:ring-brand/40"
          />
          <span className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-zinc-900 dark:text-zinc-50">
              Enviar recordatorio automático al cliente moroso
            </span>
            <span className="text-zinc-600 dark:text-zinc-400">
              Tras el período de gracia, n8n envía un email de recordatorio al email del cliente.
              Máximo una vez cada 7 días por factura. Solo facturas con email de cliente registrado.
            </span>
          </span>
        </label>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="n8n_reminder_grace_days"
            className="text-sm font-medium text-zinc-900 dark:text-zinc-50"
          >
            Días de gracia antes del primer recordatorio al cliente
          </label>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Tiempo desde el vencimiento hasta que se envía el primer aviso al cliente. Mínimo 1,
            máximo 30. Por defecto 3.
          </p>
          <input
            id="n8n_reminder_grace_days"
            type="number"
            name="n8n_reminder_grace_days"
            defaultValue={initialGraceDays}
            min={1}
            max={30}
            className="mt-1 w-28 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-brand/40 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50"
          />
        </div>
      </div>

      {/* Flujo 3 — Resumen semanal */}
      <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Flujo 3 · Resumen semanal
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          n8n consulta el endpoint una vez por semana (p. ej. los lunes). Recibes un email con lo
          facturado la semana pasada, pendiente de cobro y facturas vencidas.
        </p>

        {!secretConfigured ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
            Requiere{" "}
            <code className="rounded bg-amber-100/80 px-1 dark:bg-amber-900/60">
              N8N_WEBHOOK_SECRET
            </code>{" "}
            en Vercel.
          </p>
        ) : null}

        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/40">
          <input
            type="checkbox"
            name="n8n_weekly_summary_enabled"
            defaultChecked={initialWeeklySummary}
            className="mt-0.5 size-4 rounded border-zinc-300 text-brand focus:ring-brand/40"
          />
          <span className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-zinc-900 dark:text-zinc-50">
              Recibir resumen semanal por email
            </span>
            <span className="text-zinc-600 dark:text-zinc-400">
              Un correo a tu cuenta con facturación de la semana anterior, total pendiente y listado
              de morosos (máximo 5). Se envía como mucho una vez por semana.
            </span>
          </span>
        </label>
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
