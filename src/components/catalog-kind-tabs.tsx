import Link from "next/link";
import type { CatalogKind } from "@/lib/catalog-kind";

type Props = { activeKind: CatalogKind };

export function CatalogKindTabs({ activeKind }: Props) {
  const tab = (kind: CatalogKind, label: string) => {
    const active = activeKind === kind;
    return (
      <Link
        href={`/catalogo?kind=${kind}`}
        className={`border-b-2 px-3 py-2 text-sm font-medium transition-colors -mb-px ${
          active
            ? "border-brand text-zinc-900 dark:text-zinc-50"
            : "border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <nav
      className="flex gap-1 border-b border-zinc-200 dark:border-zinc-700"
      role="tablist"
      aria-label="Tipo de catálogo"
    >
      {tab("product", "Productos")}
      {tab("service", "Servicios")}
    </nav>
  );
}
