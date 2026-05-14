import { createAdminClient } from "@/lib/supabase/admin";
import { syncVerifactuStatusForInvoice } from "@/lib/verifacti/sync-invoice-status";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Vercel Cron: GET como máximo una vez al día en Hobby (ver `vercel.json`).
 * Seguridad: cabecera `Authorization: Bearer ${CRON_SECRET}` (Vercel la envía si defines CRON_SECRET).
 *
 * Solo procesa facturas con `verifacti_uuid` y estado registro pendiente / vacío (heurística).
 */
export async function GET(request: NextRequest) {
  const expected = process.env.CRON_SECRET?.trim();
  if (!expected) {
    return Response.json(
      { error: "Define CRON_SECRET en el proyecto (Vercel → Environment Variables)." },
      { status: 503 },
    );
  }

  const auth = request.headers.get("authorization")?.trim();
  if (auth !== `Bearer ${expected}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (!process.env.VERIFACTI_NIF_API_KEY?.trim()) {
    return Response.json({ ok: true, skipped: true, message: "Sin VERIFACTI_NIF_API_KEY." });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return Response.json(
      { error: "Falta SUPABASE_SERVICE_ROLE_KEY para el cron." },
      { status: 503 },
    );
  }

  const { data: nullEstado, error: e1 } = await admin
    .from("invoices")
    .select("id")
    .not("verifacti_uuid", "is", null)
    .is("verifacti_registro_estado", null)
    .limit(12);

  const { data: pendienteRows, error: e2 } = await admin
    .from("invoices")
    .select("id")
    .not("verifacti_uuid", "is", null)
    .ilike("verifacti_registro_estado", "%pendiente%")
    .limit(12);

  if (e1 || e2) {
    return Response.json({ error: e1?.message ?? e2?.message }, { status: 500 });
  }

  const idSet = new Set<string>();
  for (const r of nullEstado ?? []) idSet.add(r.id as string);
  for (const r of pendienteRows ?? []) idSet.add(r.id as string);
  const ids = [...idSet].slice(0, 20);

  const results: { id: string; ok: boolean; error?: string }[] = [];

  for (const id of ids) {
    const r = await syncVerifactuStatusForInvoice(admin, id, "cron");
    results.push({
      id,
      ok: r.ok,
      error: r.ok ? undefined : r.error,
    });
  }

  return Response.json({
    ok: true,
    checked: results.length,
    results,
  });
}
