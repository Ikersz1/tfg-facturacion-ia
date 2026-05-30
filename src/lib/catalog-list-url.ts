import { parseCatalogKind, type CatalogKind } from "@/lib/catalog-kind";
import { buildListPageUrl, parseListPage } from "@/lib/list-page";

export type CatalogListFilters = {
  kind: CatalogKind;
  page?: number;
};

export function buildCatalogListUrl(filters: CatalogListFilters, page?: number): string {
  const p = page ?? filters.page ?? 1;
  return buildListPageUrl("/catalogo", { kind: filters.kind }, p);
}

export function parseCatalogListSearch(
  raw: Record<string, string | string[] | undefined>,
): CatalogListFilters {
  const g = (k: string) => {
    const v = raw[k];
    return typeof v === "string" ? v : undefined;
  };
  return {
    kind: parseCatalogKind(g("kind")),
    page: parseListPage(g("page")),
  };
}
