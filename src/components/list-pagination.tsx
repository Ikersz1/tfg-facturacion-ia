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

  const label = totalItems === 1 ? itemLabelSingular : itemLabelPlural;
  const prevPage = page > 1 ? page - 1 : null;
  const nextPage = page < totalPages ? page + 1 : null;

  // Show at most 5 page numbers around current page
  const pageNumbers: number[] = [];
  const delta = 2;
  const rangeStart = Math.max(1, page - delta);
  const rangeEnd = Math.min(totalPages, page + delta);
  for (let i = rangeStart; i <= rangeEnd; i++) {
    pageNumbers.push(i);
  }

  const arrowBtn =
    "inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100";
  const arrowDisabled =
    "inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-300 dark:text-zinc-600 cursor-not-allowed";

  return (
    <div className="flex items-center justify-between gap-4 border-t border-zinc-100 px-4 py-2.5 dark:border-zinc-800">
      {/* Result count */}
      <p className="text-xs text-zinc-400 dark:text-zinc-500">
        {totalItems} {label}
      </p>

      {/* Page navigation */}
      <div className="flex items-center gap-0.5">
        {/* Previous arrow */}
        {prevPage ? (
          <Link href={hrefForPage(prevPage)} className={arrowBtn} aria-label="Página anterior">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </Link>
        ) : (
          <span className={arrowDisabled} aria-disabled>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </span>
        )}

        {/* Leading ellipsis */}
        {rangeStart > 1 && (
          <>
            <Link
              href={hrefForPage(1)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-xs text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            >
              1
            </Link>
            {rangeStart > 2 && (
              <span className="inline-flex h-8 w-8 items-center justify-center text-xs text-zinc-400 dark:text-zinc-600">
                …
              </span>
            )}
          </>
        )}

        {/* Page numbers */}
        {pageNumbers.map((p) =>
          p === page ? (
            <span
              key={p}
              aria-current="page"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-brand text-xs font-semibold text-brand-fg"
            >
              {p}
            </span>
          ) : (
            <Link
              key={p}
              href={hrefForPage(p)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-xs text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            >
              {p}
            </Link>
          ),
        )}

        {/* Trailing ellipsis */}
        {rangeEnd < totalPages && (
          <>
            {rangeEnd < totalPages - 1 && (
              <span className="inline-flex h-8 w-8 items-center justify-center text-xs text-zinc-400 dark:text-zinc-600">
                …
              </span>
            )}
            <Link
              href={hrefForPage(totalPages)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-xs text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            >
              {totalPages}
            </Link>
          </>
        )}

        {/* Next arrow */}
        {nextPage ? (
          <Link href={hrefForPage(nextPage)} className={arrowBtn} aria-label="Página siguiente">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          </Link>
        ) : (
          <span className={arrowDisabled} aria-disabled>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          </span>
        )}
      </div>
    </div>
  );
}
