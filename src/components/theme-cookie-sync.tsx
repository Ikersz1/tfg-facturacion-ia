"use client";

import { useRouter } from "next/navigation";
import { useLayoutEffect, useRef } from "react";
import { setThemeCookieClient, THEME_KEY } from "@/lib/theme";

/**
 * Si solo había preferencia en localStorage (p. ej. antes de usar cookie),
 * copia a cookie y refresca para alinear SSR con el tema guardado.
 */
export function ThemeCookieSync() {
  const router = useRouter();
  const ran = useRef(false);

  useLayoutEffect(() => {
    if (ran.current) return;
    try {
      const ls = localStorage.getItem(THEME_KEY);
      if (ls !== "dark" && ls !== "light") return;
      const match = document.cookie.match(new RegExp(`(?:^|; )${THEME_KEY}=([^;]*)`));
      const ck = match?.[1];
      if (ck === ls) return;
      setThemeCookieClient(ls);
      ran.current = true;
      router.refresh();
    } catch {
      /* noop */
    }
  }, [router]);

  return null;
}
