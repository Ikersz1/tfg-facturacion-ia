"use client";

import { useActionState } from "react";
import {
  updateAutomationSettingsAction,
  type AutomationSettingsState,
} from "@/app/actions/automation-settings";

const initial: AutomationSettingsState = {};

function IconMail({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
    </svg>
  );
}

function IconBell({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
    </svg>
  );
}

function IconCalendar({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
    </svg>
  );
}

function IconCheck({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  );
}

function ToggleCard({
  name,
  checked,
  icon,
  title,
  description,
  accentColor = "brand",
}: {
  name: string;
  checked: boolean;
  icon: React.ReactNode;
  title: string;
  description: string;
  accentColor?: "brand" | "amber" | "emerald" | "violet";
}) {
  const ringColors = {
    brand: "peer-checked:ring-brand/30 peer-checked:border-brand",
    amber: "peer-checked:ring-amber-400/30 peer-checked:border-amber-500",
    emerald: "peer-checked:ring-emerald-400/30 peer-checked:border-emerald-500",
    violet: "peer-checked:ring-violet-400/30 peer-checked:border-violet-500",
  };
  const iconBgColors = {
    brand: "bg-brand/10 text-brand peer-checked:bg-brand peer-checked:text-white",
    amber: "bg-amber-100 text-amber-600 peer-checked:bg-amber-500 peer-checked:text-white dark:bg-amber-900/30 dark:text-amber-400",
    emerald: "bg-emerald-100 text-emerald-600 peer-checked:bg-emerald-500 peer-checked:text-white dark:bg-emerald-900/30 dark:text-emerald-400",
    violet: "bg-violet-100 text-violet-600 peer-checked:bg-violet-500 peer-checked:text-white dark:bg-violet-900/30 dark:text-violet-400",
  };

  return (
    <label className="group relative flex cursor-pointer items-start gap-4">
      <input
        type="checkbox"
        name={name}
        defaultChecked={checked}
        className="peer sr-only"
      />
      <div
        className={`flex size-12 shrink-0 items-center justify-center rounded-xl transition-all duration-200 ${iconBgColors[accentColor]}`}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1 pt-0.5">
        <span className="block text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          {title}
        </span>
        <span className="mt-0.5 block text-sm text-zinc-500 dark:text-zinc-400">
          {description}
        </span>
      </div>
      <div
        className={`absolute inset-0 -m-3 rounded-2xl border-2 border-transparent ring-0 transition-all duration-200 peer-checked:ring-4 ${ringColors[accentColor]}`}
      />
      <div className="absolute right-3 top-3 flex size-5 items-center justify-center rounded-full bg-zinc-100 text-zinc-400 opacity-0 transition-all peer-checked:bg-emerald-500 peer-checked:text-white peer-checked:opacity-100 dark:bg-zinc-700">
        <IconCheck className="size-3" />
      </div>
    </label>
  );
}

