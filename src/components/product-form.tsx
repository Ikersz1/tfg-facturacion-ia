"use client";

import { useActionState } from "react";
import {
  createProductAction,
  type ProductActionState,
} from "@/app/actions/products";
import { type CatalogKind } from "@/lib/catalog-kind";

const initial: ProductActionState = {};

type Props = {
  defaultKind?: CatalogKind;
};

export function ProductForm({ defaultKind = "product" }: Props) {
  const [state, formAction, pending] = useActionState(
    createProductAction,
    initial,
  );

  return (
    <form
      action={formAction}
      className="mx-auto flex w-full max-w-lg flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
    >
      {state?.error ? (
        <p
          className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-200"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Tipo en catálogo
        </legend>
        <div className="flex flex-wrap gap-3">
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50/80 px-3 py-2 text-sm has-[:checked]:border-brand has-[:checked]:bg-brand-soft/40 dark:border-zinc-600 dark:bg-zinc-800/60 dark:has-[:checked]:border-brand dark:has-[:checked]:bg-zinc-800">
            <input
              type="radio"
              name="kind"
              value="product"
              defaultChecked={defaultKind === "product"}
              className="size-4 border-zinc-300 text-brand focus:ring-brand/40"
            />
            <span className="text-zinc-800 dark:text-zinc-100">Producto</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50/80 px-3 py-2 text-sm has-[:checked]:border-brand has-[:checked]:bg-brand-soft/40 dark:border-zinc-600 dark:bg-zinc-800/60 dark:has-[:checked]:border-brand dark:has-[:checked]:bg-zinc-800">
            <input
              type="radio"
              name="kind"
              value="service"
              defaultChecked={defaultKind === "service"}
              className="size-4 border-zinc-300 text-brand focus:ring-brand/40"
            />
            <span className="text-zinc-800 dark:text-zinc-100">Servicio</span>
          </label>
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Unifica inventario físico/digital y prestaciones (horas, honorarios, mantenimiento…).
        </p>
      </fieldset>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-zinc-700 dark:text-zinc-300">
          Nombre <span className="text-red-600">*</span>
        </span>
        <input
          name="name"
          required
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:ring-2 focus:ring-brand/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-zinc-700 dark:text-zinc-300">Descripción</span>
        <textarea
          name="description"
          rows={2}
          className="resize-y rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:ring-2 focus:ring-brand/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            SKU o referencia <span className="font-normal text-zinc-500">(opcional)</span>
          </span>
          <input
            name="sku"
            placeholder="Ej. REF-2024, EAN, código interno…"
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:ring-2 focus:ring-brand/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            Precio unitario (€) <span className="text-red-600">*</span>
          </span>
          <input
            name="unit_price"
            required
            inputMode="decimal"
            placeholder="0.00"
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:ring-2 focus:ring-brand/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">IVA (%)</span>
          <input
            name="tax_rate"
            inputMode="decimal"
            placeholder="21"
            defaultValue="21"
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:ring-2 focus:ring-brand/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="is_active"
          defaultChecked
          className="size-4 rounded border-zinc-300 text-brand focus:ring-brand/40"
        />
        <span className="text-zinc-700 dark:text-zinc-300">Activo</span>
      </label>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-10 items-center justify-center rounded-lg bg-brand px-4 text-sm font-medium text-brand-fg transition hover:bg-brand-hover disabled:opacity-60"
      >
        {pending ? "Guardando…" : "Guardar en catálogo"}
      </button>
    </form>
  );
}
