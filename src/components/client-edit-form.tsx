"use client";

import { useActionState, useState } from "react";
import {
  updateClientAction,
  type ClientActionState,
} from "@/app/actions/clients";
import {
  FISCAL_ADDRESS_HINT,
  FISCAL_ADDRESS_PLACEHOLDER,
} from "@/lib/fiscal-address-hint";
import {
  clientNameLabel,
  clientNamePlaceholder,
  clientTaxIdLabel,
  clientTaxIdPlaceholder,
  parseClientKind,
  type ClientKind,
} from "@/lib/client-kind";

const initial: ClientActionState = {};

const inputClass =
  "rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50";

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
    kind?: string | null;
  };
}) {
  const initialKind = parseClientKind(client.kind);
  const [kind, setKind] = useState<ClientKind>(initialKind);

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

      <fieldset className="flex flex-col gap-2 rounded-md border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800/40">
        <legend className="px-0.5 text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Tipo de cliente
        </legend>
        <div className="flex flex-wrap gap-3">
          <label className="flex cursor-pointer items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm has-[:checked]:border-zinc-400 dark:border-zinc-600 dark:bg-zinc-900">
            <input
              type="radio"
              name="kind"
              value="company"
              checked={kind === "company"}
              onChange={() => setKind("company")}
              className="size-4 border-zinc-300 text-brand focus:ring-brand/40"
            />
            <span className="text-zinc-800 dark:text-zinc-100">Empresa</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm has-[:checked]:border-zinc-400 dark:border-zinc-600 dark:bg-zinc-900">
            <input
              type="radio"
              name="kind"
              value="individual"
              checked={kind === "individual"}
              onChange={() => setKind("individual")}
              className="size-4 border-zinc-300 text-brand focus:ring-brand/40"
            />
            <span className="text-zinc-800 dark:text-zinc-100">Particular</span>
          </label>
        </div>
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            {clientNameLabel(kind)} <span className="text-red-600">*</span>
          </span>
          <input
            name="name"
            required
            defaultValue={client.name}
            placeholder={clientNamePlaceholder(kind)}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            {clientTaxIdLabel(kind)} <span className="text-red-600">*</span>
          </span>
          <input
            name="tax_id"
            required
            defaultValue={client.tax_id ?? ""}
            placeholder={clientTaxIdPlaceholder(kind)}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">Email</span>
          <input
            name="email"
            type="email"
            defaultValue={client.email ?? ""}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">Teléfono</span>
          <input
            name="phone"
            type="tel"
            defaultValue={client.phone ?? ""}
            className={inputClass}
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
            className={inputClass}
          />
          <span className="text-xs text-zinc-500 dark:text-zinc-400">{FISCAL_ADDRESS_HINT}</span>
        </label>
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">Notas</span>
          <textarea
            name="notes"
            rows={2}
            defaultValue={client.notes ?? ""}
            className={`resize-y ${inputClass}`}
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
