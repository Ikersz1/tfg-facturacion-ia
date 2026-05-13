import type { ReactNode } from "react";
import { PageBackButton } from "@/components/page-back-button";
import { ThemeToggle } from "@/components/theme-toggle";

const HEADER_MAX = "max-w-5xl";
/** Misma anchura que `PageBackButton` (min-w-10 + px) para alinear títulos con o sin flecha */
const BACK_SLOT_CLASS =
  "flex w-11 shrink-0 justify-start self-start pt-0.5";

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
      className={`w-full max-w-full overflow-x-hidden border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 ${className}`}
    >
      <div
        className={`mx-auto flex w-full min-w-0 ${HEADER_MAX} items-start gap-2 px-4 py-4 sm:gap-3 sm:px-6 sm:py-5`}
      >
        <div className={BACK_SLOT_CLASS} aria-hidden={!back}>
          {back ? (
            <PageBackButton href={back.href} ariaLabel={back.ariaLabel} />
          ) : null}
        </div>

        <div className="flex min-w-0 flex-1 items-start justify-between gap-4">
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
