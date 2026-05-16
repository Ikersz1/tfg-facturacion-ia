"use client";

import { useActionState, useState } from "react";
import {
  createClientAction,
  type ClientActionState,
} from "@/app/actions/clients";
import {
  FISCAL_ADDRESS_HINT,
  FISCAL_ADDRESS_PLACEHOLDER,
} from "@/lib/fiscal-address-hint";
import {
  clientKindLabel,
  clientNameLabel,
  clientNamePlaceholder,
  clientTaxIdLabel,
  clientTaxIdPlaceholder,
  type ClientKind,
} from "@/lib/client-kind";

const initial: ClientActionState = {};

const inputClass =
  "rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none transition focus:ring-2 focus:ring-brand/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50";

type Props = {
  defaultKind?: ClientKind;
  /** Desde la pestaña de clientes: el tipo viene de la URL; no mostrar selector */
  lockKind?: boolean;
};

export function ClientForm({ defaultKind = "company", lockKind = true }: Props) {
  const [state, formAction, pending] = useActionState(
    createClientAction,
    initial,
  );
  const [kind, setKind] = useState<ClientKind>(defaultKind);
  const displayKind = lockKind ? defaultKind : kind;

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

      {lockKind ? (
        <input type="hidden" name="kind" value={defaultKind} />
      ) : (
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
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            {clientNameLabel(displayKind)}{" "}
            <span className="text-red-600">*</span>
          </span>
          <input
            name="name"
            required
            autoComplete={displayKind === "individual" ? "name" : "organization"}
            placeholder={clientNamePlaceholder(displayKind)}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            {clientTaxIdLabel(displayKind)}{" "}
            <span className="text-red-600">*</span>
          </span>
          <input
            name="tax_id"
            required
            autoComplete="off"
            placeholder={clientTaxIdPlaceholder(displayKind)}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            Email
          </span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            Teléfono
          </span>
          <input
            name="phone"
            type="tel"
            autoComplete="tel"
            className={inputClass}
          />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-zinc-700 dark:text-zinc-300">
          Domicilio fiscal <span className="text-red-600">*</span>
        </span>
        <input
          name="address"
          required
          autoComplete="street-address"
          placeholder={FISCAL_ADDRESS_PLACEHOLDER}
          className={inputClass}
        />
        <span className="text-xs text-zinc-500 dark:text-zinc-400">{FISCAL_ADDRESS_HINT}</span>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-zinc-700 dark:text-zinc-300">
          Notas
        </span>
        <textarea
          name="notes"
          rows={2}
          className={`resize-y ${inputClass}`}
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-10 items-center justify-center rounded-lg bg-brand px-4 text-sm font-medium text-brand-fg transition hover:bg-brand-hover disabled:opacity-60"
      >
        {pending
          ? "Guardando…"
          : `Guardar ${clientKindLabel(displayKind).toLowerCase()}`}
      </button>
    </form>
  );
}
