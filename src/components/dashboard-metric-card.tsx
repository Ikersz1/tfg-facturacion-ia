import type { ReactNode } from "react";

export function MetricCard({
  value,
  label,
  icon,
  accent,
}: {
  value: string;
  label: string;
  icon: ReactNode;
  accent?: "default" | "warning" | "danger";
}) {
  const ring =
    accent === "danger"
      ? "ring-red-200/80 dark:ring-red-900/50"
      : accent === "warning"
        ? "ring-amber-200/80 dark:ring-amber-900/40"
        : "ring-zinc-200/80 dark:ring-zinc-700/80";
  return (
    <div
      className={`flex flex-col justify-between rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm ring-1 ${ring} dark:border-zinc-700 dark:bg-zinc-900/80`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-2xl font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-zinc-50">
          {value}
        </p>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft/60 text-brand dark:bg-zinc-800 dark:text-accent">
          {icon}
        </span>
      </div>
      <p className="mt-3 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {label}
      </p>
    </div>
  );
}
