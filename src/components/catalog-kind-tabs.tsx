import Link from "next/link";
import type { CatalogKind } from "@/lib/catalog-kind";

type Props = { activeKind: CatalogKind };

export function CatalogKindTabs({ activeKind }: Props) {
  const tab = (kind: CatalogKind, label: string) => {
    const active = activeKind === kind;
    return (
      <Link
        href={`/catalogo?kind=${kind}`}
        className={`inline-flex min-h-9 flex-1 items-center justify-center rounded-lg px-4 text-sm font-medium transition ${
          active
            ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-50"
            : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <div
      className="inline-flex w-full max-w-md rounded-xl border border-zinc-200 bg-zinc-100/90 p-1 dark:border-zinc-700 dark:bg-zinc-800/80 sm:w-auto"
      role="tablist"
      aria-label="Tipo de catálogo"
    >
      {tab("product", "Productos")}
      {tab("service", "Servicios")}
    </div>
  );
}
