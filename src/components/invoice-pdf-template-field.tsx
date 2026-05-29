"use client";

import { useState } from "react";
import {
  INVOICE_PDF_TEMPLATE_IDS,
  INVOICE_PDF_TEMPLATE_LABELS,
  type InvoicePdfTemplateId,
} from "@/lib/invoice-pdf/template-id";

const inputClass =
  "rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50";

export function InvoicePdfTemplateField({
  initialTemplate,
}: {
  initialTemplate: InvoicePdfTemplateId;
}) {
  const [template, setTemplate] = useState<InvoicePdfTemplateId>(initialTemplate);
  const previewUrl = `/api/invoice-pdf/preview?template=${template}`;

  return (
    <div className="flex flex-col gap-4">
      <select
        name="invoice_pdf_template"
        value={template}
        onChange={(e) => setTemplate(e.target.value as InvoicePdfTemplateId)}
        className={`${inputClass} text-sm`}
      >
        {INVOICE_PDF_TEMPLATE_IDS.map((id) => (
          <option key={id} value={id}>
            {INVOICE_PDF_TEMPLATE_LABELS[id].title} —{" "}
            {INVOICE_PDF_TEMPLATE_LABELS[id].description}
          </option>
        ))}
      </select>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Vista previa (factura de ejemplo con tus datos fiscales guardados)
          </p>
          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-brand hover:underline"
          >
            Abrir en nueva pestaña
          </a>
        </div>
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800/60">
          <iframe
            key={template}
            title={`Vista previa plantilla ${INVOICE_PDF_TEMPLATE_LABELS[template].title}`}
            src={previewUrl}
            className="h-[min(520px,70vh)] w-full bg-white"
          />
        </div>
      </div>
    </div>
  );
}
