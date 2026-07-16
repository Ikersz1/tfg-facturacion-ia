"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuthUserId } from "@/lib/supabase/require-auth-user";
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

  const kindRaw = formData.get("kind")?.toString();
  const kind = kindRaw === "service" ? "service" : "product";

  const supabase = await createClient();
  const auth = await requireAuthUserId(supabase);
  if ("error" in auth) return { error: auth.error };

  const { error } = await supabase.from("products").insert({
    user_id: auth.userId,
    name,
    description: emptyToNull(formData.get("description")),
    sku: emptyToNull(formData.get("sku")),
    unit_price: unitPrice,
    tax_rate: taxRate,
    is_active: formData.get("is_active") === "on",
    kind,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/catalogo");
  redirect(`/catalogo?kind=${kind}`);
}

export async function updateProductAction(
  _prev: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  const productId = formData.get("product_id")?.toString().trim();
  if (!productId) {
    return { error: "No se encontró el producto a actualizar." };
  }

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
  const taxRate = taxRateRaw ? Number(taxRateRaw.replace(",", ".")) : 21;
  if (Number.isNaN(taxRate) || taxRate < 0 || taxRate > 100) {
    return { error: "El IVA debe estar entre 0 y 100." };
  }

  const kindRaw = formData.get("kind")?.toString();
  const kind = kindRaw === "service" ? "service" : "product";

  const supabase = await createClient();
  const auth = await requireAuthUserId(supabase);
  if ("error" in auth) return { error: auth.error };

  const { error } = await supabase
    .from("products")
    .update({
      name,
      description: emptyToNull(formData.get("description")),
      sku: emptyToNull(formData.get("sku")),
      unit_price: unitPrice,
      tax_rate: taxRate,
      is_active: formData.get("is_active") === "on",
      kind,
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId)
    .eq("user_id", auth.userId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/catalogo");
  redirect(`/catalogo?kind=${kind}`);
}

export async function deleteProductAction(formData: FormData): Promise<void> {
  const productId = formData.get("product_id")?.toString().trim();
  const kindRaw = formData.get("kind")?.toString();
  const kind = kindRaw === "service" ? "service" : "product";
  if (!productId) {
    redirect(`/catalogo?kind=${kind}`);
  }

  const supabase = await createClient();
  const auth = await requireAuthUserId(supabase);
  if ("error" in auth) {
    redirect(`/catalogo?kind=${kind}`);
  }

  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", productId!)
    .eq("user_id", auth.userId);

  let notice: "deleted" | "deactivated" = "deleted";
  if (error) {
    // Si hay facturas históricas vinculadas, ocultamos del catálogo activo.
    const { error: deactivateError } = await supabase
      .from("products")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", productId!)
      .eq("user_id", auth.userId);
    if (deactivateError) {
      redirect(`/catalogo?kind=${kind}&notice=delete_error`);
    }
    notice = "deactivated";
  }

  revalidatePath("/catalogo");
  redirect(`/catalogo?kind=${kind}&notice=${notice}`);
}

function emptyToNull(v: FormDataEntryValue | null) {
  const s = v?.toString().trim();
  return s ? s : null;
}
