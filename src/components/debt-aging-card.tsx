import type { AgingBucket } from "@/lib/reports-data";
import { formatMoneyEUR } from "@/lib/money";

const BUCKET_STYLE: Record<string, { bar: string; dot: string }> = {
  "0-30": { bar: "bg-emerald-500", dot: "bg-emerald-500" },
  "31-60": { bar: "bg-amber-500", dot: "bg-amber-500" },
  "61-90": { bar: "bg-orange-500", dot: "bg-orange-500" },
  "90+": { bar: "bg-red-500", dot: "bg-red-500" },
};

export function DebtAgingCard({ buckets }: { buckets: AgingBucket[] }) {
  const total = buckets.reduce((acc, b) => acc + b.amount, 0);

  return (
    <section className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-blue-800 dark:text-sky-300">Antigüedad de la deuda</h2>
        <span className="text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
          {formatMoneyEUR(total)}
        </span>
      </div>
      <p className="mb-4 text-[11px] text-zinc-500 dark:text-zinc-400">
        Importe pendiente vivo según los días transcurridos desde el vencimiento.
      </p>

      {total <= 0 ? (
        <p className="py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
          Sin deuda pendiente. Todo al día.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {buckets.map((b) => {
            const pct = total > 0 ? (b.amount / total) * 100 : 0;
            const style = BUCKET_STYLE[b.id] ?? BUCKET_STYLE["0-30"];
            return (
              <li key={b.id} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="inline-flex items-center gap-2 font-medium text-zinc-600 dark:text-zinc-300">
                    <span className={`h-2 w-2 rounded-full ${style.dot}`} />
                    {b.label}
                  </span>
                  <span className="tabular-nums text-zinc-900 dark:text-zinc-100">
                    {formatMoneyEUR(b.amount)}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div
                    className={`h-full rounded-full transition-[width] duration-700 ease-out ${style.bar}`}
                    style={{ width: `${Math.max(pct, b.amount > 0 ? 4 : 0)}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
