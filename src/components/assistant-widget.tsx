"use client";

import { useEffect, useState } from "react";
import { AssistantChat } from "@/components/assistant-chat";

const EVENT_NAME = "tfg:open-assistant";

export function openAssistantWidget(payload?: { question?: string; source?: string }) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: payload ?? {} }));
}

export function AssistantWidget() {
  const [open, setOpen] = useState(false);
  const [initialQuestion, setInitialQuestion] = useState<string | undefined>(undefined);

  useEffect(() => {
    function onOpen(event: Event) {
      const detail = (event as CustomEvent<{ question?: string }>).detail;
      setInitialQuestion(detail?.question?.trim() || undefined);
      setOpen(true);
    }
    window.addEventListener(EVENT_NAME, onOpen);
    return () => window.removeEventListener(EVENT_NAME, onOpen);
  }, []);

  return (
    <>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-40 inline-flex h-12 items-center gap-2 rounded-full bg-brand px-4 text-sm font-semibold text-brand-fg shadow-xl transition hover:scale-[1.02] hover:bg-brand-hover"
          aria-label="Abrir asistente"
        >
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-xs">
            IA
          </span>
          Preguntar
        </button>
      ) : (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-zinc-900/35 backdrop-blur-[1px]"
            onClick={() => setOpen(false)}
            aria-label="Cerrar asistente"
          />
          <aside className="fixed bottom-4 right-4 z-50 flex h-[min(82vh,44rem)] w-[min(96vw,32rem)] flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-background shadow-2xl dark:border-zinc-700">
            <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-accent dark:text-sky-300">
                  Copilot de facturacion
                </p>
                <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">Asistente rapido</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                aria-label="Cerrar"
              >
                X
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden p-3">
              <AssistantChat
                compact
                initialQuestion={initialQuestion}
                suggestions={[
                  "Que facturas vencen esta semana?",
                  "Que cliente me debe mas?",
                  "Abrir facturas pendientes",
                  "Resumen de cobros del mes",
                ]}
              />
            </div>
          </aside>
        </>
      )}
    </>
  );
}
