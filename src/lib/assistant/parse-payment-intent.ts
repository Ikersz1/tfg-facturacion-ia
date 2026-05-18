/** Detección de «he cobrado X de [cliente]» (sin dependencias de servidor). */

export function parseRegisterPaymentIntent(
  question: string,
): { amountEur: number; clientName: string } | null {
  const q = question.trim();
  const lower = q.toLowerCase();
  if (
    !/cobr|pagad|recib|ingres|entrada|abon|transfer/i.test(lower) ||
    !/(he |me han|me ha|acabo|registr|anota|apunta|quiero registrar|registra)/i.test(lower)
  ) {
    if (!/registra(r)?\s+(un\s+)?cobro/i.test(lower)) return null;
  }

  const amountMatch =
    q.match(/(\d{1,8})(?:[.,](\d{1,2}))?\s*(?:€|eur|euros?)?/i) ??
    q.match(/(?:€|eur|euros?)\s*(\d{1,8})(?:[.,](\d{1,2}))?/i);
  if (!amountMatch) return null;

  const whole = amountMatch[1] ?? "";
  const frac = amountMatch[2];
  const amountStr = frac != null ? `${whole}.${frac}` : whole;
  const amountEur = Math.round(Number.parseFloat(amountStr.replace(",", ".")) * 100) / 100;
  if (!Number.isFinite(amountEur) || amountEur <= 0) return null;

  const deMatch = q.match(/(?:de|del cliente|a favor de|cliente)\s+(.+?)(?:\.|,|$)/i);
  if (!deMatch?.[1]) return null;

  const clientName = deMatch[1]
    .trim()
    .replace(/\s+(en la|en el|factura).*$/i, "");
  if (clientName.length < 2) return null;

  return { amountEur, clientName };
}
