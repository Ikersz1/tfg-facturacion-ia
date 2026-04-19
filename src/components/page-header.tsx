import Link from "next/link";
import type { ReactNode } from "react";
import { ThemeToggle } from "@/components/theme-toggle";

const HEADER_MAX = "max-w-5xl";

type PageHeaderProps = {
  eyebrow?: ReactNode;
  eyebrowTone?: "brand" | "muted";
  title: ReactNode;
  description?: ReactNode;
  /** Controles junto al tema (p. ej. exportar en informes). */
  actions?: ReactNode;
  back?: { href: string; label: string };
  className?: string;
};

export function PageHeader({
  eyebrow,
  eyebrowTone = "brand",
  title,
  description,
  actions,
  back,
  className = "",
}: PageHeaderProps) {
  const eyebrowClass =
    eyebrowTone === "muted"
      ? "font-mono text-xs text-zinc-500 dark:text-zinc-400"
      : "text-xs font-semibold uppercase tracking-wider text-accent";

  const titleClass =
    "text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl dark:text-zinc-50";

  return (
    <header
      className={`w-full border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 ${className}`}
    >
      <div
        className={`mx-auto flex items-start justify-between gap-4 ${HEADER_MAX} px-4 py-4 sm:px-6 sm:py-4`}
      >
        <div className="min-w-0 flex-1">
          <div className="space-y-1">
            {back ? (
              <Link
                href={back.href}
                className="inline-block text-sm text-accent underline-offset-4 hover:text-accent-hover hover:underline"
              >
                {back.label}
              </Link>
            ) : null}
            {eyebrow ? <p className={eyebrowClass}>{eyebrow}</p> : null}
            <h1 className={titleClass}>{title}</h1>
          </div>
          {description ? (
            <div className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              {description}
            </div>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2 pt-0.5">
          {actions}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
