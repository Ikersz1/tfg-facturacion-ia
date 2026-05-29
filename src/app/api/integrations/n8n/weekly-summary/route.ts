import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { buildWeeklySummaryForUser } from "@/lib/n8n/build-weekly-summary";
import { rangePreviousWeek } from "@/lib/n8n/weekly-summary-range";
import { verifyN8nBearer } from "@/lib/n8n/verify-request";

export const dynamic = "force-dynamic";

/**
 * GET /api/integrations/n8n/weekly-summary
 *
 * n8n llama con Schedule semanal (p. ej. lunes 08:00) y Bearer N8N_WEBHOOK_SECRET.
 * Devuelve un resumen por usuario con el toggle activo (semana anterior lun–dom).
 * Máximo un envío por usuario y semana (tabla n8n_weekly_summaries_sent).
 */
export async function GET(request: Request) {
  if (!verifyN8nBearer(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return Response.json({ error: "Falta SUPABASE_SERVICE_ROLE_KEY." }, { status: 503 });
  }

  const { weekKey } = rangePreviousWeek();

  const { data: profiles, error: profileErr } = await admin
    .from("user_fiscal_profile")
    .select("user_id, legal_name, tax_id")
    .eq("n8n_weekly_summary_enabled", true);

  if (profileErr) {
    return Response.json({ error: profileErr.message }, { status: 500 });
  }

  if (!profiles?.length) {
    return Response.json({
      ok: true,
      processed_at: new Date().toISOString(),
      week_key: weekKey,
      summary_count: 0,
      summaries: [],
    });
  }

  const userIds = profiles.map((p) => p.user_id as string);

  const { data: sentRows } = await admin
    .from("n8n_weekly_summaries_sent")
    .select("user_id")
    .in("user_id", userIds)
    .eq("week_key", weekKey);

  const alreadySent = new Set((sentRows ?? []).map((r) => r.user_id as string));

  const { data: authData } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const emailByUserId = new Map<string, string | null>(
    (authData?.users ?? []).map((u) => [u.id, u.email ?? null]),
  );

  const summaries = [];
  const toInsert: { user_id: string; week_key: string }[] = [];

  for (const profile of profiles) {
    const userId = profile.user_id as string;
    if (alreadySent.has(userId)) continue;

    const summary = await buildWeeklySummaryForUser(admin, {
      userId,
      issuerEmail: emailByUserId.get(userId) ?? null,
      legalName: (profile.legal_name as string | null) ?? null,
      taxId: (profile.tax_id as string | null) ?? null,
    });

    if (!summary) continue;

    toInsert.push({ user_id: userId, week_key: weekKey });
    summaries.push(summary);
  }

  if (toInsert.length > 0) {
    await admin.from("n8n_weekly_summaries_sent").insert(toInsert);
  }

  return Response.json({
    ok: true,
    processed_at: new Date().toISOString(),
    week_key: weekKey,
    summary_count: summaries.length,
    summaries,
  });
}
