"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuthUserId } from "@/lib/supabase/require-auth-user";
import {
  buildInvoiceIssuedN8nPayload,
  notifyInvoiceIssued,
} from "@/lib/n8n/notify-invoice-issued";
import { lineAmounts, formatMoneyEUR, roundCurrencyEUR } from "@/lib/money";
import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseInvoiceSeries } from "@/lib/invoice-series";
import { buildVerifactuF1Payload } from "@/lib/verifacti/build-payload";
import { verifactuCreate } from "@/lib/verifacti/client";
import { parseVerifactuCreateResponse } from "@/lib/verifacti/parse-create-response";

export type InvoiceActionState = { ok?: true; error?: string; warn?: string };

export async function createDraftInvoiceAction(
  _prev: InvoiceActionState,
  formData: FormData,
): Promise<InvoiceActionState> {
  const clientId = formData.get("client_id")?.toString();
  if (!clientId) {
    return { error: "Selecciona un cliente." };
  }

  const series = parseInvoiceSeries(formData.get("series"));
  if (!series) {
    return { error: "Selecciona una serie de facturación válida." };
  }
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
  const auth = await requireAuthUserId(supabase);
  if ("error" in auth) return { error: auth.error };

  const verifactiEnabled = Boolean(process.env.VERIFACTI_NIF_API_KEY?.trim());

  const { data: invoice, error: invErr } = await supabase
    .from("invoices")
    .select("id, status, series, year, client_id, clients ( name, tax_id, address, email )")
    .eq("id", invoiceId)
    .single();

  if (invErr || !invoice) return { error: "Factura no encontrada." };
  if (invoice.status !== "draft") return { error: "La factura ya no es un borrador." };

  const clientRow = normalizeInvoiceClient(invoice.clients);
  const clientId = invoice.client_id as string;

  const { data: fiscal } = await supabase
    .from("user_fiscal_profile")
    .select("legal_name, tax_id, address")
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (!fiscal?.legal_name?.trim() || !fiscal?.tax_id?.trim() || !fiscal?.address?.trim()) {
    return {
      error:
        "Completa tus datos fiscales del emisor en Ajustes → Datos fiscales (razón social, NIF y domicilio).",
    };
  }

  if (!clientRow?.tax_id?.trim()) {
    return {
      error: `El cliente debe tener NIF/CIF. Complétalo en la ficha del cliente (/clients/${clientId}).`,
    };
  }
  if (!clientRow?.address?.trim()) {
    return {
      error: `El cliente debe tener domicilio fiscal (calle, CP y ciudad). Complétalo en /clients/${clientId}.`,
    };
  }

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

  let warn: string | undefined;

  if (verifactiEnabled) {
    const { data: lineRows, error: linesErr } = await supabase
      .from("invoice_lines")
      .select("line_net, line_tax, tax_rate, description")
      .eq("invoice_id", invoiceId)
      .order("line_number", { ascending: true });

    if (linesErr || !lineRows?.length) {
      warn = `Factura emitida, pero no se pudo leer líneas para Verifacti: ${linesErr?.message ?? "sin datos"}.`;
    } else {
      const client = clientRow!;
      try {
        const descripcion = lineRows
          .map((r) => (r.description as string)?.trim())
          .filter(Boolean)
          .slice(0, 3)
          .join(" · ");

        const payload = buildVerifactuF1Payload({
          series: refreshed.series,
          year: refreshed.year,
          number: num,
          issueDateYyyyMmDd: issueDate,
          clientNif: client.tax_id!.trim(),
          clientName: client.name.trim() || "Cliente",
          lines: lineRows.map((r) => ({
            line_net: Number(r.line_net),
            line_tax: Number(r.line_tax),
            tax_rate: Number(r.tax_rate),
          })),
          total: Number(refreshed.total),
          descripcion,
        });

        const vfRes = await verifactuCreate(payload);
        const nowIso = new Date().toISOString();

        if (!vfRes.ok) {
          warn = `Factura emitida, pero Verifacti respondió ${vfRes.status}: ${vfRes.message}`;
          await supabase
            .from("invoices")
            .update({
              verifacti_last_error: warn.slice(0, 2000),
              verifacti_updated_at: nowIso,
            })
            .eq("id", invoiceId);
          await supabase.from("invoice_events").insert({
            invoice_id: invoiceId,
            event_type: "verifacti_error",
            payload: { status: vfRes.status, message: vfRes.message.slice(0, 500) },
          });
        } else {
          const parsed = parseVerifactuCreateResponse(vfRes.json);
          await supabase
            .from("invoices")
            .update({
              verifacti_uuid: parsed.uuid ?? null,
              verifacti_qr_base64: parsed.qrBase64 ?? null,
              verifacti_huella: parsed.huella ?? null,
              verifacti_registro_estado: parsed.estado ?? "recibido",
              verifacti_last_error: null,
              verifacti_updated_at: nowIso,
            })
            .eq("id", invoiceId);
          await supabase.from("invoice_events").insert({
            invoice_id: invoiceId,
            event_type: "verifacti_sent",
            payload: {
              uuid: parsed.uuid ?? null,
              estado: parsed.estado ?? null,
              tiene_qr: Boolean(parsed.qrBase64),
            },
          });
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        warn = `Factura emitida, pero el envío a Verifacti falló al preparar la petición: ${msg}`;
        await supabase
          .from("invoices")
          .update({
            verifacti_last_error: warn.slice(0, 2000),
            verifacti_updated_at: new Date().toISOString(),
          })
          .eq("id", invoiceId);
        await supabase.from("invoice_events").insert({
          invoice_id: invoiceId,
          event_type: "verifacti_error",
          payload: { message: msg.slice(0, 500) },
        });
      }
    }
  }

  const n8nPayload = buildInvoiceIssuedN8nPayload({
    invoiceId,
    series: refreshed.series as string,
    year: refreshed.year as number,
    number: num,
    issueDate,
    dueDate: due_date,
    subtotal: Number(refreshed.subtotal),
    taxAmount: Number(refreshed.tax_amount),
    total: Number(refreshed.total),
    totalFormatted: formatMoneyEUR(refreshed.total),
    clientId,
    clientName: clientRow!.name,
    clientEmail: clientRow!.email,
    clientTaxId: clientRow!.tax_id,
    clientAddress: clientRow!.address,
    issuerLegalName: fiscal.legal_name.trim(),
    issuerTaxId: fiscal.tax_id.trim(),
    issuerAddress: fiscal.address.trim(),
  });

  const n8nResult = await notifyInvoiceIssued(n8nPayload);
  if (n8nResult.ok) {
    await supabase.from("invoice_events").insert({
      invoice_id: invoiceId,
      event_type: "n8n_webhook_sent",
      payload: { status: n8nResult.status },
    });
  } else if (n8nResult.error !== "not_configured") {
    const n8nMsg = `Factura emitida, pero n8n no respondió: ${n8nResult.error}`;
    warn = warn ? `${warn} ${n8nMsg}` : n8nMsg;
    await supabase.from("invoice_events").insert({
      invoice_id: invoiceId,
      event_type: "n8n_webhook_error",
      payload: {
        status: n8nResult.status ?? null,
        message: n8nResult.error.slice(0, 500),
      },
    });
  }

  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/invoices");
  return warn ? { ok: true, warn } : { ok: true };
}

export async function createRectificativeDraftAction(
  _prev: InvoiceActionState,
  formData: FormData,
): Promise<InvoiceActionState> {
  const sourceInvoiceId = formData.get("invoice_id")?.toString();
  if (!sourceInvoiceId) return { error: "Falta factura de origen." };

  const supabase = await createClient();
  const auth = await requireAuthUserId(supabase);
  if ("error" in auth) return { error: auth.error };

  const { data: source, error: sourceErr } = await supabase
    .from("invoices")
    .select("id, client_id, status, series, year, number")
    .eq("id", sourceInvoiceId)
    .single();

  if (sourceErr || !source) return { error: "Factura origen no encontrada." };

  const sourceStatus = String(source.status);
  if (!["issued", "partial", "paid", "overdue"].includes(sourceStatus)) {
    return { error: "Solo puedes rectificar facturas emitidas, parciales, pagadas o vencidas." };
  }

  const { data: sourceLines, error: linesErr } = await supabase
    .from("invoice_lines")
    .select("line_number, product_id, description, quantity, unit_price, tax_rate")
    .eq("invoice_id", sourceInvoiceId)
    .order("line_number", { ascending: true });

  if (linesErr) return { error: linesErr.message };
  if (!sourceLines || sourceLines.length === 0) {
    return { error: "La factura origen no tiene líneas para rectificar." };
  }

  const rectYear = new Date().getFullYear();
  const { data: created, error: createErr } = await supabase
    .from("invoices")
    .insert({
      user_id: auth.userId,
      client_id: source.client_id,
      series: "R",
      year: rectYear,
      status: "draft",
      subtotal: 0,
      tax_amount: 0,
      total: 0,
    })
    .select("id")
    .single();

  if (createErr || !created) {
    return { error: createErr?.message ?? "No se pudo crear el borrador rectificativo." };
  }

  const rectInvoiceId = String(created.id);
  const preparedLines = sourceLines.map((line) => {
    const quantity = Math.abs(Number(line.quantity));
    const unitPrice = Math.abs(Number(line.unit_price));
    const taxRate = Number(line.tax_rate);
    // Mantiene quantity y unit_price en positivo para cumplir checks legacy,
    // pero deja importes de línea en negativo para efecto rectificativo.
    const base = roundCurrencyEUR(quantity * unitPrice);
    const line_net = -Math.abs(base);
    const line_tax = -Math.abs(roundCurrencyEUR(base * (taxRate / 100)));
    const line_total = roundCurrencyEUR(line_net + line_tax);
    return {
      invoice_id: rectInvoiceId,
      line_number: Number(line.line_number),
      product_id: line.product_id ?? null,
      description: String(line.description ?? ""),
      quantity,
      unit_price: unitPrice,
      tax_rate: taxRate,
      line_net,
      line_tax,
      line_total,
    };
  });

  const { error: insLinesErr } = await supabase.from("invoice_lines").insert(preparedLines);
  if (insLinesErr) {
    await supabase.from("invoices").delete().eq("id", rectInvoiceId);
    return {
      error: `No se pudo crear la rectificativa por restricciones de datos: ${insLinesErr.message}`,
    };
  }

  await recalculateInvoiceTotals(supabase, rectInvoiceId);

  const sourceNumberLabel =
    source.number != null
      ? `${source.series}-${source.year}/${source.number}`
      : `${source.series}-${source.year}/borrador`;

  await supabase.from("invoice_events").insert([
    {
      invoice_id: rectInvoiceId,
      event_type: "rectificative_created",
      payload: { source_invoice_id: sourceInvoiceId, source_number_label: sourceNumberLabel },
    },
    {
      invoice_id: sourceInvoiceId,
      event_type: "rectified_by_draft",
      payload: { rectificative_invoice_id: rectInvoiceId },
    },
  ]);

  revalidatePath(`/invoices/${sourceInvoiceId}`);
  revalidatePath(`/invoices/${rectInvoiceId}`);
  revalidatePath("/invoices");
  redirect(`/invoices/${rectInvoiceId}`);
}

function normalizeInvoiceClient(raw: unknown): {
  name: string;
  tax_id: string | null;
  address: string | null;
  email: string | null;
} | null {
  if (!raw) return null;
  if (Array.isArray(raw)) {
    const x = raw[0];
    if (!x || typeof x !== "object") return null;
    const o = x as {
      name?: string | null;
      tax_id?: string | null;
      address?: string | null;
      email?: string | null;
    };
    return {
      name: String(o.name ?? "").trim(),
      tax_id: o.tax_id?.trim() ? o.tax_id.trim() : null,
      address: o.address?.trim() ? o.address.trim() : null,
      email: o.email?.trim() ? o.email.trim() : null,
    };
  }
  if (typeof raw === "object") {
    const o = raw as {
      name?: string | null;
      tax_id?: string | null;
      email?: string | null;
      address?: string | null;
    };
    return {
      name: String(o.name ?? "").trim(),
      tax_id: o.tax_id?.trim() ? o.tax_id.trim() : null,
      address: o.address?.trim() ? o.address.trim() : null,
      email: o.email?.trim() ? o.email.trim() : null,
    };
  }
  return null;
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
