import { formatYMD } from "@/lib/invoice-list-url";

function startOfWeekMondayLocal(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - day);
  return x;
}

/** Semana natural anterior (lunes–domingo) respecto a hoy. */
export function rangePreviousWeek(): { from: string; to: string; weekKey: string } {
  const thisMonday = startOfWeekMondayLocal(new Date());
  const lastMonday = new Date(thisMonday);
  lastMonday.setDate(lastMonday.getDate() - 7);
  const lastSunday = new Date(thisMonday);
  lastSunday.setDate(lastSunday.getDate() - 1);
  const from = formatYMD(lastMonday);
  const to = formatYMD(lastSunday);
  return { from, to, weekKey: from };
}

export function formatPeriodLabel(from: string, to: string): string {
  const opts: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    year: "numeric",
  };
  const a = new Date(`${from}T12:00:00`);
  const b = new Date(`${to}T12:00:00`);
  return `${a.toLocaleDateString("es-ES", opts)} – ${b.toLocaleDateString("es-ES", opts)}`;
}
