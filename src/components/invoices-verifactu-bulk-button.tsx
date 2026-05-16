"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  refreshPendingVerifactuInvoicesAction,
  type BulkVerifactiStatusActionState,
} from "@/app/actions/verifacti-status";

const initial: BulkVerifactiStatusActionState = {};

export function InvoicesVerifactuBulkButton({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    refreshPendingVerifactuInvoicesAction,
    initial,
  );
  const prevPending = useRef(false);

  useEffect(() => {
    const was = prevPending.current;
    prevPending.current = pending;
    if (was && !pending && state?.ok) {
      router.refresh();
    }
  }, [pending, state?.ok, router]);

  if (!configured) {
    return null;
  }

  return (
    <div className="w-full rounded-lg border border-zinc-200/80 bg-zinc-50/60 px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-900/50">
      <form action={action} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <p className="text-xs leading-snug text-zinc-600 dark:text-zinc-400">
          Facturas enviadas a Verifacti con registro pendiente en AEAT.
        </p>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md bg-zinc-100 px-3 text-sm font-medium text-zinc-800 transition hover:bg-brand-soft hover:text-accent disabled:opacity-60 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-brand-soft dark:hover:text-accent"
          title="Consulta Verifacti el estado AEAT (máx. 20 facturas)"
        >
          <svg
            className={`size-4 shrink-0 ${pending ? "animate-spin text-brand" : ""}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <path d="M21 12a9 9 0 1 1-2.64-6.36" strokeLinecap="round" />
            <path d="M21 3v6h-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {pending ? "Sincronizando…" : "Actualizar estados"}
        </button>
      </form>
      {state.error ? (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400" role="alert">
          {state.error}
        </p>
      ) : state.info ? (
        <p className="mt-2 text-xs text-emerald-800 dark:text-emerald-200" role="status">
          {state.info}
        </p>
      ) : null}
    </div>
  );
}
