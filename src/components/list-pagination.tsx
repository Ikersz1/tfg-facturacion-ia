import Link from "next/link";

export function ListPagination({
  page,
  totalPages,
  totalItems,
  itemLabelSingular,
  itemLabelPlural,
  hrefForPage,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  itemLabelSingular: string;
  itemLabelPlural: string;
  hrefForPage: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  const prevPage = page > 1 ? page - 1 : null;
  const nextPage = page < totalPages ? page + 1 : null;
  const label = totalItems === 1 ? itemLabelSingular : itemLabelPlural;

  const navBtn =
    "inline-flex h-9 items-center justify-center rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800";
  const navBtnDisabled =
    "inline-flex h-9 cursor-not-allowed items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-sm font-medium text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-500";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 px-4 py-3 dark:border-zinc-700">
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        {totalItems} {label} · página {page} de {totalPages}
      </p>
      <div className="flex items-center gap-2">
        {prevPage ? (
          <Link href={hrefForPage(prevPage)} className={navBtn}>
            Anterior
          </Link>
        ) : (
          <span className={navBtnDisabled} aria-disabled>
            Anterior
          </span>
        )}
        {nextPage ? (
          <Link href={hrefForPage(nextPage)} className={navBtn}>
            Siguiente
          </Link>
        ) : (
          <span className={navBtnDisabled} aria-disabled>
            Siguiente
          </span>
        )}
      </div>
    </div>
  );
}
