/** Dominios de correo temporal muy usados (lista ampliable). */
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "guerrillamailblock.com",
  "sharklasers.com",
  "yopmail.com",
  "yopmail.fr",
  "tempmail.com",
  "temp-mail.org",
  "10minutemail.com",
  "10minutemail.net",
  "trashmail.com",
  "getnada.com",
  "fakeinbox.com",
  "dispostable.com",
  "maildrop.cc",
  "throwaway.email",
  "tempail.com",
  "emailondeck.com",
  "mailnesia.com",
  "mintemail.com",
  "mohmal.com",
  "tmpmail.org",
  "burnermail.io",
]);

function getDomain(email: string): string | null {
  const e = email.trim().toLowerCase();
  const at = e.lastIndexOf("@");
  if (at < 1 || at === e.length - 1) return null;
  return e.slice(at + 1);
}

function isDisposableDomain(domain: string): boolean {
  const d = domain.toLowerCase();
  for (const block of DISPOSABLE_DOMAINS) {
    if (d === block || d.endsWith(`.${block}`)) return true;
  }
  return false;
}

export type RegistrationEmailCheck =
  | { ok: true }
  | { ok: false; reason: "format" | "disposable" };

const SIMPLE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Formato de email (algo@dominio.ext) y bloqueo de dominios temporales típicos.
 */
export function validateRegistrationEmail(email: string): RegistrationEmailCheck {
  const trimmed = email.trim();
  if (!SIMPLE_EMAIL.test(trimmed)) {
    return { ok: false, reason: "format" };
  }

  const domain = getDomain(trimmed);
  if (!domain) return { ok: false, reason: "format" };

  if (isDisposableDomain(domain)) {
    return { ok: false, reason: "disposable" };
  }

  return { ok: true };
}
