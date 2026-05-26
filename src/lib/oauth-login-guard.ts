import "server-only";

import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { isNewUserFromOAuth, type OAuthIntent } from "@/lib/oauth-intent";
import { createClient } from "@/lib/supabase/server";

/**
 * On login-with-Google, reject accounts created in this OAuth flow (no prior registration).
 * Removes the orphan auth user when service_role is available.
 */
export async function rejectNewUserOnLoginIntent(
  user: User,
  intent: OAuthIntent,
  oauthStartedAtIso: string,
): Promise<{ rejected: boolean }> {
  if (intent !== "login") {
    return { rejected: false };
  }
  if (!isNewUserFromOAuth(user, oauthStartedAtIso)) {
    return { rejected: false };
  }

  const supabase = await createClient();
  await supabase.auth.signOut();

  try {
    const admin = createAdminClient();
    await admin.auth.admin.deleteUser(user.id);
  } catch {
    // Sin service_role la sesión ya se cerró; el usuario huérfano puede quedar en auth.
  }

  return { rejected: true };
}
