"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuthUserId } from "@/lib/supabase/require-auth-user";
import { revalidatePath } from "next/cache";

export type AutomationSettingsState = { ok?: true; error?: string };

export async function updateAutomationSettingsAction(
  _prev: AutomationSettingsState,
  formData: FormData,
): Promise<AutomationSettingsState> {
  const enabled = formData.get("n8n_auto_email_on_issue") === "on";

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
      n8n_auto_email_on_issue: enabled,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", auth.userId);

  if (error) {
    if (error.message.includes("n8n_auto_email_on_issue")) {
      return {
        error:
          "Falta la migración 20260527190000_n8n_auto_email_on_issue.sql en Supabase.",
      };
    }
    return { error: error.message };
  }

  revalidatePath("/settings/automatizacion");
  return { ok: true };
}
