"use client";

import { useActionState } from "react";
import {
  createProductAction,
  type ProductActionState,
} from "@/app/actions/products";
import { catalogKindLabel, type CatalogKind } from "@/lib/catalog-kind";

const initial: ProductActionState = {};

const inputClass =
  "rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-brand/50 focus:ring-2 focus:ring-brand/25 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder:text-zinc-500";

type Props = {
  defaultKind?: CatalogKind;
  /** Desde el catálogo: el tipo viene de la pestaña; no mostrar selector producto/servicio */
  lockKind?: boolean;
};

export function ProductForm({ defaultKind = "product", lockKind = true }: Props) {
  const [state, formAction, pending] = useActionState(
    createProductAction,
    initial,
  );

  const isService = defaultKind === "service";

  return (
    <form
      action={formAction}
      className="mx-auto flex w-full max-w-lg flex-col gap-5 rounded-2xl border border-zinc-200/90 bg-white p-6 shadow-md ring-1 ring-zinc-100/80 dark:border-zinc-700/90 dark:bg-zinc-900 dark:ring-zinc-800/80 sm:p-8"
    >
      {state?.error ? (
        <p
          className="rounded-xl border border-red-200/80 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-100"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}

      {lockKind ? (
        <input type="hidden" name="kind" value={defaultKind} />
      ) : (
        <fieldset className="flex flex-col gap-2 rounded-xl border border-zinc-200/80 bg-zinc-50/50 p-4 dark:border-zinc-700/80 dark:bg-zinc-800/30">
          <legend className="px-0.5 text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Tipo en catálogo
          </legend>
          <div className="flex flex-wrap gap-3">
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm has-[:checked]:border-brand has-[:checked]:ring-2 has-[:checked]:ring-brand/30 dark:border-zinc-600 dark:bg-zinc-900 dark:has-[:checked]:border-brand">
              <input
                type="radio"
                name="kind"
                value="product"
                defaultChecked={defaultKind === "product"}
                className="size-4 border-zinc-300 text-brand focus:ring-brand/40"
              />
              <span className="text-zinc-800 dark:text-zinc-100">Producto</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm has-[:checked]:border-brand has-[:checked]:ring-2 has-[:checked]:ring-brand/30 dark:border-zinc-600 dark:bg-zinc-900 dark:has-[:checked]:border-brand">
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
        </fieldset>
      )}

      {!lockKind ? null : (
        <div className="flex items-center gap-2 rounded-xl border border-brand/20 bg-brand-soft/30 px-3 py-2 text-sm text-zinc-800 dark:border-brand/30 dark:bg-brand/10 dark:text-zinc-200">
          <span className="rounded-md bg-white/80 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-brand dark:bg-zinc-900/80 dark:text-accent">
            {catalogKindLabel(defaultKind)}
          </span>
          <span className="text-zinc-600 dark:text-zinc-400">
            {isService
              ? "Solo se guardará como servicio. Cambia de pestaña en el catálogo para productos."
              : "Solo se guardará como producto. Cambia de pestaña en el catálogo para servicios."}
          </span>
        </div>
      )}

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-zinc-800 dark:text-zinc-200">
          Nombre <span className="text-red-600">*</span>
        </span>
        <input name="name" required className={inputClass} placeholder={isService ? "Ej. Pack mantenimiento mensual" : "Ej. Licencia software anual"} />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-zinc-800 dark:text-zinc-200">Descripción</span>
        <textarea name="description" rows={3} className={`${inputClass} resize-y`} placeholder="Detalle opcional para facturas o notas internas" />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
          <span className="font-medium text-zinc-800 dark:text-zinc-200">
            {isService ? "Referencia interna" : "SKU o referencia"}{" "}
            <span className="font-normal text-zinc-500">(opcional)</span>
          </span>
          <input
            name="sku"
            className={inputClass}
            placeholder={isService ? "Ej. SRV-CONS-01" : "Ej. EAN, código almacén…"}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-zinc-800 dark:text-zinc-200">
            Precio unitario (€) <span className="text-red-600">*</span>
          </span>
          <input
            name="unit_price"
            required
            inputMode="decimal"
            placeholder="0,00"
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-zinc-800 dark:text-zinc-200">IVA (%)</span>
          <input
            name="tax_rate"
            inputMode="decimal"
            placeholder="21"
            defaultValue="21"
            className={inputClass}
          />
        </label>
      </div>

      <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-zinc-200/80 bg-zinc-50/40 px-3 py-2.5 text-sm dark:border-zinc-700/80 dark:bg-zinc-800/30">
        <input
          type="checkbox"
          name="is_active"
          defaultChecked
          className="size-4 rounded border-zinc-300 text-brand focus:ring-brand/40"
        />
        <span className="text-zinc-800 dark:text-zinc-200">Visible y disponible en facturas</span>
      </label>

      <button
        type="submit"
        disabled={pending}
        className="mt-1 inline-flex h-11 items-center justify-center rounded-xl bg-brand px-5 text-sm font-semibold text-brand-fg shadow-sm transition hover:bg-brand-hover disabled:opacity-60"
      >
        {pending ? "Guardando…" : `Guardar ${catalogKindLabel(defaultKind).toLowerCase()}`}
      </button>
    </form>
  );
}
