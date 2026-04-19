"use server";

import { getReportsData } from "@/lib/reports-data";
import { formatMoneyEUR } from "@/lib/money";

export type InsightState = { ok?: true; text?: string; error?: string };

function spFromForm(formData: FormData): Record<string, string | string[] | undefined> {
  const sp: Record<string, string | string[] | undefined> = {};
  const from = formData.get("from")?.toString();
  const to = formData.get("to")?.toString();
  const client_id = formData.get("client_id")?.toString();
  const granularity = formData.get("granularity")?.toString();
  if (from) sp.from = from;
  if (to) sp.to = to;
  if (client_id && client_id !== "all") sp.client_id = client_id;
  if (granularity) sp.granularity = granularity;
  return sp;
}

export async function reportsInsightAction(
  _prev: InsightState,
  formData: FormData,
): Promise<InsightState> {
  const q = formData.get("q")?.toString().trim().toLowerCase() ?? "";
  if (!q) {
    return { error: "Escribe una pregunta." };
  }

  const data = await getReportsData(spFromForm(formData));
  const h = data.aiHints;
  const m = data.metrics;

  if (/mejor (mes|periodo)|más facturación|más ingresos|periodo con más/i.test(q)) {
    if (h.bestPeriodAmount <= 0) {
      return { ok: true, text: "En el rango seleccionado no hay facturación registrada." };
    }
    return {
      ok: true,
      text: `El periodo con más ingresos es ${h.bestPeriodLabel}, con ${formatMoneyEUR(h.bestPeriodAmount)} facturados.`,
    };
  }

  if (/deuda|debe|pendiente|quién no paga|moros/i.test(q)) {
    if (h.topDebtAmount <= 0) {
      return { ok: true, text: "No hay deuda pendiente con los filtros actuales." };
    }
    return {
      ok: true,
      text: `El cliente con más importe pendiente es «${h.topDebtClientName}» (${formatMoneyEUR(h.topDebtAmount)}).`,
    };
  }

  if (/trimestre|último trimestre|tres meses|3 meses/i.test(q)) {
    return {
      ok: true,
      text: `En los últimos tres meses (aprox.) has facturado ${formatMoneyEUR(h.lastQuarterBilled)} con los filtros de cliente aplicados.`,
    };
  }

  if (/mes pasado|compar|evolución|porcentaje|mejor que/i.test(q)) {
    if (m.pctChangeVsPreviousMonth == null) {
      return {
        ok: true,
        text: "No hay datos suficientes para comparar el mes actual con el anterior.",
      };
    }
    const sign = m.pctChangeVsPreviousMonth >= 0 ? "+" : "";
    return {
      ok: true,
      text: `Este mes calendario llevas ${formatMoneyEUR(m.billedThisCalendarMonth)} facturados, frente a ${formatMoneyEUR(m.billedPreviousCalendarMonth)} el mes anterior. Variación aproximada: ${sign}${m.pctChangeVsPreviousMonth.toFixed(1)} %.`,
    };
  }

  if (/cobrado|cobros|ingresos cobrados/i.test(q)) {
    return {
      ok: true,
      text: `Sobre las facturas emitidas en el periodo del informe hay ${formatMoneyEUR(m.collectedInPeriod)} cobrados en total (suma de pagos asociados a esas facturas).`,
    };
  }

  if (/resumen|resume|cuéntame/i.test(q)) {
    return {
      ok: true,
      text: `Resumen: facturado en periodo ${formatMoneyEUR(m.billedInPeriod)}, cobrado ${formatMoneyEUR(m.collectedInPeriod)}, pendiente actual ${formatMoneyEUR(m.pendingNow)} (vencido ${formatMoneyEUR(m.overdueNow)}). Hay ${m.invoiceCountInPeriod} facturas emitidas en el rango.`,
    };
  }

  return {
    ok: true,
    text: 'Prueba preguntas como: «¿Cuál ha sido mi mejor mes?», «¿Qué cliente tiene más deuda?», «Resume mis ingresos del último trimestre» o «¿Voy mejor que el mes pasado?».',
  };
}
