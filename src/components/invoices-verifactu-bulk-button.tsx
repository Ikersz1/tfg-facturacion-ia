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
    <form action={action} className="flex min-w-0 flex-col items-stretch gap-1 sm:items-end">
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-800 shadow-sm hover:border-brand-border hover:bg-brand-soft hover:text-accent disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-brand-border dark:hover:bg-brand-soft dark:hover:text-accent"
        title="Consulta Verifacti para todas las facturas con registro pendiente (máx. 20 por lote)"
      >
        {pending ? "Consultando AEAT…" : "AEAT: comprobar pendientes"}
      </button>
      {state.error ? (
        <p className="max-w-[18rem] text-right text-xs text-red-600 dark:text-red-400">{state.error}</p>
      ) : state.info ? (
        <p className="max-w-[18rem] text-right text-xs text-zinc-500 dark:text-zinc-400">{state.info}</p>
      ) : null}
    </form>
  );
}
