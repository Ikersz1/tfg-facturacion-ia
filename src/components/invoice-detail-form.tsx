"use client";

import { useActionState, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  addInvoiceLineAction,
  deleteInvoiceLineAction,
  issueInvoiceAction,
  type InvoiceActionState,
} from "@/app/actions/invoices";
import {
  refreshVerifactuInvoiceStatusAction,
  type VerifactiStatusActionState,
} from "@/app/actions/verifacti-status";
import { addPaymentAction, type PaymentActionState } from "@/app/actions/payments";
import { effectiveInvoiceStatus } from "@/lib/invoice-status";
import { catalogKindLabel, parseCatalogKind } from "@/lib/catalog-kind";
import { formatMoneyEUR, roundCurrencyEUR } from "@/lib/money";
import Link from "next/link";

const initial: InvoiceActionState = {};
const payInitial: PaymentActionState = {};
const vfStatusInitial: VerifactiStatusActionState = {};

type Line = {
  id: string;
  line_number: number;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  line_net: number;
  line_tax: number;
  line_total: number;
};

type ProductOpt = {
  id: string;
  name: string;
  unit_price: number;
  tax_rate: number;
  kind?: string | null;
};

type InvoiceHead = {
  id: string;
  client_id: string;
  series: string;
  year: number;
  number: number | null;
  status: string;
  issue_date: string | null;
  due_date: string | null;
  subtotal: number;
  tax_amount: number;
  total: number;
  clients: { name: string; tax_id: string | null; address: string | null } | null;
  verifacti_uuid?: string | null;
  verifacti_qr_base64?: string | null;
  verifacti_registro_estado?: string | null;
  verifacti_last_error?: string | null;
};

type PaymentRow = {
  id: string;
  amount: number;
  paid_at: string;
  method: string | null;
  notes: string | null;
};

function formatUnitForInput(price: number): string {
  return (Math.round(price * 100) / 100).toFixed(2);
}

function formatTaxForInput(tax: number): string {
  if (Number.isInteger(tax)) return String(tax);
  return String(tax);
}

function verifactiQrDataUrl(b64: string): string {
  const t = b64.trim();
  if (t.startsWith("data:")) return t;
  return `data:image/png;base64,${t}`;
}

function statusBadgeClass(s: string): string {
  if (s === "paid") {
    return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200";
  }
  if (s === "overdue") {
    return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200";
  }
  if (s === "partial" || s === "issued") {
    return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200";
  }
  if (s === "cancelled") {
    return "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200";
  }
  return "bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-100";
}

function isVerifactiConfirmed(estado?: string | null): boolean {
  const s = (estado ?? "").toLowerCase();
  return (
    s.includes("confirmad") ||
    s.includes("aceptad") ||
    s.includes("registrad") ||
    s.includes("encontrad")
  );
}

