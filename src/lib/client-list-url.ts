import type { ClientKind } from "@/lib/client-kind";
import { buildListPageUrl, parseListPage } from "@/lib/list-page";

/** Construye query string para /clients omitiendo valores vacíos. */
export function buildClientsListUrl(
  params: Record<string, string | undefined>,
): string {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== "") u.set(k, v);
  }
  const q = u.toString();
  return q ? `/clients?${q}` : "/clients";
}

export type ClientListFilters = {
  /** Pestaña activa: empresas o particulares */
  kind?: ClientKind;
  /** Búsqueda en nombre, NIF, email, teléfono (coincidencia parcial, sin distinguir mayúsculas) */
  q?: string;
  /** Por defecto: más recientes primero (sin parámetro en URL) */
  sort?: "name_asc" | "name_desc";
  page?: number;
};

export function buildClientsListPageUrl(filters: ClientListFilters, page: number): string {
  return buildListPageUrl(
    "/clients",
    {
      kind: filters.kind,
      q: filters.q,
      sort: filters.sort,
    },
    page,
  );
}

export function parseClientListSearch(
  raw: Record<string, string | string[] | undefined>,
): ClientListFilters {
  const g = (k: string) => {
    const v = raw[k];
    return typeof v === "string" ? v : undefined;
  };
  const sortRaw = g("sort");
  const sort =
    sortRaw === "name_asc" || sortRaw === "name_desc" ? sortRaw : undefined;
  const kindRaw = g("kind");
  const kind: ClientKind | undefined =
    kindRaw === "individual" || kindRaw === "company" ? kindRaw : undefined;
  return {
    kind: kind ?? "company",
    q: g("q"),
    sort,
    page: parseListPage(g("page")),
  };
}
