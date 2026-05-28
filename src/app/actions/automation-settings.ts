"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuthUserId } from "@/lib/supabase/require-auth-user";
import { revalidatePath } from "next/cache";

export type AutomationSettingsState = { ok?: true; error?: string };

export async function updateAutomationSettingsAction(
  _prev: AutomationSettingsState,
  formData: FormData,
): Promise<AutomationSettingsState> {
  const autoEmailOnIssue = formData.get("n8n_auto_email_on_issue") === "on";
  const notifyIssuerOnOverdue = formData.get("n8n_notify_issuer_on_overdue") === "on";
  const autoReminderClient = formData.get("n8n_auto_reminder_client") === "on";
  const graceDaysRaw = Number(formData.get("n8n_reminder_grace_days") ?? "3");
  const graceDays = Number.isFinite(graceDaysRaw) ? Math.max(1, Math.min(30, graceDaysRaw)) : 3;

  const supabase = await createClient();
  const auth = await requireAuthUserId(supabase);
  if ("error" in auth) return { error: auth.error };

  const { data: existing } = await supabase
    .from("user_fiscal_profile")
    .select("legal_name, tax_id, address")
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (!existing?.legal_name?.trim() || !existing?.tax_id?.trim() || !existing?.address?.trim()) {
    return {
      error:
        "Completa antes tus datos fiscales en Ajustes → Datos fiscales (razón social, NIF y domicilio).",
    };
  }

  const { error } = await supabase
    .from("user_fiscal_profile")
    .update({
      n8n_auto_email_on_issue: autoEmailOnIssue,
      n8n_notify_issuer_on_overdue: notifyIssuerOnOverdue,
      n8n_auto_reminder_client: autoReminderClient,
      n8n_reminder_grace_days: graceDays,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", auth.userId);

  if (error) {
    if (
      error.message.includes("n8n_auto_email_on_issue") ||
      error.message.includes("n8n_notify_issuer_on_overdue") ||
      error.message.includes("n8n_auto_reminder_client") ||
      error.message.includes("n8n_reminder_grace_days")
    ) {
      return {
        error:
          "Falta aplicar la migración 20260528120000_n8n_overdue_reminders.sql en Supabase.",
      };
    }
    return { error: error.message };
  }

  revalidatePath("/settings/automatizacion");
  return { ok: true };
}
