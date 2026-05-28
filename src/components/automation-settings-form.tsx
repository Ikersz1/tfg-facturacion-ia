"use client";

import { useActionState } from "react";
import {
  updateAutomationSettingsAction,
  type AutomationSettingsState,
} from "@/app/actions/automation-settings";

const initial: AutomationSettingsState = {};

export function AutomationSettingsForm({
  initialAutoEmail,
  webhookConfigured,
}: {
  initialAutoEmail: boolean;
  webhookConfigured: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    updateAutomationSettingsAction,
    initial,
  );

  return (
    <form
      action={formAction}
      className="mx-auto flex w-full max-w-lg flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
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

      {!webhookConfigured ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
          El servidor no tiene configurado el webhook de n8n (
          <code className="rounded bg-amber-100/80 px-1 dark:bg-amber-900/60">
            N8N_INVOICE_ISSUED_WEBHOOK_URL
          </code>
          ). Aunque actives la opción, no se enviará correo hasta configurarlo en Vercel.
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
            Si está activado, al pulsar «Emitir y numerar» se notifica a n8n para que envíe el
            PDF al email del cliente. Si está desactivado, la factura se emite igual pero no se
            dispara el correo.
          </span>
        </span>
      </label>

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
