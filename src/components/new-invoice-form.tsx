"use client";

import { useActionState, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createDraftInvoiceAction,
  type InvoiceActionState,
} from "@/app/actions/invoices";
import {
  DEFAULT_INVOICE_SERIES,
  INVOICE_SERIES,
  type InvoiceSeriesId,
} from "@/lib/invoice-series";
import type { InvoiceSeriesHints } from "@/lib/invoice-series-hints";

const initial: InvoiceActionState = {};
const CREATE_CLIENT_OPTION = "__create_client__";

type ClientOption = { id: string; name: string };

export function NewInvoiceForm({
  clients,
  defaultClientId,
  seriesHints,
  defaultYear,
}: {
  clients: ClientOption[];
  defaultClientId?: string;
  seriesHints: InvoiceSeriesHints;
  defaultYear: number;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    createDraftInvoiceAction,
    initial,
  );
  const [series, setSeries] = useState<InvoiceSeriesId>(DEFAULT_INVOICE_SERIES);
  const [year, setYear] = useState(defaultYear);
  const [selectedClientId, setSelectedClientId] = useState(defaultClientId ?? "");

  const hint = useMemo(() => {
    const h = seriesHints[series];
    if (!h || h.year !== year) {
      return `Serie ${series}: al emitir se asignará el número 1 (si es la primera de ${year}).`;
    }
    if (h.lastIssuedNumber == null) {
      return `Serie ${series} · ${year}: aún no hay facturas emitidas; la primera será la nº 1.`;
    }
    return `Serie ${series} · ${year}: última emitida nº ${h.lastIssuedNumber}; al emitir este borrador tocará la nº ${h.nextNumber}.`;
  }, [series, year, seriesHints]);

  const seriesMeta = INVOICE_SERIES.find((s) => s.id === series);

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
          value={selectedClientId}
          onChange={(e) => {
            const clientId = e.target.value;
            if (clientId === CREATE_CLIENT_OPTION) {
              setSelectedClientId("");
              router.push("/clients/new?allowKindSelect=1");
              return;
            }
            setSelectedClientId(clientId);
          }}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:ring-2 focus:ring-brand/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="">— Selecciona —</option>
          <option value={CREATE_CLIENT_OPTION}>+ Crear cliente</option>
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
            Serie <span className="text-red-600">*</span>
          </span>
          <select
            name="series"
            required
            value={series}
            onChange={(e) => setSeries(e.target.value as InvoiceSeriesId)}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:ring-2 focus:ring-brand/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          >
            {INVOICE_SERIES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          {seriesMeta ? (
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {seriesMeta.description}
            </span>
          ) : null}
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            Año <span className="text-red-600">*</span>
          </span>
          <input
            name="year"
            type="number"
            required
            value={year}
            onChange={(e) => setYear(Number(e.target.value) || defaultYear)}
            min={2000}
            max={2100}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:ring-2 focus:ring-brand/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </label>
      </div>
      <p className="rounded-md bg-zinc-50 px-3 py-2 text-xs text-zinc-600 dark:bg-zinc-800/80 dark:text-zinc-400">
        {hint}
      </p>
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
