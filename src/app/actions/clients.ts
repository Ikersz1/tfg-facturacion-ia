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

  const tax_id = formData.get("tax_id")?.toString().trim();
  if (!tax_id) {
    return { error: "El NIF/CIF es obligatorio para facturas completas." };
  }

  const address = formData.get("address")?.toString().trim();
  if (!address) {
    return { error: "El domicilio fiscal es obligatorio (calle, CP y ciudad)." };
  }

  const supabase = await createClient();
  const auth = await requireAuthUserId(supabase);
  if ("error" in auth) return { error: auth.error };

  const { error } = await supabase.from("clients").insert({
    user_id: auth.userId,
    name,
    tax_id,
    address,
    email: emptyToNull(formData.get("email")),
    phone: emptyToNull(formData.get("phone")),
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
  const id = formData.get("id")?.toString();
  if (!id) return { error: "Falta el cliente." };

  const name = formData.get("name")?.toString().trim();
  if (!name) return { error: "El nombre es obligatorio." };

  const tax_id = formData.get("tax_id")?.toString().trim();
  if (!tax_id) {
    return { error: "El NIF/CIF es obligatorio para facturas completas." };
  }

  const address = formData.get("address")?.toString().trim();
  if (!address) {
    return { error: "El domicilio fiscal es obligatorio (calle, CP y ciudad)." };
  }

  const supabase = await createClient();
  const auth = await requireAuthUserId(supabase);
  if ("error" in auth) return { error: auth.error };

  const { error } = await supabase
    .from("clients")
    .update({
      name,
      tax_id,
      address,
      email: emptyToNull(formData.get("email")),
      phone: emptyToNull(formData.get("phone")),
      notes: emptyToNull(formData.get("notes")),
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
  revalidatePath("/invoices");
  return { ok: true };
}

function emptyToNull(v: FormDataEntryValue | null) {
  const s = v?.toString().trim();
  return s ? s : null;
}
