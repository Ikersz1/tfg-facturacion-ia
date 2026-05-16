import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { INVOICE_SERIES, type InvoiceSeriesId } from "@/lib/invoice-series";

export type SeriesNumberHint = {
  year: number;
  /** Último número emitido en esa serie y año; null si aún no hay emitidas. */
  lastIssuedNumber: number | null;
  /** Siguiente número que se asignará al emitir. */
  nextNumber: number;
};

export type InvoiceSeriesHints = Record<InvoiceSeriesId, SeriesNumberHint>;

/** Último número emitido por serie (año indicado) para mostrar en «Nueva factura». */
export async function loadInvoiceSeriesHints(
  supabase: SupabaseClient,
  year: number,
): Promise<InvoiceSeriesHints> {
  const out = {} as InvoiceSeriesHints;

  for (const s of INVOICE_SERIES) {
    const { data } = await supabase
      .from("invoices")
      .select("number")
      .eq("series", s.id)
      .eq("year", year)
      .not("number", "is", null)
      .order("number", { ascending: false })
      .limit(1)
      .maybeSingle();

    const last =
      data?.number != null && !Number.isNaN(Number(data.number))
        ? Number(data.number)
        : null;
    out[s.id] = {
      year,
      lastIssuedNumber: last,
      nextNumber: last != null ? last + 1 : 1,
    };
  }

  return out;
}
