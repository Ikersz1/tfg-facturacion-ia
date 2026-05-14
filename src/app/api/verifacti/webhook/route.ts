import { createAdminClient } from "@/lib/supabase/admin";
import { extractVerifactiWebhookUpdates } from "@/lib/verifacti/webhook-parse";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Verifacti llama a esta URL tras el envío a la AEAT (según su documentación).
 * Requiere SUPABASE_SERVICE_ROLE_KEY para actualizar facturas sin sesión.
 *
 * Seguridad opcional: define VERIFACTI_WEBHOOK_SECRET y en Verifacti configura
 * la misma clave como query ?token=... o cabecera X-Verifacti-Webhook-Secret.
 */
export async function GET() {
  return Response.json({ ok: true, service: "verifacti-webhook" });
}

function verifySecret(request: NextRequest): boolean {
  const secret = process.env.VERIFACTI_WEBHOOK_SECRET?.trim();
  if (!secret) return true;

  const q = request.nextUrl.searchParams.get("token")?.trim();
  if (q === secret) return true;

  const h = request.headers.get("x-verifacti-webhook-secret")?.trim();
  if (h === secret) return true;

  const auth = request.headers.get("authorization")?.trim();
  if (auth === `Bearer ${secret}`) return true;

  return false;
}

export async function POST(request: NextRequest) {
  if (!verifySecret(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  const raw = await request.text();
  try {
    body = raw ? (JSON.parse(raw) as unknown) : {};
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return Response.json(
      { error: "Servidor sin SUPABASE_SERVICE_ROLE_KEY; no se puede aplicar el webhook." },
      { status: 503 },
    );
  }

  const updates = extractVerifactiWebhookUpdates(body);
  if (updates.size === 0) {
    return Response.json({ ok: true, updated: 0, message: "Sin UUID reconocible en el cuerpo." });
  }

  const nowIso = new Date().toISOString();
  let updated = 0;

  for (const [uuid, fields] of updates) {
    const { data: rows, error: selErr } = await admin
      .from("invoices")
      .select("id")
      .eq("verifacti_uuid", uuid)
      .limit(5);

    if (selErr || !rows?.length) continue;

    const patch: Record<string, string | null> = {
      verifacti_updated_at: nowIso,
    };
    if (fields.estado) patch.verifacti_registro_estado = fields.estado;
    if (fields.mensajeError !== undefined) {
      patch.verifacti_last_error = fields.mensajeError
        ? fields.mensajeError.slice(0, 2000)
        : null;
    }
    if (fields.qrBase64) patch.verifacti_qr_base64 = fields.qrBase64;

    for (const row of rows) {
      const { error: upErr } = await admin.from("invoices").update(patch).eq("id", row.id);
      if (upErr) continue;
      updated += 1;
      await admin.from("invoice_events").insert({
        invoice_id: row.id,
        event_type: "verifacti_webhook",
        payload: { uuid, ...fields },
      });
    }
  }

  return Response.json({ ok: true, updated });
}
