import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { verifyN8nBearer } from "@/lib/n8n/verify-request";
import { getAuthSiteUrl } from "@/lib/auth-site-url";
import { roundCurrencyEUR, formatMoneyEUR } from "@/lib/money";
import { todayLocalYMD } from "@/lib/invoice-status";

export const dynamic = "force-dynamic";

type ClientRow = { id: string; name: string | null; email: string | null; tax_id: string | null };

/**
 * GET /api/integrations/n8n/overdue-reminders
 *
 * n8n llama a este endpoint (Schedule trigger diario) con Authorization: Bearer <N8N_WEBHOOK_SECRET>.
 * Devuelve dos tipos de recordatorio:
 *   - issuer_alert: aviso al emisor la primera vez que una factura vence (si toggle activo).
 *   - client_reminder: aviso al cliente moroso tras el período de gracia (si toggle activo).
 *
 * Los recordatorios se marcan en n8n_overdue_reminders ANTES de responder (patrón optimista).
 * Frecuencia máxima: issuer_alert = 1 vez por factura; client_reminder = 1 vez cada 7 días.
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

  const todayYmd = todayLocalYMD();
  const base = getAuthSiteUrl();

  // Perfiles con al menos un toggle de recordatorios activo
  const { data: profiles, error: profileErr } = await admin
    .from("user_fiscal_profile")
    .select(
      "user_id, legal_name, tax_id, n8n_notify_issuer_on_overdue, n8n_auto_reminder_client, n8n_reminder_grace_days",
    )
    .or("n8n_notify_issuer_on_overdue.eq.true,n8n_auto_reminder_client.eq.true");

  if (profileErr) {
    return Response.json({ error: profileErr.message }, { status: 500 });
  }

  if (!profiles || profiles.length === 0) {
    return Response.json({
      ok: true,
      processed_at: new Date().toISOString(),
      reminder_count: 0,
      reminders: [],
    });
  }

  // Emails de los emisores (auth.users)
  const { data: authData } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const emailByUserId = new Map<string, string | null>(
    (authData?.users ?? []).map((u) => [u.id, u.email ?? null]),
  );

  const toInsert: { user_id: string; invoice_id: string; reminder_type: string }[] = [];
  const reminders: unknown[] = [];

  for (const profile of profiles) {
    const userId = profile.user_id as string;
    const issuerEmail = emailByUserId.get(userId) ?? null;
    const graceDays = Math.max(1, Math.min(30, Number(profile.n8n_reminder_grace_days) || 3));

    // Facturas del usuario: estado issued/partial/overdue, con due_date ya pasada
    const { data: invoices } = await admin
      .from("invoices")
      .select(
        "id, series, year, number, status, issue_date, due_date, total, clients ( id, name, email, tax_id )",
      )
      .eq("user_id", userId)
      .in("status", ["issued", "partial", "overdue"])
      .not("due_date", "is", null)
      .lt("due_date", todayYmd);

    if (!invoices || invoices.length === 0) continue;

    const invoiceIds = invoices.map((i) => i.id as string);

    // Pagos para calcular importe pendiente
    const { data: payments } = await admin
      .from("payments")
      .select("invoice_id, amount")
      .in("invoice_id", invoiceIds);

    const paidByInvoice = new Map<string, number>();
    for (const p of payments ?? []) {
      const prev = paidByInvoice.get(p.invoice_id as string) ?? 0;
      paidByInvoice.set(p.invoice_id as string, roundCurrencyEUR(prev + Number(p.amount)));
    }

    // Recordatorios ya enviados para estas facturas
    const { data: sentRows } = await admin
      .from("n8n_overdue_reminders")
      .select("invoice_id, reminder_type, sent_at")
      .in("invoice_id", invoiceIds)
      .order("sent_at", { ascending: false });

    // Último envío por factura+tipo
    const lastSentAt = new Map<string, string>();
    for (const r of sentRows ?? []) {
      const key = `${r.invoice_id}:${r.reminder_type}`;
      if (!lastSentAt.has(key)) lastSentAt.set(key, r.sent_at as string);
    }

    for (const inv of invoices) {
      const client = (inv.clients as unknown as ClientRow) ?? null;
      const paidSum = paidByInvoice.get(inv.id as string) ?? 0;
      const outstanding = roundCurrencyEUR(Math.max(0, Number(inv.total) - paidSum));

      if (outstanding <= 0) continue; // pagada aunque no registrada en status → ignorar

      const dueDate = (inv.due_date as string).slice(0, 10);
      const daysOverdue = Math.floor(
        (new Date(todayYmd).getTime() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24),
      );

      const numberLabel = `${inv.series}-${inv.year}/${inv.number}`;

      const invoiceInfo = {
        number_label: numberLabel,
        total: Number(inv.total),
        total_formatted: formatMoneyEUR(Number(inv.total)),
        outstanding,
        outstanding_formatted: formatMoneyEUR(outstanding),
        due_date: dueDate,
        days_overdue: daysOverdue,
        detail_url: `${base}/invoices/${inv.id}`,
      };

      const clientInfo = {
        name: client?.name ?? null,
        email: client?.email ?? null,
        tax_id: client?.tax_id ?? null,
      };

      const issuerInfo = {
        legal_name: (profile.legal_name as string | null) ?? null,
        tax_id: (profile.tax_id as string | null) ?? null,
        email: issuerEmail,
      };

      // issuer_alert: una única vez por factura en el momento en que aparece vencida
      if (profile.n8n_notify_issuer_on_overdue && issuerEmail) {
        const key = `${inv.id}:issuer_alert`;
        if (!lastSentAt.has(key)) {
          toInsert.push({ user_id: userId, invoice_id: inv.id as string, reminder_type: "issuer_alert" });
          reminders.push({
            type: "issuer_alert",
            invoice_id: inv.id,
            invoice: invoiceInfo,
            client: clientInfo,
            to_email: issuerEmail,
            issuer: issuerInfo,
          });
        }
      }

      // client_reminder: tras gracia + máximo 1 cada 7 días
      if (profile.n8n_auto_reminder_client && client?.email && daysOverdue >= graceDays) {
        const key = `${inv.id}:client_reminder`;
        const last = lastSentAt.get(key);
        const daysSinceLast = last
          ? Math.floor((new Date(todayYmd).getTime() - new Date(last).getTime()) / (1000 * 60 * 60 * 24))
          : Infinity;
        const canSend = daysSinceLast >= 7;
        if (canSend) {
          toInsert.push({ user_id: userId, invoice_id: inv.id as string, reminder_type: "client_reminder" });
          reminders.push({
            type: "client_reminder",
            invoice_id: inv.id,
            invoice: invoiceInfo,
            client: clientInfo,
            to_email: client.email,
            issuer: issuerInfo,
          });
        }
      }
    }
  }

  // Marcar como enviados (patrón optimista: si n8n falla, no se reenvían hasta la siguiente ventana)
  if (toInsert.length > 0) {
    await admin.from("n8n_overdue_reminders").insert(toInsert);
  }

  return Response.json({
    ok: true,
    processed_at: new Date().toISOString(),
    reminder_count: reminders.length,
    reminders,
  });
}
