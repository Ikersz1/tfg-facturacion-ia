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
  /** Búsqueda en nombre, NIF, email, teléfono (coincidencia parcial, sin distinguir mayúsculas) */
  q?: string;
  /** Por defecto: más recientes primero (sin parámetro en URL) */
  sort?: "name_asc" | "name_desc";
};

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
  return {
    q: g("q"),
    sort,
  };
}
