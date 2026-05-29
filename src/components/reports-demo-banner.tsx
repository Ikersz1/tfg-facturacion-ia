import Link from "next/link";

export function ReportsDemoBanner() {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-brand/30 bg-brand-soft/40 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-brand/30 dark:bg-zinc-800/50">
      <div className="flex items-start gap-3">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/80 text-brand dark:bg-zinc-900 dark:text-accent"
          aria-hidden
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"
            />
          </svg>
        </span>
        <div>
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Vista previa con datos de ejemplo
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
            Así se verá tu informe cuando empieces a facturar: tasa de cobro, antigüedad de la deuda,
            ranking de clientes y productos top. Los números de abajo son ficticios.
          </p>
        </div>
      </div>
      <Link
        href="/invoices/new"
        className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-medium text-brand-fg shadow-sm transition hover:bg-brand-hover"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Crear primera factura
      </Link>
    </div>
  );
}
