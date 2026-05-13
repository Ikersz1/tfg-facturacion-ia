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
      className={`inline-flex size-10 shrink-0 items-center justify-center rounded-md text-zinc-600 outline-none ring-zinc-400/40 transition hover:bg-zinc-100 hover:text-zinc-900 focus-visible:ring-2 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50 ${className}`}
    >
      <svg
        className="size-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
      </svg>
    </Link>
  );
}
