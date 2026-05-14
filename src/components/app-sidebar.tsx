"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { logoutAction } from "@/app/actions/auth";

type NavItem = {
  label: string;
  href?: string;
  soon?: boolean;
  icon: "home" | "invoice" | "users" | "box" | "chart" | "zap" | "spark" | "settings";
};

const SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: "Principal",
    items: [
      {
        label: "Inicio",
        href: "/",
        icon: "home",
      },
    ],
  },
  {
    title: "Gestión",
    items: [
      { label: "Facturas", href: "/invoices", icon: "invoice" },
      { label: "Clientes", href: "/clients", icon: "users" },
      { label: "Catálogo", href: "/catalogo", icon: "box" },
    ],
  },
  {
    title: "Análisis",
    items: [{ label: "Informes", href: "/informes", icon: "chart" }],
  },
  {
    title: "Automatización",
    items: [{ label: "Integraciones (n8n)", soon: true, icon: "zap" }],
  },
  {
    title: "IA",
    items: [{ label: "Asistente", soon: true, icon: "spark" }],
  },
  {
    title: "Cuenta",
    items: [{ label: "Ajustes", href: "/settings/fiscal", icon: "settings" }],
  },
];

function Icon({ name }: { name: NavItem["icon"] }) {
  const common = "h-[1.125rem] w-[1.125rem] shrink-0";
  switch (name) {
    case "home":
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
      );
    case "invoice":
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 8.25H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75M21 12.75v-4.875c0-.621-.504-1.125-1.125-1.125h-4.5" />
        </svg>
      );
    case "users":
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
        </svg>
      );
    case "box":
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
        </svg>
      );
    case "chart":
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v7.125c0 .621-.504 1.125-1.125 1.125H4.125A1.125 1.125 0 0 1 3 20.25v-7.125ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
        </svg>
      );
    case "zap":
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
        </svg>
      );
    case "spark":
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
        </svg>
      );
    case "settings":
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        </svg>
      );
    default:
      return null;
  }
}

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarBrand({ onLogoClick }: { onLogoClick?: () => void }) {
  return (
    <div className="border-b border-zinc-200/90 bg-brand-soft/35 px-4 py-4 dark:border-zinc-800 dark:bg-zinc-950">
      <Link
        href="/"
        className="flex items-center gap-2 rounded-lg outline-none transition hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-brand/40 dark:hover:bg-zinc-800 dark:focus-visible:ring-brand/40"
        onClick={onLogoClick}
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-sm font-bold text-brand-fg">
          F
        </span>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">Facturación</p>
          <p className="truncate text-[11px] text-accent/75 dark:text-zinc-500">TFG · panel</p>
        </div>
      </Link>
    </div>
  );
}

