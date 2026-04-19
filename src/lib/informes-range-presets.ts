import { formatYMD } from "@/lib/invoice-list-url";

export type InformesRangePresetId = "week" | "month" | "last12" | "custom";

function ymdUtc(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function startOfWeekMondayLocal(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - day);
  return x;
}

export function rangeThisWeek(): { from: string; to: string } {
  const start = startOfWeekMondayLocal(new Date());
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return { from: formatYMD(start), to: formatYMD(end) };
}

export function rangeThisMonth(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { from: formatYMD(from), to: formatYMD(to) };
}

/** Misma lógica que `defaultRange()` en `reports-data` (fechas en UTC vía toISOString). */
export function rangeLast12Months(): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setMonth(from.getMonth() - 12);
  return { from: ymdUtc(from), to: ymdUtc(to) };
}

export function detectInformesPreset(from: string, to: string): InformesRangePresetId {
  const rw = rangeThisWeek();
  if (from === rw.from && to === rw.to) return "week";
  const rm = rangeThisMonth();
  if (from === rm.from && to === rm.to) return "month";
  const r12 = rangeLast12Months();
  if (from === r12.from && to === r12.to) return "last12";
  return "custom";
}

export function rangeForPreset(id: Exclude<InformesRangePresetId, "custom">): {
  from: string;
  to: string;
} {
  switch (id) {
    case "week":
      return rangeThisWeek();
    case "month":
      return rangeThisMonth();
    case "last12":
      return rangeLast12Months();
  }
}

export function formatInformesRangeLabel(from: string, to: string): string {
  const opts: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    year: "numeric",
  };
  const a = new Date(`${from}T12:00:00`);
  const b = new Date(`${to}T12:00:00`);
  if (from === to) return a.toLocaleDateString("es-ES", opts);
  return `${a.toLocaleDateString("es-ES", opts)} – ${b.toLocaleDateString("es-ES", opts)}`;
}
