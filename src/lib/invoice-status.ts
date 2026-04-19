import { roundCurrencyEUR } from "@/lib/money";

/** Fecha local YYYY-MM-DD (criterio de negocio para vencimientos). */
export function todayLocalYMD(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const YMD = /^\d{4}-\d{2}-\d{2}$/;

function normYmd(s: string | null | undefined): string | null {
  const t = s?.trim().slice(0, 10);
  return t && YMD.test(t) ? t : null;
}

/**
 * Fecha de referencia para saber si ha vencido: `due_date` si existe; si no, `issue_date`.
 * Sin ninguna fecha no se puede marcar vencida por calendario.
 */
export function overdueReferenceYmd(issueDate: string | null, dueDate: string | null): string | null {
  return normYmd(dueDate) ?? normYmd(issueDate);
}

/** El día de referencia ha pasado (el mismo día de vencimiento aún no cuenta como vencido). */
export function isPastDue(referenceYmd: string | null, todayYmd: string): boolean {
  if (!referenceYmd) return false;
  return todayYmd > referenceYmd;
}

/**
 * Estado mostrable coherente con importe cobrado y fechas.
 * La columna `status` puede seguir en `issued` aunque haya pasado el vencimiento.
 */
export function effectiveInvoiceStatus(input: {
  status: string;
  total: number;
  paidSum: number;
  issue_date: string | null;
  due_date: string | null;
  todayYmd?: string;
}): string {
  const { status, total, paidSum, issue_date, due_date } = input;
  const todayYmd = input.todayYmd ?? todayLocalYMD();

  if (status === "draft" || status === "cancelled") return status;

  const outstanding = roundCurrencyEUR(Math.max(0, total - paidSum));
  if (status === "paid" || outstanding <= 0) return "paid";

  const ref = overdueReferenceYmd(issue_date, due_date);
  if (ref && isPastDue(ref, todayYmd)) {
    return "overdue";
  }

  if (paidSum > 0) return "partial";
  return "issued";
}
