"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type ProductActionState = { ok?: true; error?: string };

export async function createProductAction(
  _prev: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  const name = formData.get("name")?.toString().trim();
  if (!name) {
    return { error: "El nombre es obligatorio." };
  }

  const unitPriceRaw = formData.get("unit_price")?.toString().trim();
  if (!unitPriceRaw) {
    return { error: "El precio unitario es obligatorio." };
  }
  const unitPrice = Number(unitPriceRaw.replace(",", "."));
  if (Number.isNaN(unitPrice) || unitPrice < 0) {
    return { error: "Precio unitario no válido." };
  }

  const taxRateRaw = formData.get("tax_rate")?.toString().trim();
  const taxRate = taxRateRaw
    ? Number(taxRateRaw.replace(",", "."))
    : 21;
  if (Number.isNaN(taxRate) || taxRate < 0 || taxRate > 100) {
    return { error: "El IVA debe estar entre 0 y 100." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("products").insert({
    name,
    description: emptyToNull(formData.get("description")),
    sku: emptyToNull(formData.get("sku")),
    unit_price: unitPrice,
    tax_rate: taxRate,
    is_active: formData.get("is_active") === "on",
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/products");
  redirect("/products");
}

function emptyToNull(v: FormDataEntryValue | null) {
  const s = v?.toString().trim();
  return s ? s : null;
}
