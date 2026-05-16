"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuthUserId } from "@/lib/supabase/require-auth-user";
import { revalidatePath } from "next/cache";
import { parseInvoicePdfTemplate } from "@/lib/invoice-pdf/template-id";

export type FiscalProfileState = { ok?: true; error?: string };

export async function upsertFiscalProfileAction(
  _prev: FiscalProfileState,
  formData: FormData,
): Promise<FiscalProfileState> {
  const legal_name = formData.get("legal_name")?.toString().trim();
  const tax_id = formData.get("tax_id")?.toString().trim();
  const address = formData.get("address")?.toString().trim();
  const invoice_pdf_template = parseInvoicePdfTemplate(
    formData.get("invoice_pdf_template")?.toString(),
  );

  if (!legal_name || !tax_id || !address) {
    return { error: "Razón social, NIF y dirección son obligatorios." };
  }

  const supabase = await createClient();
  const auth = await requireAuthUserId(supabase);
  if ("error" in auth) return { error: auth.error };

  const { error } = await supabase.from("user_fiscal_profile").upsert(
    {
      user_id: auth.userId,
      legal_name,
      tax_id,
      address,
      invoice_pdf_template,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) return { error: error.message };

  revalidatePath("/settings/fiscal");
  return { ok: true };
}
