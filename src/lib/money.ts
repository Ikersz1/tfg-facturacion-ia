/** Redondeo a 2 decimales (EUR). */
export function roundCurrencyEUR(n: number): number {
  return Math.round(n * 100) / 100;
}

export function formatMoneyEUR(n: number | null): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(Number(n));
}

export function lineAmounts(
  quantity: number,
  unitPrice: number,
  taxRatePct: number,
): { line_net: number; line_tax: number; line_total: number } {
  const line_net = roundCurrencyEUR(quantity * unitPrice);
  const line_tax = roundCurrencyEUR(line_net * (taxRatePct / 100));
  const line_total = roundCurrencyEUR(line_net + line_tax);
  return { line_net, line_tax, line_total };
}
