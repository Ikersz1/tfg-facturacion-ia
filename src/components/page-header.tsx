import type { ReactNode } from "react";
import { PageBackButton } from "@/components/page-back-button";
import { ThemeToggle } from "@/components/theme-toggle";

const HEADER_MAX = "max-w-5xl";

type PageHeaderProps = {
  eyebrow?: ReactNode;
  eyebrowTone?: "brand" | "muted";
  title: ReactNode;
  description?: ReactNode;
  /** Controles junto al tema (p. ej. exportar en informes). */
  actions?: ReactNode;
  /** Icono de retroceso arriba a la izquierda; `ariaLabel` opcional para accesibilidad */
  back?: { href: string; ariaLabel?: string };
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
      <div className={`mx-auto ${HEADER_MAX} px-4 sm:px-6`}>
        {back ? (
          <div className="flex justify-start pt-4 sm:pt-5 -ml-5 sm:-ml-6">
            <PageBackButton href={back.href} ariaLabel={back.ariaLabel} />
          </div>
        ) : null}

        <div
          className={`flex items-start justify-between gap-4 ${
            back ? "pb-5 pt-4 sm:pb-6" : "py-4 sm:py-5"
          }`}
        >
          <div className="min-w-0 flex-1">
            <div className="space-y-1.5">
              {eyebrow ? <p className={eyebrowClass}>{eyebrow}</p> : null}
              <h1 className={titleClass}>{title}</h1>
            </div>
            {description ? (
              <div className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                {description}
              </div>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2 pt-0.5">
            {actions}
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