function SidebarNav({
  pathname,
  onSoon,
  onNavigate,
}: {
  pathname: string;
  onSoon: (label: string) => void;
  onNavigate: () => void;
}) {
  return (
    <nav className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-3 pb-4 pt-2">
      {SECTIONS.map((section) => (
        <div key={section.title}>
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-blue-800/90 dark:text-sky-300">
            {section.title}
          </p>
          <ul className="flex flex-col gap-0.5">
            {section.items.map((item) => {
              const active = item.href ? isActive(pathname, item.href) : false;
              const base =
                "group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors";
              const idle =
                "border-l-2 border-transparent text-zinc-600 hover:bg-brand-soft/50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100";
              const current =
                "border-l-2 border-brand bg-brand-soft/45 font-medium text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50";

              if (item.soon) {
                return (
                  <li key={item.label}>
                    <button
                      type="button"
                      onClick={() => onSoon(item.label)}
                      className={`${base} ${idle} w-full text-left`}
                    >
                      <span className="text-zinc-400 transition group-hover:text-zinc-600 dark:group-hover:text-zinc-300">
                        <Icon name={item.icon} />
                      </span>
                      <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                        <span className="truncate">{item.label}</span>
                        <span className="shrink-0 rounded-md bg-zinc-200 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
                          Pronto
                        </span>
                      </span>
                    </button>
                  </li>
                );
              }

              if (!item.href) return null;

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`${base} ${active ? current : idle}`}
                    onClick={onNavigate}
                  >
                    <span
                      className={
                        active
                          ? "text-brand dark:text-accent"
                          : "text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-300"
                      }
                    >
                      <Icon name={item.icon} />
                    </span>
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function SidebarFooter() {
  return (
    <div className="mt-auto border-t border-zinc-200/80 bg-brand-soft/20 px-4 py-3 dark:border-zinc-800/80 dark:bg-transparent">
      <form action={logoutAction}>
        <button
          type="submit"
          className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-zinc-500 transition hover:bg-zinc-100/80 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-200"
        >
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9"
            />
          </svg>
          Cerrar sesión
        </button>
      </form>
    </div>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [soonOpen, setSoonOpen] = useState(false);
  const [soonLabel, setSoonLabel] = useState("");

  const openSoon = useCallback((label: string) => {
    setSoonLabel(label);
    setSoonOpen(true);
    setMobileOpen(false);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!soonOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSoonOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [soonOpen]);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  const asideClass =
    "flex w-64 shrink-0 flex-col border-r border-zinc-200 bg-brand-soft/30 shadow-[1px_0_0_0_rgba(37,99,235,0.06)] dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-[4px_0_24px_-12px_rgba(0,0,0,0.4)]";

  return (
    <>
      {/* Mobile menu button */}
      <button
        type="button"
        aria-expanded={mobileOpen}
        aria-controls="app-sidebar-nav"
        onClick={() => setMobileOpen((o) => !o)}
        className="fixed left-3 top-3 z-50 flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-200 bg-brand-soft/40 text-zinc-700 shadow-sm backdrop-blur md:hidden dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
      >
        <span className="sr-only">{mobileOpen ? "Cerrar menú" : "Abrir menú"}</span>
        {mobileOpen ? (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        )}
      </button>

      {mobileOpen ? (
        <button
          type="button"
          aria-label="Cerrar menú"
          className="fixed inset-0 z-40 bg-zinc-900/40 backdrop-blur-[2px] md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      {/* Desktop: fixed sidebar */}
      <aside
        className={`${asideClass} fixed inset-y-0 left-0 z-40 hidden md:flex`}
        id="app-sidebar-nav"
      >
        <SidebarBrand />
        <SidebarNav pathname={pathname} onSoon={openSoon} onNavigate={() => {}} />
        <SidebarFooter />
      </aside>

      <aside
        className={`${asideClass} fixed inset-y-0 left-0 z-50 max-w-[85vw] transition-transform duration-200 ease-out md:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full pointer-events-none"
        }`}
        aria-hidden={!mobileOpen}
        inert={!mobileOpen ? true : undefined}
      >
        <SidebarBrand onLogoClick={closeMobile} />
        <SidebarNav pathname={pathname} onSoon={openSoon} onNavigate={closeMobile} />
        <SidebarFooter />
      </aside>

      {/* Coming soon modal */}
      {soonOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-zinc-900/50 backdrop-blur-[2px]"
            aria-label="Cerrar"
            onClick={() => setSoonOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="soon-title"
            className="relative z-10 w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 text-2xl dark:bg-zinc-800">
              <span aria-hidden>✨</span>
            </div>
            <h2 id="soon-title" className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Próximamente
            </h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              <span className="font-medium text-zinc-800 dark:text-zinc-200">{soonLabel}</span> aún no está
              disponible. Seguimos trabajando en ello.
            </p>
            <button
              type="button"
              onClick={() => setSoonOpen(false)}
              className="mt-6 w-full rounded-xl bg-brand py-2.5 text-sm font-medium text-brand-fg transition hover:bg-brand-hover dark:bg-brand dark:text-brand-fg dark:hover:bg-brand-hover"
            >
              Entendido
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
