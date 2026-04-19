import "server-only";

import { createClient } from "@supabase/supabase-js";

/**
 * Cliente con service_role: ignora RLS. Usar solo en Server Actions,
 * Route Handlers y Server Components que no re-exporten datos al cliente de forma insegura.
 * La clave debe existir solo en el servidor (nunca NEXT_PUBLIC_*).
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY (solo servidor).",
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
