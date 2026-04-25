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

export async function updateClientAction(
  _prev: ClientActionState,
  formData: FormData,
): Promise<ClientActionState> {
  const id = formData.get("id")?.toString().trim();
  if (!id) {
    return { error: "Falta el identificador del cliente." };
  }
  const name = formData.get("name")?.toString().trim();
  if (!name) {
    return { error: "El nombre es obligatorio." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("clients")
    .update({
      name,
      tax_id: emptyToNull(formData.get("tax_id")),
      email: emptyToNull(formData.get("email")),
      phone: emptyToNull(formData.get("phone")),
      address: emptyToNull(formData.get("address")),
      notes: emptyToNull(formData.get("notes")),
    })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
  redirect(`/clients/${id}`);
}

function emptyToNull(v: FormDataEntryValue | null) {
  const s = v?.toString().trim();
  return s ? s : null;
}
