"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/settings/fiscal", label: "Datos fiscales" },
  { href: "/settings/automatizacion", label: "Automatización" },
  { href: "/settings/asistente", label: "Asistente IA" },
] as const;

export function SettingsSubnav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Ajustes"
      className="border-b border-zinc-200/90 bg-white/60 dark:border-zinc-800 dark:bg-zinc-950/80"
    >
      <div className="mx-auto flex w-full max-w-5xl gap-1 px-4 sm:px-6">
        {LINKS.map((link) => {
          const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`relative -mb-px border-b-2 px-3 py-3 text-sm font-medium transition ${
                active
                  ? "border-brand text-zinc-900 dark:text-zinc-50"
                  : "border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
