import { promises as dns } from "node:dns";

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

const DNS_TIMEOUT_MS = 4500;

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

async function domainHasMailRouting(domain: string): Promise<boolean> {
  try {
    const mx = await dns.resolveMx(domain);
    if (mx?.length) return true;
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== "ENODATA" && code !== "ENOTFOUND" && code !== "ESERVFAIL") {
      throw err;
    }
  }

  try {
    const a = await dns.resolve4(domain);
    if (a?.length) return true;
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== "ENODATA" && code !== "ENOTFOUND" && code !== "ESERVFAIL") {
      throw err;
    }
  }

  try {
    const aaaa = await dns.resolve6(domain);
    return (aaaa?.length ?? 0) > 0;
  } catch {
    return false;
  }
}

export type RegistrationEmailCheck =
  | { ok: true }
  | { ok: false; reason: "format" | "disposable" | "invalid_domain" };

const SIMPLE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Comprueba que el email sea razonable: formato, no dominio temporal típico,
 * y que el dominio tenga MX o resolución A/AAAA (no demuestra que el buzón exista).
 */
export async function validateRegistrationEmail(email: string): Promise<RegistrationEmailCheck> {
  const trimmed = email.trim();
  if (!SIMPLE_EMAIL.test(trimmed)) {
    return { ok: false, reason: "format" };
  }

  const domain = getDomain(trimmed);
  if (!domain) return { ok: false, reason: "format" };

  if (isDisposableDomain(domain)) {
    return { ok: false, reason: "disposable" };
  }

  try {
    const hasRouting = await Promise.race([
      domainHasMailRouting(domain),
      new Promise<boolean>((_, reject) => {
        setTimeout(() => reject(new Error("dns_timeout")), DNS_TIMEOUT_MS);
      }),
    ]);
    if (!hasRouting) return { ok: false, reason: "invalid_domain" };
    return { ok: true };
  } catch {
    // Timeout u error DNS transitorio: no bloqueamos el alta.
    return { ok: true };
  }
}
