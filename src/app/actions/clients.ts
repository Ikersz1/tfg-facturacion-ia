"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuthUserId } from "@/lib/supabase/require-auth-user";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type ClientActionState = { ok?: true; error?: string };

export async function createClientAction(
  _prev: ClientActionState,
  formData: FormData,
): Promise<ClientActionState> {
  const name = formData.get("name")?.toString().trim();
  if (!name) {
    return { error: "El nombre es obligatorio." };
  }

  const supabase = await createClient();
  const auth = await requireAuthUserId(supabase);
  if ("error" in auth) return { error: auth.error };

  const { error } = await supabase.from("clients").insert({
    user_id: auth.userId,
    name,
    tax_id: emptyToNull(formData.get("tax_id")),
    email: emptyToNull(formData.get("email")),
    phone: emptyToNull(formData.get("phone")),
    address: emptyToNull(formData.get("address")),
    notes: emptyToNull(formData.get("notes")),
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/clients");
  redirect("/clients");
}

function emptyToNull(v: FormDataEntryValue | null) {
  const s = v?.toString().trim();
  return s ? s : null;
}
