/** YYYY-MM-DD → DD/MM/YYYY */
export function formatDateEs(ymd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) return ymd;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

export function formatMoneyPdf(n: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(n);
}

export function formatQtyPdf(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return n.toLocaleString("es-ES", { maximumFractionDigits: 4 });
}
