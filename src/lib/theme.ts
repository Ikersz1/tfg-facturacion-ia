/** Misma clave en localStorage y cookie (evita <script> en layout con React 19). */
export const THEME_KEY = "tfg-theme" as const;

export function setThemeCookieClient(value: "dark" | "light") {
  if (typeof document === "undefined") return;
  document.cookie = `${THEME_KEY}=${value}; path=/; max-age=31536000; SameSite=Lax`;
}
