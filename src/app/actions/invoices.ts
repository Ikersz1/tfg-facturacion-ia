"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuthUserId } from "@/lib/supabase/require-auth-user";
import { lineAmounts, roundCurrencyEUR } from "@/lib/money";
import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type InvoiceActionState = { ok?: true; error?: string };

export async function createDraftInvoiceAction(
  _prev: InvoiceActionState,
  formData: FormData,
): Promise<InvoiceActionState> {
  const clientId = formData.get("client_id")?.toString();
  if (!clientId) {
    return { error: "Selecciona un cliente." };
  }

  const series = (formData.get("series")?.toString().trim() || "A").slice(0, 8);
  const yearRaw = formData.get("year")?.toString().trim();
  const year = yearRaw ? parseInt(yearRaw, 10) : new Date().getFullYear();
  if (Number.isNaN(year) || year < 2000 || year > 2100) {
    return { error: "Año no válido." };
  }

  const supabase = await createClient();
  const auth = await requireAuthUserId(supabase);
  if ("error" in auth) return { error: auth.error };

  const { data, error } = await supabase
    .from("invoices")
    .insert({
      user_id: auth.userId,
      client_id: clientId,
      series,
      year,
      status: "draft",
      subtotal: 0,
      tax_amount: 0,
      total: 0,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "No se pudo crear el borrador." };
  }

  redirect(`/invoices/${data.id}`);
}

export async function addInvoiceLineAction(
  _prev: InvoiceActionState,
  formData: FormData,
): Promise<InvoiceActionState> {
  const invoiceId = formData.get("invoice_id")?.toString();
  if (!invoiceId) return { error: "Falta factura." };

  const description = formData.get("description")?.toString().trim();
  if (!description) return { error: "Descripción obligatoria." };

  const qty = Number(formData.get("quantity")?.toString().replace(",", "."));
  if (Number.isNaN(qty) || qty <= 0) return { error: "Cantidad no válida." };

  const unit = Number(formData.get("unit_price")?.toString().replace(",", "."));
  if (Number.isNaN(unit) || unit < 0) return { error: "Precio no válido." };

  const taxRaw = formData.get("tax_rate")?.toString().trim();
  const tax = taxRaw ? Number(taxRaw.replace(",", ".")) : 21;
  if (Number.isNaN(tax) || tax < 0 || tax > 100) return { error: "IVA no válido." };

  const supabase = await createClient();

  const { data: inv, error: invErr } = await supabase
    .from("invoices")
    .select("id, status")
    .eq("id", invoiceId)
    .single();
  if (invErr || !inv) return { error: "Factura no encontrada." };
  if (inv.status !== "draft") return { error: "Solo se pueden añadir líneas en borrador." };

  const { data: maxLine } = await supabase
    .from("invoice_lines")
    .select("line_number")
    .eq("invoice_id", invoiceId)
    .order("line_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const line_number = (maxLine?.line_number ?? 0) + 1;
  const { line_net, line_tax, line_total } = lineAmounts(qty, unit, tax);

  const productId = formData.get("product_id")?.toString().trim();
  const { error: lineErr } = await supabase.from("invoice_lines").insert({
    invoice_id: invoiceId,
    line_number,
    product_id: productId || null,
    description,
    quantity: qty,
    unit_price: unit,
    tax_rate: tax,
    line_net,
    line_tax,
    line_total,
  });

  if (lineErr) return { error: lineErr.message };

  await recalculateInvoiceTotals(supabase, invoiceId);
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/invoices");
  return { ok: true };
}

export async function deleteInvoiceLineAction(
  _prev: InvoiceActionState,
  formData: FormData,
): Promise<InvoiceActionState> {
  const lineId = formData.get("line_id")?.toString();
  const invoiceId = formData.get("invoice_id")?.toString();
  if (!lineId || !invoiceId) return { error: "Datos incompletos." };

  const supabase = await createClient();
  const { data: inv } = await supabase
    .from("invoices")
    .select("status")
    .eq("id", invoiceId)
    .single();
  if (!inv || inv.status !== "draft") {
    return { error: "Solo se pueden borrar líneas en borrador." };
  }

  const { error } = await supabase.from("invoice_lines").delete().eq("id", lineId);
  if (error) return { error: error.message };

  await recalculateInvoiceTotals(supabase, invoiceId);
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/invoices");
  return { ok: true };
}

export async function issueInvoiceAction(
  _prev: InvoiceActionState,
  formData: FormData,
): Promise<InvoiceActionState> {
  const invoiceId = formData.get("invoice_id")?.toString();
  if (!invoiceId) return { error: "Falta factura." };

  const supabase = await createClient();

  const { data: invoice, error: invErr } = await supabase
    .from("invoices")
    .select("id, status, series, year, client_id")
    .eq("id", invoiceId)
    .single();

  if (invErr || !invoice) return { error: "Factura no encontrada." };
  if (invoice.status !== "draft") return { error: "La factura ya no es un borrador." };

  const { count, error: cntErr } = await supabase
    .from("invoice_lines")
    .select("*", { count: "exact", head: true })
    .eq("invoice_id", invoiceId);

  if (cntErr) return { error: cntErr.message };
  if (count == null || count < 1) {
    return { error: "Añade al menos una línea antes de emitir." };
  }

  await recalculateInvoiceTotals(supabase, invoiceId);

  const { data: refreshed } = await supabase
    .from("invoices")
    .select("series, year, subtotal, tax_amount, total")
    .eq("id", invoiceId)
    .single();

  if (!refreshed) return { error: "No se pudo leer la factura." };

  const { data: nextNum, error: rpcErr } = await supabase.rpc(
    "alloc_next_invoice_number",
    { p_series: refreshed.series, p_year: refreshed.year },
  );

  if (rpcErr) return { error: rpcErr.message };
  const num =
    typeof nextNum === "number" ? nextNum : Number(nextNum);
  if (Number.isNaN(num)) {
    return { error: "No se obtuvo número de factura." };
  }

  const issueDate = new Date().toISOString().slice(0, 10);
  const dueRaw = formData.get("due_date")?.toString().trim();
  const due_date = dueRaw || null;

  const { error: upErr } = await supabase
    .from("invoices")
    .update({
      number: num,
      status: "issued",
      issue_date: issueDate,
      due_date,
      subtotal: refreshed.subtotal,
      tax_amount: refreshed.tax_amount,
      total: refreshed.total,
    })
    .eq("id", invoiceId);

  if (upErr) return { error: upErr.message };

  await supabase.from("invoice_events").insert({
    invoice_id: invoiceId,
    event_type: "issued",
    payload: { series: refreshed.series, year: refreshed.year, number: num },
  });

  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/invoices");
  return { ok: true };
}

async function recalculateInvoiceTotals(supabase: SupabaseClient, invoiceId: string) {
  const { data: lines, error } = await supabase
    .from("invoice_lines")
    .select("line_net, line_tax, line_total")
    .eq("invoice_id", invoiceId);

  if (error || !lines) return;

  let subtotal = 0;
  let tax_amount = 0;
  let total = 0;
  for (const l of lines) {
    subtotal = roundCurrencyEUR(subtotal + Number(l.line_net));
    tax_amount = roundCurrencyEUR(tax_amount + Number(l.line_tax));
    total = roundCurrencyEUR(total + Number(l.line_total));
  }

  await supabase
    .from("invoices")
    .update({ subtotal, tax_amount, total })
    .eq("id", invoiceId);
}
