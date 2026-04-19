"use client";

import { useActionState } from "react";
import {
  createDraftInvoiceAction,
  type InvoiceActionState,
} from "@/app/actions/invoices";

const initial: InvoiceActionState = {};

type ClientOption = { id: string; name: string };

export function NewInvoiceForm({
  clients,
  defaultClientId,
}: {
  clients: ClientOption[];
  defaultClientId?: string;
}) {
  const [state, formAction, pending] = useActionState(
    createDraftInvoiceAction,
    initial,
  );

  const yearDefault = new Date().getFullYear();

  return (
    <form
      action={formAction}
      className="mx-auto flex max-w-lg flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
    >
      {state?.error ? (
        <p
          className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-200"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-zinc-700 dark:text-zinc-300">
          Cliente <span className="text-red-600">*</span>
        </span>
        <select
          name="client_id"
          required
          defaultValue={defaultClientId ?? ""}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:ring-2 focus:ring-brand/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="">— Selecciona —</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            Serie
          </span>
          <input
            name="series"
            defaultValue="A"
            maxLength={8}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:ring-2 focus:ring-brand/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            Año
          </span>
          <input
            name="year"
            type="number"
            defaultValue={yearDefault}
            min={2000}
            max={2100}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:ring-2 focus:ring-brand/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </label>
      </div>
      <button
        type="submit"
        disabled={pending || clients.length === 0}
        className="inline-flex h-10 items-center justify-center rounded-lg bg-brand px-4 text-sm font-medium text-brand-fg transition hover:bg-brand-hover disabled:opacity-60"
      >
        {pending ? "Creando…" : "Crear borrador"}
      </button>
      {clients.length === 0 ? (
        <p className="text-sm text-amber-800 dark:text-amber-200">
          Crea al menos un cliente antes de facturar.
        </p>
      ) : null}
    </form>
  );
}
