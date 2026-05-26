import Link from "next/link";
import { notFound } from "next/navigation";
import { AssistantContextualCta } from "@/components/assistant-contextual-cta";
import { ClientEditForm } from "@/components/client-edit-form";
import { PageHeader } from "@/components/page-header";
import {
  clientKindLabel,
  clientNameLabel,
  clientTaxIdLabel,
  parseClientKind,
} from "@/lib/client-kind";
import { effectiveInvoiceStatus } from "@/lib/invoice-status";
import { formatMoneyEUR, roundCurrencyEUR } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

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
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ClientDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = await searchParams;
  const isEditing = sp.edit === "1";
  const saved = sp.saved === "1";
  const supabase = await createClient();

  const { data: client, error: cErr } = await supabase
    .from("clients")
    .select("id, name, tax_id, email, phone, address, notes, kind, created_at")
    .eq("id", id)
    .maybeSingle();

  if (cErr || !client) {
    notFound();
  }

  const clientKind = parseClientKind(client.kind as string | null);

  const { data: invoices } = await supabase
    .from("invoices")
    .select(
      "id, series, year, number, status, total, issue_date, due_date, created_at",
    )
    .eq("client_id", id)
    .order("created_at", { ascending: false });

  const invIds = (invoices ?? []).map((i) => i.id as string);
  const paidBy = new Map<string, number>();
  if (invIds.length > 0) {
    const { data: payRows } = await supabase
      .from("payments")
      .select("invoice_id, amount")
      .in("invoice_id", invIds);
    for (const p of payRows ?? []) {
      const pid = p.invoice_id as string;
      paidBy.set(pid, roundCurrencyEUR((paidBy.get(pid) ?? 0) + Number(p.amount)));
    }
  }

  return (
    <div className="flex w-full flex-1 flex-col">
      <PageHeader
        back={{ href: "/clients", ariaLabel: "Volver a clientes" }}
        eyebrow="Facturación"
        title={client.name}
        description={client.tax_id ?? undefined}
      />
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6">
        <div className="flex flex-wrap justify-start gap-2">
          <Link
            href={`/invoices/new?client_id=${id}`}
            className="inline-flex h-10 items-center rounded-lg bg-brand px-4 text-sm font-medium text-brand-fg hover:bg-brand-hover"
          >
            Nueva factura
          </Link>
          {isEditing ? (
            <Link
              href={`/clients/${id}`}
              className="inline-flex h-10 items-center rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
            >
              Cancelar edición
            </Link>
          ) : (
            <Link
              href={`/clients/${id}?edit=1`}
              className="inline-flex h-10 items-center rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
            >
              Editar cliente
            </Link>
          )}
        </div>

        <AssistantContextualCta
          source="client-detail"
          questions={[
            `¿Cuánto debe ${client.name}?`,
            `He cobrado 100 de ${client.name}`,
            `Genera un recordatorio de cobro para ${client.name}`,
          ]}
        />

        {saved && !isEditing ? (
          <p
            className="rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100"
            role="status"
          >
            Cliente actualizado correctamente.
          </p>
        ) : null}

        {isEditing ? (
          <div id="editar-cliente">
            <ClientEditForm client={client} />
          </div>
        ) : (
          <div className="grid gap-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 sm:grid-cols-2">
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-zinc-500 dark:text-zinc-400">Tipo</dt>
                <dd className="text-zinc-900 dark:text-zinc-50">
                  {clientKindLabel(clientKind)}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500 dark:text-zinc-400">
                  {clientNameLabel(clientKind)}
                </dt>
                <dd className="text-zinc-900 dark:text-zinc-50">{client.name}</dd>
              </div>
              <div>
                <dt className="text-zinc-500 dark:text-zinc-400">
                  {clientTaxIdLabel(clientKind)}
                </dt>
                <dd className="text-zinc-900 dark:text-zinc-50">{client.tax_id ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-zinc-500 dark:text-zinc-400">Email</dt>
                <dd className="text-zinc-900 dark:text-zinc-50">{client.email ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-zinc-500 dark:text-zinc-400">Teléfono</dt>
                <dd className="text-zinc-900 dark:text-zinc-50">{client.phone ?? "—"}</dd>
              </div>
            </dl>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-zinc-500 dark:text-zinc-400">Domicilio fiscal</dt>
                <dd className="whitespace-pre-wrap text-zinc-900 dark:text-zinc-50">
                  {client.address ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500 dark:text-zinc-400">Notas</dt>
                <dd className="whitespace-pre-wrap text-zinc-900 dark:text-zinc-50">
                  {client.notes ?? "—"}
                </dd>
              </div>
            </dl>
          </div>
        )}


        <section>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Facturas de este cliente
          </h2>
          {!invoices?.length ? (
            <p className="rounded-lg border border-dashed border-zinc-300 px-4 py-8 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
              Aún no hay facturas.{" "}
              <Link
                href={`/invoices/new?client_id=${id}`}
                className="font-medium text-accent underline hover:text-accent-hover"
              >
                Crear una
              </Link>
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
              <table className="w-full min-w-[36rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800">
                    <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">
                      Nº
                    </th>
                    <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">
                      Estado
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
                  {invoices.map((inv) => {
                    const numLabel =
                      inv.number != null
                        ? `${inv.series}-${inv.year}/${inv.number}`
                        : "Borrador";
                    const paid = paidBy.get(inv.id as string) ?? 0;
                    const displayStatus = effectiveInvoiceStatus({
                      status: inv.status as string,
                      total: Number(inv.total),
                      paidSum: paid,
                      issue_date: inv.issue_date as string | null,
                      due_date: inv.due_date as string | null,
                    });
                    return (
                      <tr
                        key={inv.id}
                        className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/80"
                      >
                        <td className="px-4 py-3 font-mono text-xs text-zinc-800 dark:text-zinc-200">
                          {numLabel}
                        </td>
                        <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                          {statusLabel(displayStatus)}
                        </td>
                        <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                          {inv.issue_date ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
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
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
