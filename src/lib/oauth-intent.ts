import type { User } from "@supabase/supabase-js";

export type OAuthIntent = "login" | "signup";

export const OAUTH_INTENT_COOKIE = "tfg_oauth_intent";
export const OAUTH_STARTED_COOKIE = "tfg_oauth_started_at";

const COOKIE_MAX_AGE = 60 * 10; // 10 minutes

export function oauthIntentCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  };
}

export function parseOAuthIntent(value: string | undefined): OAuthIntent {
  return value === "signup" ? "signup" : "login";
}

/** True when Supabase created the user during this OAuth round-trip. */
export function isNewUserFromOAuth(user: User, oauthStartedAtIso: string): boolean {
  const started = new Date(oauthStartedAtIso).getTime();
  if (Number.isNaN(started)) return false;
  const created = new Date(user.created_at).getTime();
  return created >= started - 15_000;
}
