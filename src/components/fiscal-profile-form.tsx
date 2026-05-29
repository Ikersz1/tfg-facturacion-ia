"use client";

import { useActionState } from "react";
import {
  upsertFiscalProfileAction,
  type FiscalProfileState,
} from "@/app/actions/fiscal-profile";
import {
  FISCAL_ADDRESS_HINT,
  FISCAL_ADDRESS_PLACEHOLDER,
} from "@/lib/fiscal-address-hint";
import { InvoicePdfTemplateField } from "@/components/invoice-pdf-template-field";
import type { InvoicePdfTemplateId } from "@/lib/invoice-pdf/template-id";

const initial: FiscalProfileState = {};

export function FiscalProfileForm({
  initialLegalName,
  initialTaxId,
  initialAddress,
  initialPdfTemplate,
}: {
  initialLegalName: string;
  initialTaxId: string;
  initialAddress: string;
  initialPdfTemplate: InvoicePdfTemplateId;
}) {
  const [state, formAction, pending] = useActionState(
    upsertFiscalProfileAction,
    initial,
  );

  const inputClass =
    "rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50";

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
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
          Datos guardados.
        </p>
      ) : null}

      {/* Datos fiscales */}
      <section className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
        <div className="flex items-center gap-3 border-b border-zinc-100 pb-4 dark:border-zinc-800">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
            <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z" />
            </svg>
          </span>
          <div>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Datos fiscales del emisor</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Aparecen en tus facturas y PDF. No sustituyen asesoramiento fiscal.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              Razón social o nombre completo <span className="text-red-600">*</span>
            </span>
            <input
              name="legal_name"
              required
              defaultValue={initialLegalName}
              autoComplete="organization"
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              NIF / CIF del emisor <span className="text-red-600">*</span>
            </span>
            <input
              name="tax_id"
              required
              defaultValue={initialTaxId}
              autoComplete="off"
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              Domicilio fiscal <span className="text-red-600">*</span>
            </span>
            <textarea
              name="address"
              required
              rows={3}
              defaultValue={initialAddress}
              placeholder={FISCAL_ADDRESS_PLACEHOLDER}
              className={inputClass}
            />
            <span className="text-xs text-zinc-500 dark:text-zinc-400">{FISCAL_ADDRESS_HINT}</span>
          </label>
        </div>
      </section>

      {/* Plantilla del PDF */}
      <section className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
        <div className="flex items-center gap-3 border-b border-zinc-100 pb-4 dark:border-zinc-800">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
            <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
          </span>
          <div>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Plantilla del PDF de factura</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Afecta solo a la descarga PDF. Puedes cambiarla cuando quieras.
            </p>
          </div>
        </div>

        <InvoicePdfTemplateField initialTemplate={initialPdfTemplate} />
      </section>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-10 max-w-xs items-center justify-center rounded-lg bg-brand px-4 text-sm font-medium text-brand-fg hover:bg-brand-hover disabled:opacity-60"
      >
        {pending ? "Guardando…" : "Guardar"}
      </button>
    </form>
  );
}
