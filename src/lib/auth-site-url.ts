/** Base URL for auth redirects (password reset, email links). */
export function getAuthSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/$/, "")}`;

  return "http://localhost:3000";
}

export function passwordResetRedirectUrl(): string {
  const base = getAuthSiteUrl();
  return `${base}/auth/callback?next=${encodeURIComponent("/reset-password")}`;
}

export function oauthCallbackRedirectUrl(next = "/"): string {
  const base = getAuthSiteUrl();
  const path = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  return `${base}/auth/callback?next=${encodeURIComponent(path)}`;
}
