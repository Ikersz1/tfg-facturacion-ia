"use client";

import { useActionState, useState } from "react";
import {
  createProductAction,
  updateProductAction,
  type ProductActionState,
} from "@/app/actions/products";
import { catalogKindLabel, type CatalogKind } from "@/lib/catalog-kind";

const initial: ProductActionState = {};

const inputClass =
  "rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-1 focus:ring-zinc-300 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500 dark:focus:ring-zinc-600";

type Props = {
  defaultKind?: CatalogKind;
  /** Desde el catálogo: el tipo viene de la pestaña; no mostrar selector producto/servicio */
  lockKind?: boolean;
  mode?: "create" | "edit";
  productId?: string;
  initialValues?: {
    name?: string;
    description?: string | null;
    sku?: string | null;
    unitPrice?: number;
    taxRate?: number;
    isActive?: boolean;
  };
};

export function ProductForm({
  defaultKind = "product",
  lockKind = true,
  mode = "create",
  productId,
  initialValues,
}: Props) {
  const [state, formAction, pending] = useActionState(
    mode === "edit" ? updateProductAction : createProductAction,
    initial,
  );
  const [kind, setKind] = useState<CatalogKind>(defaultKind);
  const displayKind = lockKind ? defaultKind : kind;
  const isService = displayKind === "service";

  return (
    <form
      action={formAction}
      className="mx-auto flex w-full max-w-lg flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900"
    >
      {mode === "edit" ? <input type="hidden" name="product_id" value={productId ?? ""} /> : null}
      {state?.error ? (
        <p
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-100"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}

      {lockKind ? (
        <input type="hidden" name="kind" value={defaultKind} />
      ) : (
        <fieldset className="flex flex-col gap-2 rounded-md border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800/40">
          <legend className="px-0.5 text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Tipo en catálogo
          </legend>
          <div className="flex flex-wrap gap-3">
            <label className="flex cursor-pointer items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm has-[:checked]:border-zinc-400 dark:border-zinc-600 dark:bg-zinc-900">
              <input
                type="radio"
                name="kind"
                value="product"
                checked={kind === "product"}
                onChange={() => setKind("product")}
                className="size-4 border-zinc-300 text-brand focus:ring-brand/40"
              />
              <span className="text-zinc-800 dark:text-zinc-100">Producto</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm has-[:checked]:border-zinc-400 dark:border-zinc-600 dark:bg-zinc-900">
              <input
                type="radio"
                name="kind"
                value="service"
                checked={kind === "service"}
                onChange={() => setKind("service")}
                className="size-4 border-zinc-300 text-brand focus:ring-brand/40"
              />
              <span className="text-zinc-800 dark:text-zinc-100">Servicio</span>
            </label>
          </div>
        </fieldset>
      )}

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-zinc-800 dark:text-zinc-200">
          Nombre <span className="text-red-600">*</span>
        </span>
        <input
          name="name"
          required
          className={inputClass}
          placeholder={isService ? "Ej. Pack mantenimiento mensual" : "Ej. Licencia software anual"}
          defaultValue={initialValues?.name ?? ""}
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-zinc-800 dark:text-zinc-200">Descripción</span>
        <textarea
          name="description"
          rows={3}
          className={`${inputClass} resize-y`}
          placeholder="Detalle opcional para facturas o notas internas"
          defaultValue={initialValues?.description ?? ""}
        />
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
            defaultValue={initialValues?.sku ?? ""}
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
            defaultValue={
              typeof initialValues?.unitPrice === "number" ? String(initialValues.unitPrice) : undefined
            }
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-zinc-800 dark:text-zinc-200">IVA (%)</span>
          <input
            name="tax_rate"
            inputMode="decimal"
            placeholder="21"
            defaultValue={
              typeof initialValues?.taxRate === "number" ? String(initialValues.taxRate) : "21"
            }
            className={inputClass}
          />
        </label>
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-800 dark:text-zinc-200">
        <input
          type="checkbox"
          name="is_active"
          defaultChecked={initialValues?.isActive ?? true}
          className="size-4 rounded border-zinc-300 text-brand"
        />
        Activo en facturas
      </label>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-10 items-center justify-center rounded-md bg-brand px-4 text-sm font-medium text-brand-fg transition hover:bg-brand-hover disabled:opacity-60"
      >
        {pending
          ? "Guardando…"
          : mode === "edit"
            ? "Guardar cambios"
            : `Guardar ${catalogKindLabel(displayKind).toLowerCase()}`}
      </button>
    </form>
  );
}
