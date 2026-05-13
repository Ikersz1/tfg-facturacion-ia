import Link from "next/link";

export type PageBackButtonProps = {
  href: string;
  /** Solo lectores de pantalla; el botón no muestra texto visible */
  ariaLabel?: string;
  className?: string;
};

/**
 * Retroceso estándar: icono de flecha, sin etiqueta visible.
 * Usar en cualquier página que enlace a la vista anterior o listado.
 */
export function PageBackButton({
  href,
  ariaLabel = "Volver",
  className = "",
}: PageBackButtonProps) {
  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      className={`inline-flex h-10 min-w-10 shrink-0 items-center justify-center rounded-md px-1 text-accent outline-none ring-accent/30 transition hover:bg-brand-soft hover:text-accent-hover focus-visible:ring-2 dark:hover:bg-zinc-800 dark:hover:text-accent-hover ${className}`}
    >
      <svg
        className="h-5 w-7"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
        />
      </svg>
    </Link>
  );
}