function FlowCard({
  number,
  title,
  description,
  icon,
  iconBg,
  warning,
  children,
}: {
  number: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  iconBg: string;
  warning?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-zinc-700/80 dark:bg-zinc-900">
      <div className="absolute -right-6 -top-6 size-24 rounded-full bg-gradient-to-br from-zinc-100 to-transparent opacity-50 dark:from-zinc-800 dark:opacity-30" />
      
      <div className="relative p-6">
        <div className="flex items-start gap-4">
          <div className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex size-6 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">
                {number}
              </span>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                {title}
              </h2>
            </div>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {description}
            </p>
          </div>
        </div>

        {warning ? (
          <div className="mt-4 rounded-xl border border-amber-200/80 bg-gradient-to-r from-amber-50 to-amber-50/50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800/50 dark:from-amber-950/50 dark:to-amber-950/20 dark:text-amber-200">
            {warning}
          </div>
        ) : null}

        <div className="mt-5 space-y-4">
          {children}
        </div>
      </div>
    </div>
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

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state?.error ? (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
          <svg className="size-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
          </svg>
          {state.error}
        </div>
      ) : null}
      
      {state?.ok ? (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200">
          <div className="flex size-6 items-center justify-center rounded-full bg-emerald-500 text-white">
            <IconCheck className="size-4" />
          </div>
          Preferencias guardadas correctamente
        </div>
      ) : null}

      {/* Flujo 1 — Al emitir factura */}
      <FlowCard
        number={1}
        title="Email al emitir factura"
        description="Cuando pulsas «Emitir y numerar», n8n envía automáticamente la factura en PDF al cliente."
        icon={<IconMail className="size-6" />}
        iconBg="bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400"
        warning={
          !webhookConfigured ? (
            <>
              Falta configurar <code className="mx-1 rounded bg-amber-200/60 px-1.5 py-0.5 font-mono text-xs dark:bg-amber-800/60">N8N_INVOICE_ISSUED_WEBHOOK_URL</code> en Vercel.
            </>
          ) : undefined
        }
      >
        <ToggleCard
          name="n8n_auto_email_on_issue"
          checked={initialAutoEmail}
          icon={<IconMail className="size-6" />}
          title="Enviar factura por email al emitir"
          description="El PDF se envía directamente al email registrado del cliente."
          accentColor="brand"
        />
      </FlowCard>

      {/* Flujo 2 — Recordatorios */}
      <FlowCard
        number={2}
        title="Recordatorios de facturas vencidas"
        description="n8n revisa cada día las facturas pendientes y envía avisos automáticos."
        icon={<IconBell className="size-6" />}
        iconBg="bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400"
        warning={
          !secretConfigured ? (
            <>
              Falta configurar <code className="mx-1 rounded bg-amber-200/60 px-1.5 py-0.5 font-mono text-xs dark:bg-amber-800/60">N8N_WEBHOOK_SECRET</code> en Vercel.
            </>
          ) : undefined
        }
      >
        <ToggleCard
          name="n8n_notify_issuer_on_overdue"
          checked={initialNotifyIssuerOnOverdue}
          icon={
            <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
          }
          title="Avisarme cuando una factura venza"
          description="Recibes un email la primera vez que una factura aparece como vencida."
          accentColor="amber"
        />

        <ToggleCard
          name="n8n_auto_reminder_client"
          checked={initialAutoReminderClient}
          icon={
            <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
            </svg>
          }
          title="Enviar recordatorio al cliente moroso"
          description="Tras los días de gracia, el cliente recibe un email recordatorio (máx. 1 cada 7 días)."
          accentColor="amber"
        />

        <div className="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800/50">
          <label
            htmlFor="n8n_reminder_grace_days"
            className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            <svg className="size-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            Días de gracia
          </label>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Tiempo desde el vencimiento hasta el primer recordatorio al cliente.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <input
              id="n8n_reminder_grace_days"
              type="number"
              name="n8n_reminder_grace_days"
              defaultValue={initialGraceDays}
              min={1}
              max={30}
              className="w-20 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-center text-sm font-medium text-zinc-900 shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50"
            />
            <span className="text-sm text-zinc-500 dark:text-zinc-400">días</span>
          </div>
        </div>
      </FlowCard>

      {/* Flujo 3 — Resumen semanal */}
      <FlowCard
        number={3}
        title="Resumen semanal"
        description="Cada lunes recibes un email con el resumen de facturación de la semana anterior."
        icon={<IconCalendar className="size-6" />}
        iconBg="bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400"
        warning={
          !secretConfigured ? (
            <>
              Requiere <code className="mx-1 rounded bg-amber-200/60 px-1.5 py-0.5 font-mono text-xs dark:bg-amber-800/60">N8N_WEBHOOK_SECRET</code> en Vercel.
            </>
          ) : undefined
        }
      >
        <ToggleCard
          name="n8n_weekly_summary_enabled"
          checked={initialWeeklySummary}
          icon={<IconCalendar className="size-6" />}
          title="Recibir resumen semanal por email"
          description="Facturado, cobrado, pendiente y hasta 5 facturas morosas en un solo email."
          accentColor="violet"
        />
      </FlowCard>

      <div className="flex justify-start pt-2">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-zinc-900 px-6 text-sm font-semibold text-white shadow-sm transition-all hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {pending ? (
            <>
              <svg className="size-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Guardando…
            </>
          ) : (
            <>
              <IconCheck className="size-4" />
              Guardar preferencias
            </>
          )}
        </button>
      </div>
    </form>
  );
}
