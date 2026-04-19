"use server";

import { createAdminClient } from "@/lib/supabase/admin";
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

  const supabase = createAdminClient();
  const { error } = await supabase.from("clients").insert({
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
