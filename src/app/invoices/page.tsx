import Link from "next/link";
import { Suspense } from "react";
import { AssistantContextualCta } from "@/components/assistant-contextual-cta";
import { InvoicesFiltersPanel } from "@/components/invoices-filters-panel";
import { InvoicesVerifactuBulkButton } from "@/components/invoices-verifactu-bulk-button";
import { PageHeader } from "@/components/page-header";
import { effectiveInvoiceStatus } from "@/lib/invoice-status";
import { InvoicesPagination } from "@/components/invoices-pagination";
import { INVOICES_PAGE_SIZE, parseInvoiceListSearch } from "@/lib/invoice-list-url";
import { formatMoneyEUR, roundCurrencyEUR } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function aeatRegistroCell(inv: {
  verifacti_uuid: string | null;
  verifacti_registro_estado: string | null;
}) {
  const uuid = (inv.verifacti_uuid ?? "").trim();
  if (!uuid) {
    return (
      <span className="text-zinc-400 dark:text-zinc-500" title="No enviada a Verifacti">
        —
      </span>
    );
  }
  const est = (inv.verifacti_registro_estado ?? "").trim();
  if (!est) {
    return (
      <span className="text-amber-700 dark:text-amber-300" title="Registro en curso en AEAT">
        Pendiente
      </span>
    );
  }
  const pend = est.toLowerCase().includes("pendiente");
  return (
    <span
      className={
        pend ? "text-amber-700 dark:text-amber-300" : "text-zinc-700 dark:text-zinc-200"
      }
      title="Estado del registro Verifactu / AEAT"
    >
      {est}
    </span>
  );
}

