export const LIST_PAGE_SIZE = 10;

export function parseListPage(raw: string | undefined): number {
  if (!raw) return 1;
  return Math.max(1, parseInt(raw, 10) || 1);
}

export function buildListPageUrl(
  basePath: string,
  params: Record<string, string | undefined>,
  page: number,
): string {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== "") u.set(k, v);
  }
  if (page > 1) u.set("page", String(page));
  const q = u.toString();
  return q ? `${basePath}?${q}` : basePath;
}

export function paginateRows<T>(rows: T[], page: number, pageSize = LIST_PAGE_SIZE) {
  const totalItems = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  return { pageRows, currentPage, totalPages, totalItems };
}
