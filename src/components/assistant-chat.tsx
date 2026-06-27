"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { assistantAskAction, type AssistantActionState } from "@/app/actions/assistant";
import {
  clearAssistantChatHistory,
  loadAssistantChatSnapshot,
  saveAssistantChatSnapshot,
  type StoredChatEntry,
} from "@/lib/assistant/chat-storage";
import type { PaymentChoice, PendingPaymentSession } from "@/lib/assistant/types";

const initial: AssistantActionState = {};

const DEFAULT_SUGGESTIONS = [
  "¿Qué cliente me debe más dinero?",
  "Facturas que vencen esta semana",
  "Compara mi facturación con el mes pasado",
  "¿Cuántos clientes tengo?",
];

type ChatEntry = StoredChatEntry;

export function AssistantChat({
  suggestions,
  mode = "page",
  initialQuestion,
  initialQuestionToken,
  onInitialQuestionConsumed,
}: {
  suggestions?: string[];
  mode?: "page" | "sidebar";
  initialQuestion?: string;
  initialQuestionToken?: number;
  onInitialQuestionConsumed?: () => void;
}) {
  const isSidebar = mode === "sidebar";
  const [state, formAction, isPending] = useActionState(assistantAskAction, initial);
  const [history, setHistory] = useState<ChatEntry[]>([]);
  const [pendingPayment, setPendingPayment] = useState<PendingPaymentSession | null>(null);
  const [paymentChoices, setPaymentChoices] = useState<PaymentChoice[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [draft, setDraft] = useState("");
  const [listening, setListening] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const lastHandledInitialToken = useRef<number | undefined>(undefined);
  const queuedAutoSubmitQuestion = useRef<string | null>(null);
  const speechSupported = useMemo(() => {
    if (typeof window === "undefined") return false;
    const w = window as Window & {
      SpeechRecognition?: new () => { start(): void };
      webkitSpeechRecognition?: new () => { start(): void };
    };
    return Boolean(w.SpeechRecognition ?? w.webkitSpeechRecognition);
  }, []);
  const options = useMemo(
    () => (suggestions && suggestions.length > 0 ? suggestions : DEFAULT_SUGGESTIONS),
    [suggestions],
  );

  useEffect(() => {
    const snap = loadAssistantChatSnapshot();
    setHistory(snap.history);
    setPendingPayment(snap.pendingPayment ?? null);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveAssistantChatSnapshot({ history, pendingPayment });
  }, [history, pendingPayment, hydrated]);

  useEffect(() => {
    if (!state.ok || !state.text) return;
    const assistantText = state.text;
    if (state.pendingPayment !== undefined) {
      setPendingPayment(state.pendingPayment);
    }
    setPaymentChoices(state.paymentChoices ?? []);
    setHistory((h) => [
      ...h,
      {
        id: `a-${Date.now()}`,
        role: "assistant",
        text: assistantText,
        links: state.links,
      },
    ]);
  }, [state.ok, state.text, state.links, state.pendingPayment, state.paymentChoices]);

  useEffect(() => {
    const box = messagesRef.current;
    if (!box) return;
    box.scrollTop = box.scrollHeight;
  }, [history, isPending]);

  useEffect(() => {
    if (!hydrated || !initialQuestion?.trim() || initialQuestionToken === undefined) return;
    if (lastHandledInitialToken.current === initialQuestionToken) return;
    lastHandledInitialToken.current = initialQuestionToken;
    const q = initialQuestion.trim();
    setDraft(q);
    queuedAutoSubmitQuestion.current = q;
    setHistory((h) => [...h, { id: `u-init-${initialQuestionToken}`, role: "user", text: q }]);
    requestAnimationFrame(() => formRef.current?.requestSubmit());
    onInitialQuestionConsumed?.();
  }, [hydrated, initialQuestion, initialQuestionToken, onInitialQuestionConsumed]);

  function submitQuestion(question: string) {
    const q = question.trim();
    if (!q || isPending) return;
    setDraft(q);
    queuedAutoSubmitQuestion.current = q;
    setHistory((h) => [...h, { id: `u-${Date.now()}`, role: "user", text: q }]);
    requestAnimationFrame(() => formRef.current?.requestSubmit());
  }

  function clearConversation() {
    clearAssistantChatHistory();
    setHistory([]);
    setPendingPayment(null);
    setPaymentChoices([]);
    setDraft("");
    queuedAutoSubmitQuestion.current = null;
    lastHandledInitialToken.current = undefined;
  }

  function startVoiceInput() {
    if (!speechSupported || listening) return;
    const w = window as Window & {
      SpeechRecognition?: new () => {
        lang: string;
        interimResults: boolean;
        maxAlternatives: number;
        onresult: ((event: { results: { [key: number]: { [key: number]: { transcript?: string } } } }) => void) | null;
        onerror: (() => void) | null;
        onend: (() => void) | null;
        start(): void;
      };
      webkitSpeechRecognition?: new () => {
        lang: string;
        interimResults: boolean;
        maxAlternatives: number;
        onresult: ((event: { results: { [key: number]: { [key: number]: { transcript?: string } } } }) => void) | null;
        onerror: (() => void) | null;
        onend: (() => void) | null;
        start(): void;
      };
    };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = "es-ES";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    setListening(true);
    rec.onresult = (event) => {
      const text = event.results[0]?.[0]?.transcript?.trim();
      if (text) setDraft(text);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    rec.start();
  }

  const messagesArea = (
    <div
      ref={messagesRef}
      className={`flex flex-1 flex-col gap-3 overflow-y-auto ${
        isSidebar ? "bg-zinc-50/80 px-5 py-4 dark:bg-zinc-950/50" : "max-h-[30rem] pr-1"
      }`}
    >
      {history.length > 0 && isSidebar ? (
        <div className="mb-2 flex justify-end gap-3">
          {pendingPayment ? (
            <span className="text-xs text-amber-700 dark:text-amber-300">Cobro pendiente de confirmar</span>
          ) : null}
          <button
            type="button"
            onClick={clearConversation}
            className="text-xs font-medium text-zinc-500 underline-offset-2 hover:text-zinc-700 hover:underline dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            Borrar conversación
          </button>
        </div>
      ) : null}
      {history.length === 0 && !isPending ? (
        <div className="py-4 text-center">
          <div
            className={`mx-auto mb-4 flex items-center justify-center rounded-2xl bg-brand-soft ${
              isSidebar ? "h-14 w-14" : "h-12 w-12"
            }`}
          >
            <svg
              className="h-7 w-7 text-brand dark:text-accent"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z"
              />
            </svg>
          </div>
          <p className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            ¿En qué te ayudo?
          </p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Pregunta por deudas, facturas o pide abrir un listado filtrado.
          </p>
          {isSidebar ? (
            <div className="mt-5 flex flex-col gap-2">
              {options.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => submitQuestion(q)}
                  className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-left text-sm text-zinc-700 transition hover:border-brand-border hover:bg-brand-soft dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200"
                >
                  {q}
                </button>
              ))}
            </div>
          ) : (
            <ul className="mt-4 space-y-1 text-left text-sm text-zinc-600 dark:text-zinc-400">
              {options.slice(0, 3).map((q) => (
                <li key={q}>· {q}</li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {history.map((entry) => (
            <li
              key={entry.id}
              className={`flex ${entry.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {entry.role === "assistant" && isSidebar ? (
                <div className="mr-2 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-soft">
                  <svg
                    className="h-3.5 w-3.5 text-brand dark:text-accent"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z"
                    />
                  </svg>
                </div>
              ) : null}
              <div
                className={
                  entry.role === "user"
                    ? `max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
                        isSidebar
                          ? "rounded-br-md bg-brand text-brand-fg"
                          : "bg-brand text-brand-fg"
                      }`
                    : `max-w-[85%] rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm leading-relaxed text-zinc-800 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 ${
                        isSidebar ? "rounded-bl-md" : ""
                      }`
                }
              >
                {!isSidebar ? (
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    {entry.role === "user" ? "Tú" : "Asistente"}
                  </p>
                ) : null}
                <p className="whitespace-pre-wrap">{entry.text}</p>
                {entry.links && entry.links.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {entry.links.map((l) => (
                      <Link
                        key={l.href}
                        href={l.href}
                        className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
                          entry.role === "user"
                            ? "border-white/30 bg-white/15 text-brand-fg hover:bg-white/25"
                            : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-brand-border hover:bg-brand-soft hover:text-accent dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
                        }`}
                      >
                        {l.label}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            </li>
          ))}
          {isPending ? (
            <li className="flex justify-start">
              <div className="mr-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-soft">
                <svg
                  className="h-3.5 w-3.5 text-brand"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z"
                  />
                </svg>
              </div>
              <div className="rounded-2xl rounded-bl-md border border-zinc-200 bg-white px-4 py-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
                <div className="flex gap-1">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-300 [animation-delay:0ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-300 [animation-delay:150ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-300 [animation-delay:300ms]" />
                </div>
              </div>
            </li>
          ) : null}
        </ul>
      )}
    </div>
  );

  const paymentPicker =
    paymentChoices.length > 0 ? (
      <div
        className={`flex flex-wrap gap-2 border-t border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900 ${
          isSidebar ? "px-5 py-3" : "p-3"
        }`}
      >
        <p className="w-full text-xs font-medium text-zinc-500 dark:text-zinc-400">
          Elige factura para el cobro:
        </p>
        {paymentChoices.map((c) => (
          <button
            key={c.invoiceId}
            type="button"
            disabled={isPending}
            onClick={() => submitQuestion(String(c.index))}
            className="rounded-lg border border-brand/30 bg-brand-soft/50 px-3 py-1.5 text-xs font-semibold text-zinc-800 transition hover:bg-brand-soft dark:border-brand/40 dark:text-zinc-100"
          >
            {c.label}
          </button>
        ))}
        <button
          type="button"
          disabled={isPending}
          onClick={() => submitQuestion("cancelar")}
          className="rounded-lg px-2 py-1.5 text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          Cancelar
        </button>
      </div>
    ) : null;

  const inputArea = (
    <form
      ref={formRef}
      action={formAction}
      className={`shrink-0 border-t border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900 ${
        isSidebar ? "px-5 py-4" : "rounded-2xl border p-3 shadow-sm dark:bg-zinc-900/70"
      }`}
      onSubmit={(e) => {
        const fd = new FormData(e.currentTarget);
        const q = (fd.get("question")?.toString().trim() || queuedAutoSubmitQuestion.current || "").trim();
        if (!q) {
          e.preventDefault();
          return;
        }
        queuedAutoSubmitQuestion.current = null;
        setHistory((h) => {
          const last = h[h.length - 1];
          if (last?.role === "user" && last.text === q) return h;
          return [...h, { id: `u-${Date.now()}`, role: "user", text: q }];
        });
        setDraft("");
      }}
    >
      <input
        type="hidden"
        name="context"
        value={JSON.stringify({ pendingPayment })}
        readOnly
      />
      <label htmlFor={`assistant-q-${mode}`} className="sr-only">
        Pregunta
      </label>
      <div className={`flex items-center gap-2 ${isSidebar ? "" : "flex-col"}`}>
        <input
          id={`assistant-q-${mode}`}
          name="question"
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Escribe tu pregunta..."
          disabled={isPending}
          className={`flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100 ${
            isSidebar ? "" : "w-full"
          }`}
          autoComplete="off"
        />
        {speechSupported ? (
          <button
            type="button"
            disabled={isPending}
            onClick={startVoiceInput}
            className={`inline-flex shrink-0 items-center justify-center rounded-xl border p-3 transition disabled:opacity-40 ${
              listening
                ? "border-brand bg-brand-soft text-brand dark:text-accent"
                : "border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-300"
            }`}
            aria-label="Dictar pregunta"
            title="Dictar pregunta"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3" />
            </svg>
          </button>
        ) : null}
        <button
          type="submit"
          disabled={isPending || !draft.trim()}
          className="inline-flex shrink-0 items-center justify-center rounded-xl bg-brand p-3 text-brand-fg transition hover:bg-brand-hover disabled:opacity-40"
          aria-label="Enviar"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m5 12 7-7 7 7M12 19V5" />
          </svg>
        </button>
      </div>
      {state.error ? (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );

  if (isSidebar) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        {messagesArea}
        {paymentPicker}
        {inputArea}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80">
      <div className="flex items-center justify-between border-b border-zinc-200/80 pb-3 dark:border-zinc-700/80">
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">Conversación</p>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Activo
        </span>
      </div>
      {messagesArea}
      {paymentPicker}
      {inputArea}
      <div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/70">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">Preguntas sugeridas</p>
        <div className="flex flex-wrap gap-2">
          {options.map((q) => (
            <button
              key={q}
              type="button"
              disabled={isPending}
              onClick={() => submitQuestion(q)}
              className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-600 hover:border-brand-border hover:bg-brand-soft dark:border-zinc-600 dark:bg-zinc-900"
            >
              {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
