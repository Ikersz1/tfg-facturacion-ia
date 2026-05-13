import type { SupabaseClient } from "@supabase/supabase-js";

export async function requireAuthUserId(
  supabase: SupabaseClient,
): Promise<{ userId: string } | { error: string }> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user?.id) {
    return { error: "Sesión caducada o no válida. Cierra sesión y vuelve a entrar." };
  }
  return { userId: user.id };
}
