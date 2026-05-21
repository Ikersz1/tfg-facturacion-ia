type Props = {
  summaryHref: string;
  linesHref: string;
};

export function InformesExportLink({ summaryHref, linesHref }: Props) {
  return (
    <div className="flex items-center gap-2">
      <a
        href={summaryHref}
        aria-label="Exportar resumen de facturas en CSV"
        className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800/80 dark:text-zinc-100 dark:hover:bg-zinc-700 sm:px-4"
      >
        <svg className="h-4 w-4 text-zinc-500 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
          />
        </svg>
        <span className="hidden min-[520px]:inline">CSV resumen</span>
        <span className="min-[520px]:hidden">Resumen</span>
      </a>
      <a
        href={linesHref}
        aria-label="Exportar líneas de factura en CSV"
        className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800/80 dark:text-zinc-100 dark:hover:bg-zinc-700 sm:px-4"
      >
        <span className="hidden min-[520px]:inline">CSV líneas</span>
        <span className="min-[520px]:hidden">Líneas</span>
      </a>
    </div>
  );
}
