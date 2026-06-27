"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AssistantChat } from "@/components/assistant-chat";

const EVENT_NAME = "tfg:open-assistant";

export function openAssistantWidget(payload?: { question?: string; source?: string }) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(EVENT_NAME, {
      detail: { ...(payload ?? {}), requestId: Date.now() },
    }),
  );
}

export function AssistantWidget() {
  const [open, setOpen] = useState(false);
  const [pendingQuestion, setPendingQuestion] = useState<string | undefined>(undefined);
  const [pendingQuestionRequestId, setPendingQuestionRequestId] = useState<number | undefined>(undefined);
  const panelRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setPendingQuestion(undefined);
  }, []);

  useEffect(() => {
    function onOpen(event: Event) {
      const detail = (event as CustomEvent<{ question?: string; requestId?: number }>).detail;
      setPendingQuestion(detail?.question?.trim() || undefined);
      setPendingQuestionRequestId(detail?.requestId ?? Date.now());
      setOpen(true);
    }
    window.addEventListener(EVENT_NAME, onOpen);
    return () => window.removeEventListener(EVENT_NAME, onOpen);
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && open) close();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* FAB — visible cuando el panel está cerrado */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`fixed bottom-5 right-5 z-40 inline-flex items-center gap-2.5 rounded-full bg-gradient-to-br from-brand to-brand-hover px-4 py-3 text-sm font-semibold text-brand-fg shadow-xl transition hover:scale-[1.03] hover:shadow-2xl sm:bottom-6 sm:right-6 ${
          open ? "pointer-events-none scale-90 opacity-0" : "opacity-100"
        }`}
        aria-label="Abrir asistente de facturación"
        tabIndex={open ? -1 : 0}
      >
        <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z"
          />
        </svg>
        Preguntar
      </button>

      {/* Overlay */}
      <button
        type="button"
        aria-label="Cerrar asistente"
        onClick={close}
        className={`fixed inset-0 z-40 bg-zinc-900/40 backdrop-blur-[2px] transition-opacity duration-300 lg:bg-zinc-900/25 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        tabIndex={open ? 0 : -1}
      />

      {/* Panel lateral — altura completa, entra desde la derecha */}
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Asistente de facturación"
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-[100vw] flex-col bg-white shadow-2xl transition-transform duration-300 ease-out dark:bg-zinc-900 sm:w-[420px] ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Cabecera */}
        <div className="flex shrink-0 items-center justify-between bg-gradient-to-r from-brand to-brand-hover px-5 py-4 text-brand-fg">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold">Asistente</p>
              <p className="text-[11px] text-white/70">Facturación · consultas y acciones</p>
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            className="rounded-lg p-2 text-white/90 transition hover:bg-white/15"
            aria-label="Cerrar"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Chat — ocupa el resto del panel */}
        <div className="flex min-h-0 flex-1 flex-col">
          <AssistantChat
            mode="sidebar"
            initialQuestion={pendingQuestion}
            initialQuestionToken={pendingQuestionRequestId}
            onInitialQuestionConsumed={() => setPendingQuestion(undefined)}
            suggestions={[
              "¿Qué cliente me debe más?",
              "¿Qué facturas vencen esta semana?",
              "Abrir facturas pendientes",
              "Resume mi facturación de este mes",
            ]}
          />
        </div>
      </aside>
    </>
  );
}
