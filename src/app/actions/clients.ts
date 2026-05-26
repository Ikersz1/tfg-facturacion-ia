"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuthUserId } from "@/lib/supabase/require-auth-user";
import { parseClientKind } from "@/lib/client-kind";
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

  const kind = parseClientKind(formData.get("kind")?.toString());

  const tax_id = formData.get("tax_id")?.toString().trim();
  if (!tax_id) {
    return {
      error:
        kind === "individual"
          ? "El DNI/NIE es obligatorio para facturas completas."
          : "El CIF es obligatorio para facturas completas.",
    };
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
    kind,
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
  redirect(`/clients?kind=${kind}`);
}

export async function updateClientAction(
  _prev: ClientActionState,
  formData: FormData,
): Promise<ClientActionState> {
  const id = formData.get("id")?.toString();
  if (!id) return { error: "Falta el cliente." };

  const name = formData.get("name")?.toString().trim();
  if (!name) return { error: "El nombre es obligatorio." };

  const kind = parseClientKind(formData.get("kind")?.toString());

  const tax_id = formData.get("tax_id")?.toString().trim();
  if (!tax_id) {
    return {
      error:
        kind === "individual"
          ? "El DNI/NIE es obligatorio para facturas completas."
          : "El CIF es obligatorio para facturas completas.",
    };
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
      kind,
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
  redirect(`/clients/${id}?saved=1`);
}

function emptyToNull(v: FormDataEntryValue | null) {
  const s = v?.toString().trim();
  return s ? s : null;
}
