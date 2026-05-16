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
import {
  INVOICE_PDF_TEMPLATE_IDS,
  INVOICE_PDF_TEMPLATE_LABELS,
  type InvoicePdfTemplateId,
} from "@/lib/invoice-pdf/template-id";

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
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
          Datos guardados.
        </p>
      ) : null}

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-zinc-700 dark:text-zinc-300">
          Razón social o nombre completo <span className="text-red-600">*</span>
        </span>
        <input
          name="legal_name"
          required
          defaultValue={initialLegalName}
          autoComplete="organization"
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:ring-2 focus:ring-brand/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-zinc-700 dark:text-zinc-300">
          NIF / CIF del emisor <span className="text-red-600">*</span>
        </span>
        <input
          name="tax_id"
          required
          defaultValue={initialTaxId}
          autoComplete="off"
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:ring-2 focus:ring-brand/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-zinc-700 dark:text-zinc-300">
          Domicilio fiscal <span className="text-red-600">*</span>
        </span>
        <textarea
          name="address"
          required
          rows={3}
          defaultValue={initialAddress}
          placeholder={FISCAL_ADDRESS_PLACEHOLDER}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:ring-2 focus:ring-brand/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
        <span className="text-xs text-zinc-500 dark:text-zinc-400">{FISCAL_ADDRESS_HINT}</span>
      </label>

      <div className="flex flex-col gap-2 text-sm">
        <span className="font-medium text-zinc-700 dark:text-zinc-300">
          Plantilla del PDF de factura
        </span>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Afecta solo a la descarga PDF de facturas emitidas. Puedes cambiarla cuando quieras.
        </p>
        <select
          name="invoice_pdf_template"
          defaultValue={initialPdfTemplate}
          className="max-w-md rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:ring-2 focus:ring-brand/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          {INVOICE_PDF_TEMPLATE_IDS.map((id) => (
            <option key={id} value={id}>
              {INVOICE_PDF_TEMPLATE_LABELS[id].title} —{" "}
              {INVOICE_PDF_TEMPLATE_LABELS[id].description}
            </option>
          ))}
        </select>
      </div>

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
