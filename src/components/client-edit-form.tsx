"use client";

import { useActionState } from "react";
import {
  updateClientAction,
  type ClientActionState,
} from "@/app/actions/clients";
import {
  FISCAL_ADDRESS_HINT,
  FISCAL_ADDRESS_PLACEHOLDER,
} from "@/lib/fiscal-address-hint";

const initial: ClientActionState = {};

export function ClientEditForm({
  client,
}: {
  client: {
    id: string;
    name: string;
    tax_id: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    notes: string | null;
  };
}) {
  const [state, formAction, pending] = useActionState(
    updateClientAction,
    initial,
  );

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
    >
      <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Editar cliente
      </h2>
      <input type="hidden" name="id" value={client.id} />

      {state?.error ? (
        <p
          className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-200"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}
      {state?.ok ? (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
          Cliente actualizado.
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            Nombre <span className="text-red-600">*</span>
          </span>
          <input
            name="name"
            required
            defaultValue={client.name}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            NIF / CIF <span className="text-red-600">*</span>
          </span>
          <input
            name="tax_id"
            required
            defaultValue={client.tax_id ?? ""}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">Email</span>
          <input
            name="email"
            type="email"
            defaultValue={client.email ?? ""}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">Teléfono</span>
          <input
            name="phone"
            type="tel"
            defaultValue={client.phone ?? ""}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            Domicilio fiscal <span className="text-red-600">*</span>
          </span>
          <input
            name="address"
            required
            defaultValue={client.address ?? ""}
            placeholder={FISCAL_ADDRESS_PLACEHOLDER}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
          <span className="text-xs text-zinc-500 dark:text-zinc-400">{FISCAL_ADDRESS_HINT}</span>
        </label>
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">Notas</span>
          <textarea
            name="notes"
            rows={2}
            defaultValue={client.notes ?? ""}
            className="resize-y rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-10 max-w-xs items-center justify-center rounded-lg bg-brand px-4 text-sm font-medium text-brand-fg hover:bg-brand-hover disabled:opacity-60"
      >
        {pending ? "Guardando…" : "Guardar cambios"}
      </button>
    </form>
  );
}