function statusLabel(s: string) {
  const map: Record<string, string> = {
    draft: "Borrador",
    issued: "Emitida",
    partial: "Parcialmente pagada",
    paid: "Pagada",
    cancelled: "Anulada",
    overdue: "Vencida",
  };
  return map[s] ?? s;
}

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function InvoicesPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const filters = parseInvoiceListSearch(sp);
  const verifactiConfigured = Boolean(process.env.VERIFACTI_NIF_API_KEY?.trim());

  const supabase = await createClient();

  const { data: clients } = await supabase
    .from("clients")
    .select("id, name")
    .order("name");

  let invQuery = supabase
    .from("invoices")
    .select(
      "id, series, year, number, status, total, issue_date, due_date, created_at, verifacti_uuid, verifacti_registro_estado, clients ( name )",
    )
    .order("created_at", { ascending: false });

  if (filters.client_id) {
    invQuery = invQuery.eq("client_id", filters.client_id);
  }

  const donutSeg = filters.segment;
  const isDonutSegment =
    donutSeg === "paid" || donutSeg === "pend" || donutSeg === "due";

  let stFilter = filters.status;
  if (isDonutSegment) {
    invQuery = invQuery.in("status", ["issued", "partial", "overdue", "paid"]);
    stFilter = undefined;
  } else if (stFilter === "draft" || stFilter === "paid" || stFilter === "cancelled") {
    invQuery = invQuery.eq("status", stFilter);
  } else if (stFilter === "issued" || stFilter === "partial" || stFilter === "overdue") {
    invQuery = invQuery.in("status", ["issued", "partial", "overdue"]);
  }
  if (filters.from && filters.to) {
    invQuery = invQuery
      .gte("issue_date", filters.from)
      .lte("issue_date", filters.to);
  } else if (filters.from) {
    invQuery = invQuery.gte("issue_date", filters.from);
  } else if (filters.to) {
    invQuery = invQuery.lte("issue_date", filters.to);
  }

  const { data: rows, error } = await invQuery;

  const invoiceIds = (rows ?? []).map((r) => r.id as string);
  const paidBy = new Map<string, number>();
  if (invoiceIds.length > 0) {
    const { data: payRows } = await supabase
      .from("payments")
      .select("invoice_id, amount")
      .in("invoice_id", invoiceIds);
    for (const p of payRows ?? []) {
      const id = p.invoice_id as string;
      paidBy.set(id, roundCurrencyEUR((paidBy.get(id) ?? 0) + Number(p.amount)));
    }
  }

  let tableRows = rows ?? [];
  if (isDonutSegment) {
    tableRows = tableRows.filter((inv) => {
      const eff = effectiveInvoiceStatus({
        status: inv.status as string,
        total: Number(inv.total),
        paidSum: paidBy.get(inv.id as string) ?? 0,
        issue_date: inv.issue_date as string | null,
        due_date: inv.due_date as string | null,
      });
      if (donutSeg === "paid") return eff === "paid";
      if (donutSeg === "pend") return eff === "issued" || eff === "partial";
      return eff === "overdue";
    });
  } else if (stFilter === "issued" || stFilter === "partial" || stFilter === "overdue") {
    tableRows = tableRows.filter((inv) => {
      const eff = effectiveInvoiceStatus({
        status: inv.status as string,
        total: Number(inv.total),
        paidSum: paidBy.get(inv.id as string) ?? 0,
        issue_date: inv.issue_date as string | null,
        due_date: inv.due_date as string | null,
      });
      return eff === stFilter;
    });
  }

  const hasFilters = Boolean(
    filters.client_id ||
      filters.status ||
      filters.from ||
      filters.to ||
      filters.segment,
  );

  const totalItems = tableRows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / INVOICES_PAGE_SIZE));
  const currentPage = Math.min(filters.page ?? 1, totalPages);
  const pageRows = tableRows.slice(
    (currentPage - 1) * INVOICES_PAGE_SIZE,
    currentPage * INVOICES_PAGE_SIZE,
  );

  return (
    <div className="flex w-full flex-1 flex-col">
      <PageHeader eyebrow="Gestión" title="Facturas" />
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <Suspense
        fallback={
          <div
            className="mb-4 h-24 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800/80"
            aria-hidden
          />
        }
      >
        <InvoicesFiltersPanel
          clients={clients ?? []}
          actionSlot={
            <div className="flex flex-wrap items-stretch justify-end gap-2">
              <InvoicesVerifactuBulkButton configured={verifactiConfigured} />
              <Link
                href="/invoices/new"
                className="inline-flex h-10 items-center rounded-lg bg-brand px-4 text-sm font-medium text-brand-fg shadow-sm hover:bg-brand-hover"
              >
                Nueva factura
              </Link>
            </div>
          }
        />
      </Suspense>

      <AssistantContextualCta
        source="invoices-list"
        questions={[
          "¿Cuáles son mis facturas vencidas?",
          "Facturas que vencen esta semana",
          "Abrir facturas pendientes",
          "Compara mi facturación con el mes pasado",
        ]}
      />

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error.message}
        </p>
      ) : !tableRows?.length ? (
        <p className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-10 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400">
          {hasFilters
            ? "Ninguna factura coincide con estos filtros. Prueba a ampliar fechas o quitar el cliente/estado."
            : "No hay facturas. "}
          {!hasFilters ? (
            <>
              <Link
                href="/invoices/new"
                className="font-medium text-accent underline hover:text-accent-hover"
              >
                Crear borrador
              </Link>
            </>
          ) : null}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
          <table className="w-full min-w-[46rem] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800">
                <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">
                  Nº / serie
                </th>
                <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">
                  Cliente
                </th>
                <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">
                  Estado
                </th>
                <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">
                  AEAT
                </th>
                <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">
                  Emisión
                </th>
                <th className="px-4 py-3 text-right font-medium text-zinc-700 dark:text-zinc-300">
                  Total
                </th>
                <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300" />
              </tr>
            </thead>
            <tbody>
              {pageRows.map((inv) => {
                const cr = inv.clients as { name: string } | { name: string }[] | null;
                const client = Array.isArray(cr) ? cr[0] : cr;
                const displayStatus = effectiveInvoiceStatus({
                  status: inv.status as string,
                  total: Number(inv.total),
                  paidSum: paidBy.get(inv.id as string) ?? 0,
                  issue_date: inv.issue_date as string | null,
                  due_date: inv.due_date as string | null,
                });
                const numberCell =
                  inv.number != null ? (
                    <span className="font-mono text-xs text-zinc-800 dark:text-zinc-200">
                      {inv.series}-{inv.year}/{inv.number}
                    </span>
                  ) : (
                    <div>
                      <span className="font-medium text-zinc-900 dark:text-zinc-50">
                        Sin número
                      </span>
                      <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">
                        Serie {inv.series} · {inv.year} (se numerará al emitir)
                      </span>
                    </div>
                  );
                const emissionCell =
                  inv.issue_date != null ? (
                    inv.issue_date
                  ) : inv.status === "draft" ? (
                    <span
                      className="text-zinc-400 dark:text-zinc-500"
                      title="La fecha se guarda al emitir la factura"
                    >
                      —
                    </span>
                  ) : (
                    "—"
                  );
                return (
                  <tr
                    key={inv.id}
                    className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/80"
                  >
                    <td className="px-4 py-3 align-top">{numberCell}</td>
                    <td className="px-4 py-3 text-zinc-900 dark:text-zinc-50">
                      {client?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {statusLabel(displayStatus)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {aeatRegistroCell({
                        verifacti_uuid: (inv.verifacti_uuid as string | null) ?? null,
                        verifacti_registro_estado:
                          (inv.verifacti_registro_estado as string | null) ?? null,
                      })}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {emissionCell}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-zinc-900 dark:text-zinc-50">
                      {formatMoneyEUR(inv.total)}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/invoices/${inv.id}`}
                        className="font-medium text-accent hover:text-accent-hover hover:underline"
                      >
                        Abrir
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <InvoicesPagination
            page={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            filters={filters}
          />
        </div>
      )}
      </div>
    </div>
  );
}
