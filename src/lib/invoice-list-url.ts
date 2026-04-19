/** Construye query string para /invoices omitiendo valores vacíos. */
export function buildInvoicesListUrl(
  params: Record<string, string | undefined>,
): string {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== "") u.set(k, v);
  }
  const q = u.toString();
  return q ? `/invoices?${q}` : "/invoices";
}

/** Fechas YYYY-MM-DD en calendario local (suficiente para filtros de listado). */
export function formatYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function getPresetDateRange(
  preset: "this_month" | "last_month" | "this_year",
): { from: string; to: string } {
  const now = new Date();
  if (preset === "this_year") {
    const from = new Date(now.getFullYear(), 0, 1);
    const to = new Date(now.getFullYear(), 11, 31);
    return { from: formatYMD(from), to: formatYMD(to) };
  }
  if (preset === "this_month") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { from: formatYMD(from), to: formatYMD(to) };
  }
  const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const last = new Date(now.getFullYear(), now.getMonth(), 0);
  return { from: formatYMD(first), to: formatYMD(last) };
}

export type InvoiceListFilters = {
  client_id?: string;
  status?: string;
  from?: string;
  to?: string;
  /** Desde informes (donut): paid | pend | due — mismo criterio que el gráfico. */
  segment?: string;
};

export function parseInvoiceListSearch(
  raw: Record<string, string | string[] | undefined>,
): InvoiceListFilters {
  const g = (k: string) => {
    const v = raw[k];
    return typeof v === "string" ? v : undefined;
  };
  return {
    client_id: g("client_id"),
    status: g("status"),
    from: g("from"),
    to: g("to"),
    segment: g("segment"),
  };
}
