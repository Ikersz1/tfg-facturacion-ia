import { roundCurrencyEUR } from "@/lib/money";

export type LineRow = {
  line_net: number;
  line_tax: number;
  tax_rate: number;
};

/** DD-MM-YYYY (requisito Verifacti). */
export function formatFechaExpedicionVerifacti(issueDateYyyyMmDd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(issueDateYyyyMmDd.trim());
  if (!m) throw new Error("Fecha de emisión no válida (se espera YYYY-MM-DD).");
  const [, y, mo, d] = m;
  return `${d}-${mo}-${y}`;
}

function fmtImporte(n: number): string {
  return roundCurrencyEUR(n).toFixed(2);
}

function fmtTipoImpositivo(rate: number): string {
  const r = roundCurrencyEUR(rate);
  if (Number.isInteger(r)) return String(r);
  return r.toFixed(2);
}

/**
 * Agrupa líneas por tipo impositivo y construye el cuerpo JSON para factura F1 (receptor identificado).
 * @see https://www.verifacti.com/desarrolladores/ejemplos
 */
export function buildVerifactuF1Payload(input: {
  series: string;
  year: number;
  number: number;
  issueDateYyyyMmDd: string;
  clientNif: string;
  clientName: string;
  lines: LineRow[];
  /** Suma de bases + cuotas (debe coincidir con importe_total). */
  total: number;
  descripcion?: string;
}): Record<string, unknown> {
  const nif = input.clientNif.trim().toUpperCase();
  const nombre = input.clientName.trim();
  if (!nif) throw new Error("NIF del cliente obligatorio para Verifactu (F1).");
  if (!nombre) throw new Error("Nombre del cliente obligatorio para Verifactu (F1).");

  const buckets = new Map<number, { base: number; cuota: number }>();
  for (const l of input.lines) {
    const rate = roundCurrencyEUR(Number(l.tax_rate));
    if (rate <= 0) {
      throw new Error("Líneas con IVA 0 %: no soportadas en el envío Verifacti de esta versión.");
    }
    const prev = buckets.get(rate) ?? { base: 0, cuota: 0 };
    prev.base = roundCurrencyEUR(prev.base + Number(l.line_net));
    prev.cuota = roundCurrencyEUR(prev.cuota + Number(l.line_tax));
    buckets.set(rate, prev);
  }

  const rates = [...buckets.keys()].sort((a, b) => a - b);
  const lineas = rates.map((rate) => {
    const b = buckets.get(rate)!;
    return {
      base_imponible: fmtImporte(b.base),
      tipo_impositivo: fmtTipoImpositivo(rate),
      cuota_repercutida: fmtImporte(b.cuota),
    };
  });

  const sumCheck = roundCurrencyEUR(
    rates.reduce((s, rate) => {
      const b = buckets.get(rate)!;
      return s + b.base + b.cuota;
    }, 0),
  );
  const total = roundCurrencyEUR(input.total);
  if (sumCheck !== total) {
    throw new Error(
      `Los importes de línea no cuadran con el total (${sumCheck} ≠ ${total}). Recalcula la factura.`,
    );
  }

  const desc =
    (input.descripcion ?? "").trim().slice(0, 200) || "Factura";

  return {
    serie: input.series.trim().slice(0, 40),
    numero: `${input.year}-${input.number}`,
    fecha_expedicion: formatFechaExpedicionVerifacti(input.issueDateYyyyMmDd),
    tipo_factura: "F1",
    descripcion: desc,
    nif,
    nombre,
    lineas,
    importe_total: fmtImporte(total),
  };
}
