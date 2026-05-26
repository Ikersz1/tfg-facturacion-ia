import { rejectNewUserOnLoginIntent } from "@/lib/oauth-login-guard";
import {
  OAUTH_INTENT_COOKIE,
  OAUTH_STARTED_COOKIE,
  parseOAuthIntent,
} from "@/lib/oauth-intent";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

function clearOAuthCookies(response: NextResponse) {
  response.cookies.set(OAUTH_INTENT_COOKIE, "", { path: "/", maxAge: 0 });
  response.cookies.set(OAUTH_STARTED_COOKIE, "", { path: "/", maxAge: 0 });
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  let next = searchParams.get("next") ?? "/";

  if (!next.startsWith("/") || next.startsWith("//")) {
    next = "/";
  }

  if (!code) {
    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set("error", "auth_callback");
    const response = NextResponse.redirect(loginUrl);
    clearOAuthCookies(response);
    return response;
  }

  const cookieStore = await cookies();
  const oauthIntent = parseOAuthIntent(cookieStore.get(OAUTH_INTENT_COOKIE)?.value);
  const oauthStartedAt = cookieStore.get(OAUTH_STARTED_COOKIE)?.value ?? "";

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        },
      },
    },
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set("error", "auth_callback");
    const response = NextResponse.redirect(loginUrl);
    clearOAuthCookies(response);
    return response;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user && oauthStartedAt) {
    const { rejected } = await rejectNewUserOnLoginIntent(
      user,
      oauthIntent,
      oauthStartedAt,
    );
    if (rejected) {
      const loginUrl = new URL("/login", origin);
      loginUrl.searchParams.set("error", "no_account");
      const response = NextResponse.redirect(loginUrl);
      clearOAuthCookies(response);
      return response;
    }
  }

  const response = NextResponse.redirect(`${origin}${next}`);
  clearOAuthCookies(response);
  return response;
}
