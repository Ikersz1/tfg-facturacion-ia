import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const supabase = await createClient();
  const { data: clients, error } = await supabase
    .from("clients")
    .select(
      "id, name, tax_id, email, phone, address, created_at",
    )
    .order("created_at", { ascending: false });

  return (
    <div className="flex w-full flex-1 flex-col">
      <PageHeader eyebrow="Gestión" title="Clientes" />
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6">
        <div className="flex justify-end">
          <Link
            href="/clients/new"
            className="inline-flex h-10 items-center rounded-lg bg-brand px-4 text-sm font-medium text-brand-fg shadow-sm hover:bg-brand-hover"
          >
            Nuevo cliente
          </Link>
        </div>
        <section className="min-w-0">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Listado
          </h2>
          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
              No se pudo cargar la lista: {error.message}
            </p>
          ) : !clients?.length ? (
            <p className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400">
              Aún no hay clientes.{" "}
              <Link
                href="/clients/new"
                className="font-medium text-accent underline-offset-2 hover:text-accent-hover hover:underline"
              >
                Crea el primero
              </Link>
              .
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
              <table className="w-full min-w-[32rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800">
                    <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">
                      Nombre
                    </th>
                    <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">
                      NIF/CIF
                    </th>
                    <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">
                      Email
                    </th>
                    <th className="hidden px-4 py-3 font-medium text-zinc-700 sm:table-cell dark:text-zinc-300">
                      Teléfono
                    </th>
                    <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300" />
                  </tr>
                </thead>
                <tbody>
                  {clients.map((c) => (
                    <tr
                      key={c.id}
                      className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/80"
                    >
                      <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-50">
                        {c.name}
                      </td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                        {c.tax_id ?? "—"}
                      </td>
                      <td className="max-w-[12rem] truncate px-4 py-3 text-zinc-600 dark:text-zinc-400">
                        {c.email ?? "—"}
                      </td>
                      <td className="hidden px-4 py-3 text-zinc-600 sm:table-cell dark:text-zinc-400">
                        {c.phone ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/clients/${c.id}`}
                          className="font-medium text-accent hover:text-accent-hover hover:underline"
                        >
                          Ficha
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
