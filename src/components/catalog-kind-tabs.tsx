import Link from "next/link";
import type { CatalogKind } from "@/lib/catalog-kind";

type Props = { activeKind: CatalogKind };

function TabIcon({ kind }: { kind: CatalogKind }) {
  const cls = "h-[1.125rem] w-[1.125rem] shrink-0";
  if (kind === "product") {
    return (
      <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z"
        />
      </svg>
    );
  }
  return (
    <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0H9m3 0h3M6.75 6.75h.008v.008H6.75V6.75Zm2.25 0h.008v.008h-.008V6.75Zm2.25 0h.008v.008h-.008V6.75Zm0 2.25h.008v.008H11.25V9Zm0 2.25h.008v.008h-.008V11.25Zm-2.25 0h.008v.008H9V11.25Zm-2.25 0h.008v.008H6.75V11.25Z"
      />
    </svg>
  );
}

export function CatalogKindTabs({ activeKind }: Props) {
  const tab = (kind: CatalogKind, label: string, sub: string) => {
    const active = activeKind === kind;
    return (
      <Link
        href={`/catalogo?kind=${kind}`}
        className={`group relative flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-4 py-2.5 text-center transition sm:min-w-[9.5rem] ${
          active
            ? "bg-white text-zinc-900 shadow-md ring-1 ring-zinc-200/80 dark:bg-zinc-900 dark:text-zinc-50 dark:ring-zinc-600"
            : "text-zinc-600 hover:bg-white/60 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900/50 dark:hover:text-zinc-100"
        }`}
      >
        <span
          className={`flex items-center gap-2 text-sm font-semibold tracking-tight ${
            active ? "text-brand dark:text-accent" : ""
          }`}
        >
          <TabIcon kind={kind} />
          {label}
        </span>
        <span className="hidden text-[11px] font-normal text-zinc-500 dark:text-zinc-500 sm:block">{sub}</span>
      </Link>
    );
  };

  return (
    <div
      className="flex w-full flex-col gap-1 rounded-2xl border border-zinc-200/90 bg-gradient-to-b from-zinc-50 to-zinc-100/90 p-1.5 shadow-sm dark:border-zinc-700/90 dark:from-zinc-900 dark:to-zinc-950/90 sm:inline-flex sm:w-auto sm:flex-row"
      role="tablist"
      aria-label="Tipo de catálogo"
    >
      {tab("product", "Productos", "Inventario y artículos")}
      {tab("service", "Servicios", "Honorarios, horas, cuotas…")}
    </div>
  );
}