export function InvoiceDetailForm({
  invoice,
  lines,
  products,
  payments = [],
}: {
  invoice: InvoiceHead;
  lines: Line[];
  products: ProductOpt[];
  payments?: PaymentRow[];
}) {
  const router = useRouter();
  const isDraft = invoice.status === "draft";
  const vfStatusPrevPending = useRef(false);

  const [showAddLineForm, setShowAddLineForm] = useState(false);
  const [showAddPaymentForm, setShowAddPaymentForm] = useState(false);

  const productById = useMemo(() => {
    const m = new Map<string, ProductOpt>();
    for (const p of products) m.set(p.id, p);
    return m;
  }, [products]);

  const [addLineProductId, setAddLineProductId] = useState("");
  const [addLineDescription, setAddLineDescription] = useState("");
  const [addLineQuantity, setAddLineQuantity] = useState("1");
  const [addLineUnitPrice, setAddLineUnitPrice] = useState("");
  const [addLineTaxRate, setAddLineTaxRate] = useState("21");

  useEffect(() => {
    if (!showAddLineForm || !isDraft) return;
    setAddLineProductId("");
    setAddLineDescription("");
    setAddLineQuantity("1");
    setAddLineUnitPrice("");
    setAddLineTaxRate("21");
  }, [showAddLineForm, isDraft]);

  const onAddLineProductChange = useCallback(
    (productId: string) => {
      setAddLineProductId(productId);
      if (!productId) {
        setAddLineDescription("");
        setAddLineUnitPrice("");
        setAddLineTaxRate("21");
        return;
      }
      const p = productById.get(productId);
      if (!p) return;
      setAddLineDescription(p.name);
      setAddLineUnitPrice(formatUnitForInput(p.unit_price));
      setAddLineTaxRate(formatTaxForInput(p.tax_rate));
    },
    [productById],
  );

  const addLineAndMaybeClose = useCallback(
    async (prev: InvoiceActionState, formData: FormData) => {
      const result = await addInvoiceLineAction(prev, formData);
      if (result?.ok) {
        setShowAddLineForm(false);
      }
      return result;
    },
    [],
  );

  const [lineState, addLine, linePending] = useActionState(
    addLineAndMaybeClose,
    initial,
  );
  const [delState, deleteLine, delPending] = useActionState(
    deleteInvoiceLineAction,
    initial,
  );
  const [issueState, issueForm, issuePending] = useActionState(
    issueInvoiceAction,
    initial,
  );
  const [vfStatusState, vfStatusForm, vfStatusPending] = useActionState(
    refreshVerifactuInvoiceStatusAction,
    vfStatusInitial,
  );
  const addPaymentAndMaybeClose = useCallback(
    async (prev: PaymentActionState, formData: FormData) => {
      const result = await addPaymentAction(prev, formData);
      if (result?.ok) {
        setShowAddPaymentForm(false);
      }
      return result;
    },
    [],
  );

  const [payState, payForm, payPending] = useActionState(
    addPaymentAndMaybeClose,
    payInitial,
  );

  const paidSum = roundCurrencyEUR(
    payments.reduce((s, p) => s + p.amount, 0),
  );
  const pendingToPay = roundCurrencyEUR(invoice.total - paidSum);

  const displayStatus = useMemo(
    () =>
      effectiveInvoiceStatus({
        status: invoice.status,
        total: invoice.total,
        paidSum,
        issue_date: invoice.issue_date,
        due_date: invoice.due_date,
      }),
    [invoice.status, invoice.total, invoice.issue_date, invoice.due_date, paidSum],
  );

  useEffect(() => {
    const was = vfStatusPrevPending.current;
    vfStatusPrevPending.current = vfStatusPending;
    if (was && !vfStatusPending && vfStatusState?.ok) {
      router.refresh();
    }
  }, [vfStatusPending, vfStatusState?.ok, router]);

  const canRegisterPayment =
    displayStatus === "issued" ||
    displayStatus === "overdue" ||
    displayStatus === "partial";

  const numberLabel =
    invoice.number != null
      ? `${invoice.series}-${invoice.year}/${invoice.number}`
      : `${invoice.series}-${invoice.year}/borrador`;

  return (
    <div className="flex flex-col gap-8">
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-zinc-200 pb-4 dark:border-zinc-700">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Resumen de factura
            </p>
            <p className="mt-1 text-base font-semibold text-zinc-900 dark:text-zinc-50">
              {numberLabel}
            </p>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-zinc-600 dark:text-zinc-400">
              {invoice.clients ? (
                <Link
                  href={`/clients/${invoice.client_id}`}
                  className="font-medium text-accent underline underline-offset-2 hover:text-accent-hover"
                  title="Abrir ficha del cliente"
                >
                  {invoice.clients.name}
                </Link>
              ) : (
                <span>Cliente</span>
              )}
              {invoice.clients?.tax_id ? <span>· {invoice.clients.tax_id}</span> : null}
              <Link
                href={`/clients/${invoice.client_id}`}
                className="text-xs font-medium text-zinc-500 underline underline-offset-2 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                title="Editar cliente"
              >
                Editar
              </Link>
            </div>
          </div>
          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusBadgeClass(displayStatus)}`}
          >
            {displayStatus === "draft"
              ? "Borrador"
              : displayStatus === "issued"
                ? "Emitida"
                : displayStatus === "partial"
                  ? "Parcialmente pagada"
                  : displayStatus === "paid"
                    ? "Pagada"
                    : displayStatus === "overdue"
                      ? "Vencida"
                      : displayStatus === "cancelled"
                        ? "Anulada"
                        : displayStatus}
          </span>
        </div>
        {!isDraft ? (
          <>
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-zinc-500">Emisión</dt>
                <dd>{invoice.issue_date ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Vencimiento</dt>
                <dd>{invoice.due_date ?? "—"}</dd>
              </div>
            </dl>
            <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-700">
              <a
                href={`/api/invoices/${invoice.id}/pdf`}
                className="inline-flex h-9 items-center rounded-lg border border-brand-border bg-brand-soft px-3 text-sm font-medium text-accent hover:bg-brand-soft dark:border-brand-border/70 dark:bg-brand-soft dark:text-accent"
              >
                Descargar PDF
              </a>
            </div>
          </>
        ) : (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Borrador · la fecha de emisión se registrará al emitir la factura.
          </p>
        )}
      </div>

      {!isDraft &&
      (invoice.verifacti_qr_base64 ||
        invoice.verifacti_registro_estado ||
        invoice.verifacti_last_error ||
        invoice.verifacti_uuid) ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Verifactu (Verifacti)
          </h2>
          <dl className="grid gap-3 text-sm">
            {invoice.verifacti_registro_estado ? (
              <div>
                <dt className="text-zinc-500">Estado registro</dt>
                {isVerifactiConfirmed(invoice.verifacti_registro_estado) ? (
                  <dd className="flex items-center gap-2 font-medium text-emerald-800 dark:text-emerald-200">
                    <span>{invoice.verifacti_registro_estado}</span>
                    <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                      Confirmada
                    </span>
                  </dd>
                ) : (
                  <dd className="font-medium text-zinc-900 dark:text-zinc-100">
                    {invoice.verifacti_registro_estado}
                  </dd>
                )}
              </div>
            ) : null}
            {invoice.verifacti_uuid ? (
              <div>
                <dt className="text-zinc-500">UUID</dt>
                <dd className="break-all font-mono text-xs text-zinc-800 dark:text-zinc-200">
                  {invoice.verifacti_uuid}
                </dd>
                <a
                  href={`/api/verifacti/verify/${invoice.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-flex text-xs font-medium text-accent underline underline-offset-2 hover:text-accent-hover"
                >
                  Ir a verificación de factura
                </a>
              </div>
            ) : null}
            {invoice.verifacti_last_error ? (
              <div>
                <dt className="text-zinc-500">Último error</dt>
                <dd className="text-amber-800 dark:text-amber-200">{invoice.verifacti_last_error}</dd>
              </div>
            ) : null}
            {invoice.verifacti_qr_base64 ? (
              <div className="flex flex-col gap-2">
                <dt className="text-zinc-500">Código QR</dt>
                <dd>
                  {/* Base64 dinámico de Verifacti: no usar next/image */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={verifactiQrDataUrl(invoice.verifacti_qr_base64)}
                    alt="QR Verifactu"
                    className="h-40 w-40 border border-zinc-200 bg-white object-contain dark:border-zinc-600"
                  />
                </dd>
              </div>
            ) : null}
          </dl>
          {invoice.verifacti_uuid ? (
            <form action={vfStatusForm} className="mt-4 flex flex-col gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-700">
              <input type="hidden" name="invoice_id" value={invoice.id} />
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                El registro puede tardar unos minutos en la AEAT. Pulsa para actualizar el estado
                (consulta a Verifacti).
              </p>
              {vfStatusState?.error ? (
                <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                  {vfStatusState.error}
                </p>
              ) : null}
              {vfStatusState?.info ? (
                <p className="text-sm text-emerald-800 dark:text-emerald-200" role="status">
                  {vfStatusState.info}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={vfStatusPending}
                className="inline-flex h-9 max-w-xs items-center justify-center rounded-lg border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
              >
                {vfStatusPending ? "Consultando…" : "Comprobar estado AEAT"}
              </button>
            </form>
          ) : null}
        </div>
      ) : null}

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Líneas
        </h2>
        {lines.length === 0 ? (
          !isDraft ? (
            <p className="rounded-xl border border-dashed border-zinc-300 px-4 py-8 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
              Sin líneas.
            </p>
          ) : !showAddLineForm ? (
            <div className="flex flex-col items-center justify-center gap-5 rounded-xl border border-dashed border-zinc-300 bg-zinc-50/80 px-6 py-12 text-center dark:border-zinc-600 dark:bg-zinc-900/40">
              <div>
                <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                  Aún no hay líneas en esta factura
                </p>
                <p className="mt-1 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
                  Elige un producto del catálogo (se rellenan precio e IVA) o una línea
                  libre y escribe tú el concepto y los importes.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddLineForm(true)}
                aria-label="Añadir la primera línea a la factura"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-brand-fg shadow-sm transition hover:bg-brand-hover focus:outline-none focus:ring-2 focus:ring-brand/40 focus:ring-offset-2 dark:focus:ring-offset-zinc-900"
              >
                <span className="text-lg leading-none" aria-hidden>
                  +
                </span>
                Añadir primera línea
              </button>
            </div>
          ) : null
        ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800">
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Descripción</th>
                  <th className="px-3 py-2 text-right">Cant.</th>
                  <th className="px-3 py-2 text-right">P. unit.</th>
                  <th className="px-3 py-2 text-right">IVA</th>
                  <th className="px-3 py-2 text-right">Total</th>
                  {isDraft ? <th className="px-3 py-2" /> : null}
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => (
                  <tr
                    key={l.id}
                    className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/80"
                  >
                    <td className="px-3 py-2 tabular-nums text-zinc-600">
                      {l.line_number}
                    </td>
                    <td className="max-w-[14rem] px-3 py-2 text-zinc-900 dark:text-zinc-50">
                      {l.description}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {l.quantity}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatMoneyEUR(l.unit_price)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {l.tax_rate}%
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums font-medium">
                      {formatMoneyEUR(l.line_total)}
                    </td>
                    {isDraft ? (
                      <td className="px-3 py-2">
                        <form action={deleteLine}>
                          <input type="hidden" name="invoice_id" value={invoice.id} />
                          <input type="hidden" name="line_id" value={l.id} />
                          <button
                            type="submit"
                            disabled={delPending}
                            className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
                          >
                            Quitar
                          </button>
                        </form>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {isDraft && lines.length > 0 && !showAddLineForm ? (
          <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm ring-1 ring-zinc-950/5 dark:border-zinc-600 dark:bg-zinc-900 dark:ring-white/10">
            <button
              type="button"
              onClick={() => setShowAddLineForm(true)}
              aria-label="Añadir otra línea a la factura"
              className="flex w-full items-center gap-4 px-4 py-3.5 text-left transition hover:bg-blue-50/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500/40 dark:hover:bg-blue-950/25 dark:focus-visible:ring-blue-400/35 sm:px-5 sm:py-4"
            >
              <span
                className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-xl font-light leading-none text-white shadow-md shadow-blue-600/25 dark:bg-blue-500 dark:shadow-blue-500/20"
                aria-hidden
              >
                +
              </span>
              <span className="min-w-0 flex-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Añadir otra línea
              </span>
              <span
                className="hidden shrink-0 text-2xl font-light leading-none text-blue-500/70 dark:text-blue-400/80 sm:block"
                aria-hidden
              >
                ›
              </span>
            </button>
          </div>
        ) : null}

        {lineState?.error ? (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
            {lineState.error}
          </p>
        ) : null}
        {delState?.error ? (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
            {delState.error}
          </p>
        ) : null}

        {isDraft && showAddLineForm ? (
          <div className="mt-4">
            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-md ring-1 ring-zinc-950/5 dark:border-zinc-600 dark:bg-zinc-900 dark:ring-white/10">
              <div className="flex flex-col gap-4 border-b border-zinc-100 bg-gradient-to-r from-brand-soft via-white to-brand-soft/40 px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-6 dark:border-zinc-800 dark:from-brand-soft/30 dark:via-zinc-900 dark:to-zinc-900/80">
                <div className="min-w-0 space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                    Añadir a la factura
                  </p>
                  <h3 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                    Nueva línea
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddLineForm(false)}
                  className="shrink-0 self-start rounded-full border border-zinc-200 bg-white/90 px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm transition hover:border-zinc-300 hover:bg-white dark:border-zinc-600 dark:bg-zinc-800/90 dark:text-zinc-200 dark:hover:border-zinc-500 dark:hover:bg-zinc-800"
                >
                  Cerrar
                </button>
              </div>

              <form action={addLine} className="flex flex-col gap-6 p-5 sm:p-6">
                <input type="hidden" name="invoice_id" value={invoice.id} />

                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Origen
                  </p>
                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                      Producto del catálogo{" "}
                      <span className="font-normal text-zinc-500 dark:text-zinc-400">(opcional)</span>
                    </span>
                    <select
                      name="product_id"
                      value={addLineProductId}
                      onChange={(e) => onAddLineProductChange(e.target.value)}
                      className="rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/25 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-blue-400 dark:focus:ring-blue-400/30"
                    >
                      <option value="">— Línea libre (sin catálogo) —</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} · {catalogKindLabel(parseCatalogKind(p.kind))} ·{" "}
                          {formatMoneyEUR(p.unit_price)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Concepto
                  </p>
                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                      Descripción <span className="text-red-600 dark:text-red-400">*</span>
                    </span>
                    <input
                      name="description"
                      required
                      value={addLineDescription}
                      onChange={(e) => setAddLineDescription(e.target.value)}
                      placeholder="Ej. Licencia software, horas de consultoría…"
                      className="rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/25 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-blue-400 dark:focus:ring-blue-400/30"
                    />
                  </label>
                </div>

                <div className="rounded-xl border border-zinc-100 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-950/50">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Importes e impuestos
                  </p>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <label className="flex flex-col gap-2">
                      <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                        Cantidad
                      </span>
                      <input
                        name="quantity"
                        required
                        value={addLineQuantity}
                        onChange={(e) => setAddLineQuantity(e.target.value)}
                        inputMode="decimal"
                        className="rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm tabular-nums text-zinc-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/25 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-blue-400 dark:focus:ring-blue-400/30"
                      />
                    </label>
                    <label className="flex flex-col gap-2">
                      <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                        Precio unitario (€) <span className="text-red-600 dark:text-red-400">*</span>
                      </span>
                      <input
                        name="unit_price"
                        required
                        value={addLineUnitPrice}
                        onChange={(e) => setAddLineUnitPrice(e.target.value)}
                        inputMode="decimal"
                        placeholder="0,00"
                        className="rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm tabular-nums text-zinc-900 shadow-sm placeholder:text-zinc-400 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/25 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-blue-400 dark:focus:ring-blue-400/30"
                      />
                    </label>
                    <label className="flex flex-col gap-2 sm:col-span-1">
                      <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                        IVA (%)
                      </span>
                      <input
                        name="tax_rate"
                        value={addLineTaxRate}
                        onChange={(e) => setAddLineTaxRate(e.target.value)}
                        inputMode="decimal"
                        className="rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm tabular-nums text-zinc-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/25 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-blue-400 dark:focus:ring-blue-400/30"
                      />
                    </label>
                  </div>
                </div>

                <div className="flex flex-col gap-3 border-t border-zinc-100 pt-2 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-end">
                  <button
                    type="submit"
                    disabled={linePending}
                    className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60 dark:bg-blue-500 dark:hover:bg-blue-400 dark:focus:ring-blue-400 dark:focus:ring-offset-zinc-900 sm:w-auto sm:min-w-[11rem]"
                  >
                    {linePending ? "Añadiendo…" : "Guardar línea"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}
      </section>

      <div className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900/40">
        <div className="flex justify-between text-sm">
          <span className="text-zinc-600 dark:text-zinc-400">Base imponible</span>
          <span className="tabular-nums font-medium">
            {formatMoneyEUR(invoice.subtotal)}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-zinc-600 dark:text-zinc-400">IVA</span>
          <span className="tabular-nums font-medium">
            {formatMoneyEUR(invoice.tax_amount)}
          </span>
        </div>
        <div className="flex justify-between border-t border-zinc-200 pt-2 text-base dark:border-zinc-700">
          <span className="font-semibold text-zinc-900 dark:text-zinc-50">Total</span>
          <span className="tabular-nums font-semibold text-zinc-900 dark:text-zinc-50">
            {formatMoneyEUR(invoice.total)}
          </span>
        </div>
      </div>

      {!isDraft ? (
        <section className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/30">
              <p className="text-xs uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                Pagado
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-emerald-900 dark:text-emerald-100">
                {formatMoneyEUR(paidSum)}
              </p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
              <p className="text-xs uppercase tracking-wide text-amber-700 dark:text-amber-300">
                Pendiente
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-amber-900 dark:text-amber-100">
                {formatMoneyEUR(Math.max(0, pendingToPay))}
              </p>
            </div>
          </div>

          <section>
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Cobros
            </h2>
            {payments.length === 0 ? (
              !canRegisterPayment ? (
                <p className="rounded-xl border border-dashed border-zinc-300 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                  Sin cobros registrados.
                </p>
              ) : !showAddPaymentForm ? (
                <div className="flex flex-col items-center justify-center gap-5 rounded-xl border border-dashed border-zinc-300 bg-zinc-50/80 px-6 py-12 text-center dark:border-zinc-600 dark:bg-zinc-900/40">
                  <div>
                    <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                      Aún no hay cobros en esta factura
                    </p>
                    {pendingToPay > 0 ? (
                      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        Pendiente de cobro: {formatMoneyEUR(pendingToPay)}
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddPaymentForm(true)}
                    aria-label="Registrar el primer cobro de la factura"
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-brand-fg shadow-sm transition hover:bg-brand-hover focus:outline-none focus:ring-2 focus:ring-brand/40 focus:ring-offset-2 dark:focus:ring-offset-zinc-900"
                  >
                    <span className="text-lg leading-none" aria-hidden>
                      +
                    </span>
                    Registrar primer cobro
                  </button>
                </div>
              ) : null
            ) : (
              <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
                <table className="w-full min-w-[28rem] text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800">
                      <th className="px-3 py-2">Fecha</th>
                      <th className="px-3 py-2 text-right">Importe</th>
                      <th className="px-3 py-2">Método</th>
                      <th className="px-3 py-2">Notas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr
                        key={p.id}
                        className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/80"
                      >
                        <td className="px-3 py-2 text-zinc-700 dark:text-zinc-300">
                          {new Date(p.paid_at).toLocaleString("es-ES", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </td>
                        <td className="px-3 py-2 text-right font-medium tabular-nums text-zinc-900 dark:text-zinc-100">
                          {formatMoneyEUR(p.amount)}
                        </td>
                        <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">
                          {p.method ?? "—"}
                        </td>
                        <td className="max-w-[12rem] truncate px-3 py-2 text-zinc-600 dark:text-zinc-400">
                          {p.notes ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {canRegisterPayment && payments.length > 0 && !showAddPaymentForm ? (
              <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm ring-1 ring-zinc-950/5 dark:border-zinc-600 dark:bg-zinc-900 dark:ring-white/10">
                <button
                  type="button"
                  onClick={() => setShowAddPaymentForm(true)}
                  aria-label="Registrar otro cobro en la factura"
                  className="flex w-full items-center gap-4 px-4 py-3.5 text-left transition hover:bg-blue-50/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500/40 dark:hover:bg-blue-950/25 dark:focus-visible:ring-blue-400/35 sm:px-5 sm:py-4"
                >
                  <span
                    className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-xl font-light leading-none text-white shadow-md shadow-blue-600/25 dark:bg-blue-500 dark:shadow-blue-500/20"
                    aria-hidden
                  >
                    +
                  </span>
                  <span className="min-w-0 flex-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    Añadir otro cobro
                  </span>
                  <span
                    className="hidden shrink-0 text-2xl font-light leading-none text-blue-500/70 dark:text-blue-400/80 sm:block"
                    aria-hidden
                  >
                    ›
                  </span>
                </button>
              </div>
            ) : null}

            {payState?.error && !showAddPaymentForm ? (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
                {payState.error}
              </p>
            ) : null}

            {canRegisterPayment && showAddPaymentForm ? (
              <div className="mt-4">
                <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-md ring-1 ring-zinc-950/5 dark:border-zinc-600 dark:bg-zinc-900 dark:ring-white/10">
                  <div className="flex flex-col gap-4 border-b border-zinc-100 bg-gradient-to-r from-brand-soft via-white to-brand-soft/40 px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-6 dark:border-zinc-800 dark:from-brand-soft/30 dark:via-zinc-900 dark:to-zinc-900/80">
                    <div className="min-w-0 space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                        Registrar en la factura
                      </p>
                      <h3 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                        Nuevo cobro
                      </h3>
                      {pendingToPay > 0 ? (
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                          Pendiente:{" "}
                          <span className="font-medium tabular-nums text-zinc-800 dark:text-zinc-200">
                            {formatMoneyEUR(pendingToPay)}
                          </span>
                        </p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAddPaymentForm(false)}
                      className="shrink-0 self-start rounded-full border border-zinc-200 bg-white/90 px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm transition hover:border-zinc-300 hover:bg-white dark:border-zinc-600 dark:bg-zinc-800/90 dark:text-zinc-200 dark:hover:border-zinc-500 dark:hover:bg-zinc-800"
                    >
                      Cerrar
                    </button>
                  </div>

                  <form action={payForm} className="flex flex-col gap-6 p-5 sm:p-6">
                    <input type="hidden" name="invoice_id" value={invoice.id} />

                    <div className="rounded-xl border border-zinc-100 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-950/50">
                      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        Importe y fecha
                      </p>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="flex flex-col gap-2">
                          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                            Importe cobrado (€){" "}
                            <span className="text-red-600 dark:text-red-400">*</span>
                          </span>
                          <input
                            name="amount"
                            required
                            inputMode="decimal"
                            placeholder={
                              pendingToPay > 0 ? pendingToPay.toFixed(2) : "0,00"
                            }
                            className="rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm tabular-nums text-zinc-900 shadow-sm placeholder:text-zinc-400 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/25 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-blue-400 dark:focus:ring-blue-400/30"
                          />
                        </label>
                        <label className="flex flex-col gap-2">
                          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                            Fecha y hora
                          </span>
                          <input
                            type="datetime-local"
                            name="paid_at"
                            className="rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/25 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-blue-400 dark:focus:ring-blue-400/30"
                          />
                        </label>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        Detalle opcional
                      </p>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="flex flex-col gap-2">
                          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                            Método de cobro
                          </span>
                          <input
                            name="method"
                            placeholder="Transferencia, tarjeta, efectivo..."
                            className="rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/25 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-blue-400 dark:focus:ring-blue-400/30"
                          />
                        </label>
                        <label className="flex flex-col gap-2">
                          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                            Notas
                          </span>
                          <input
                            name="notes"
                            placeholder="Referencia, banco, observaciones..."
                            className="rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/25 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-blue-400 dark:focus:ring-blue-400/30"
                          />
                        </label>
                      </div>
                    </div>

                    {payState?.error ? (
                      <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                        {payState.error}
                      </p>
                    ) : null}

                    <div className="flex flex-col gap-3 border-t border-zinc-100 pt-2 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-end">
                      <button
                        type="submit"
                        disabled={payPending}
                        className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60 dark:bg-blue-500 dark:hover:bg-blue-400 dark:focus:ring-blue-400 dark:focus:ring-offset-zinc-900 sm:w-auto sm:min-w-[11rem]"
                      >
                        {payPending ? "Guardando…" : "Guardar cobro"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            ) : null}
          </section>
        </section>
      ) : null}

      {isDraft ? (
        <form
          action={issueForm}
          className="flex flex-col gap-4 rounded-xl border border-brand-border bg-brand-soft p-6 dark:border-brand-border/50 dark:bg-brand-soft"
        >
          <h3 className="font-semibold text-accent">
            Emitir factura
          </h3>
          {invoice.clients &&
          (!invoice.clients.tax_id?.trim() || !invoice.clients.address?.trim()) ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
              Antes de emitir, el cliente necesita{" "}
              {!invoice.clients.tax_id?.trim() ? "NIF/CIF" : null}
              {!invoice.clients.tax_id?.trim() && !invoice.clients.address?.trim()
                ? " y "
                : null}
              {!invoice.clients.address?.trim() ? "domicilio fiscal (calle, CP y ciudad)" : null}.{" "}
              <Link
                href={`/clients/${invoice.client_id}`}
                className="font-medium underline hover:text-amber-700 dark:hover:text-amber-200"
              >
                Editar cliente
              </Link>
            </p>
          ) : null}
          <input type="hidden" name="invoice_id" value={invoice.id} />
          <label className="flex max-w-xs flex-col gap-1 text-sm">
            <span className="font-medium text-accent">
              Vencimiento (opcional)
            </span>
            <input
              type="date"
              name="due_date"
              className="rounded-lg border border-brand-border bg-white px-3 py-2 text-zinc-900 dark:border-brand-border/60 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </label>
          {issueState?.error ? (
            <p className="text-sm text-red-700 dark:text-red-300" role="alert">
              {issueState.error}
            </p>
          ) : null}
          {issueState?.warn ? (
            <p className="text-sm text-amber-800 dark:text-amber-200" role="status">
              {issueState.warn}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={issuePending}
            className="inline-flex h-10 max-w-xs items-center justify-center rounded-lg bg-brand px-4 text-sm font-medium text-brand-fg hover:bg-brand-hover disabled:opacity-60"
          >
            {issuePending ? "Emitiendo…" : "Emitir y numerar"}
          </button>
        </form>
      ) : null}

    </div>
  );
}
