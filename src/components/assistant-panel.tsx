"use client";

import { AssistantChat } from "@/components/assistant-chat";

export function AssistantPanel() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-4 py-8 sm:px-6">
      <div className="rounded-2xl border border-brand/25 bg-gradient-to-br from-brand-soft/50 via-white to-white p-5 shadow-sm dark:border-brand/35 dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-900/80">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent dark:text-sky-300">Asistente</p>
        <h2 className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Preguntas de facturacion en lenguaje natural
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          Consulta clientes, cobros y facturas en segundos. Respondo con datos de tu cuenta y te dejo enlaces
          directos a la ficha del cliente o la factura.
        </p>
      </div>
      <AssistantChat />
    </div>
  );
}
