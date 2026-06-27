import type { ReactNode } from "react";
import { PageBackButton } from "@/components/page-back-button";
import { ThemeToggle } from "@/components/theme-toggle";

const HEADER_MAX = "max-w-5xl";
/**
 * Hueco fijo (misma anchura que el botón atrás) para alinear título/eyebrow
 * con o sin flecha de navegación.
 */
const BACK_SLOT_CLASS = "hidden w-11 shrink-0 justify-start self-start pt-0.5 sm:flex";

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

  const titleClass = "text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl dark:text-zinc-50";

  return (
    <header
      className={`relative w-full max-w-full overflow-x-hidden border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 ${className}`}
    >
      {back ? (
        <div className="pointer-events-none absolute left-0 top-4 z-10 pl-1.5 sm:top-5 sm:pl-2">
          <div className="pointer-events-auto">
            <PageBackButton href={back.href} ariaLabel={back.ariaLabel} />
          </div>
        </div>
      ) : null}

      <div className={`mx-auto flex w-full min-w-0 ${HEADER_MAX} items-start gap-2 px-4 py-4 sm:gap-3 sm:px-6 sm:py-5`}>
        {/* Hueco fijo: títulos alineados con o sin flecha; la flecha va en absolute al borde */}
        <div className={BACK_SLOT_CLASS} aria-hidden />

        <div className="relative flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
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
          <div className="flex w-full flex-wrap items-center justify-start gap-2 pr-12 pt-0.5 sm:w-auto sm:shrink-0 sm:flex-nowrap sm:justify-end sm:pr-0">
            {actions}
          </div>

          <div className="absolute right-0 top-0 sm:static sm:pt-0.5">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
