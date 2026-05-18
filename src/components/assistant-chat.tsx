"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { assistantAskAction, type AssistantActionState } from "@/app/actions/assistant";

const initial: AssistantActionState = {};

const DEFAULT_SUGGESTIONS = [
  "Que cliente me debe mas dinero?",
  "Resume mi facturacion de este mes",
  "Cuales son mis facturas vencidas?",
  "Lista mis clientes",
];

type ChatEntry = {
  id: string;
  role: "user" | "assistant";
  text: string;
  links?: { label: string; href: string }[];
};

export function AssistantChat({
  suggestions,
  compact = false,
  initialQuestion,
}: {
  suggestions?: string[];
  compact?: boolean;
  initialQuestion?: string;
}) {
  const [state, formAction, isPending] = useActionState(assistantAskAction, initial);
  const [history, setHistory] = useState<ChatEntry[]>([]);
  const [draft, setDraft] = useState(initialQuestion ?? "");
  const formRef = useRef<HTMLFormElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const options = useMemo(
    () => (suggestions && suggestions.length > 0 ? suggestions : DEFAULT_SUGGESTIONS),
    [suggestions],
  );

  useEffect(() => {
    if (!state.ok || !state.text) return;
    const assistantText = state.text;
    setHistory((h) => [
      ...h,
      {
        id: `a-${Date.now()}`,
        role: "assistant",
        text: assistantText,
        links: state.links,
      },
    ]);
  }, [state.ok, state.text, state.links]);

  useEffect(() => {
    const box = messagesRef.current;
    if (!box) return;
    box.scrollTop = box.scrollHeight;
  }, [history, isPending]);

  function submitQuestion(question: string) {
    const q = question.trim();
    if (!q || isPending) return;
    setDraft(q);
    requestAnimationFrame(() => formRef.current?.requestSubmit());
  }

  return (
    <div className="flex min-h-[22rem] flex-1 flex-col gap-3 rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80">
      <div className="flex items-center justify-between border-b border-zinc-200/80 pb-3 dark:border-zinc-700/80">
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">Conversacion</p>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Activo
        </span>
      </div>

      <div
        ref={messagesRef}
        className={`flex flex-1 flex-col gap-4 overflow-y-auto pr-1 ${compact ? "max-h-[22rem]" : "max-h-[30rem]"}`}
      >
        {history.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/70 p-5 text-sm text-zinc-600 dark:border-zinc-600 dark:bg-zinc-800/30 dark:text-zinc-300">
            <p className="font-medium text-zinc-800 dark:text-zinc-100">Empieza con algo como:</p>
            <ul className="mt-2 space-y-1 text-sm">
              {options.slice(0, 3).map((q) => (
                <li key={q}>- {q}</li>
              ))}
            </ul>
          </div>
        ) : (
          <ul className="flex flex-col gap-4">
            {history.map((entry) => (
              <li
                key={entry.id}
                className={
                  entry.role === "user"
                    ? "ml-auto w-fit max-w-[85%] rounded-2xl bg-brand px-3.5 py-2.5 text-sm text-brand-fg shadow-sm"
                    : "mr-auto max-w-[92%] rounded-2xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm leading-relaxed text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-200"
                }
              >
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  {entry.role === "user" ? "Tu" : "Asistente"}
                </p>
                <p className="whitespace-pre-wrap">{entry.text}</p>
                {entry.links && entry.links.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {entry.links.map((l) => (
                      <Link
                        key={l.href}
                        href={l.href}
                        className="inline-flex items-center rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 hover:border-brand-border hover:bg-brand-soft hover:text-accent dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-200"
                      >
                        {l.label}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      {isPending ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400" aria-live="polite">
          Consultando tus datos...
        </p>
      ) : null}

      {state.error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {state.error}
        </p>
      ) : null}

      <form
        ref={formRef}
        action={formAction}
        className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/70"
        onSubmit={(e) => {
          const fd = new FormData(e.currentTarget);
          const q = fd.get("question")?.toString().trim();
          if (!q) {
            e.preventDefault();
            return;
          }
          setHistory((h) => [...h, { id: `u-${Date.now()}`, role: "user", text: q }]);
        }}
      >
        <label htmlFor={`assistant-question-${compact ? "compact" : "page"}`} className="sr-only">
          Pregunta
        </label>
        <textarea
          id={`assistant-question-${compact ? "compact" : "page"}`}
          name="question"
          rows={compact ? 2 : 3}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder='Ej.: "Que cliente me debe mas?" o "Ultima factura de Acme"'
          disabled={isPending}
          className="min-h-[4.5rem] w-full resize-y rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
          autoComplete="off"
        />
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex min-h-10 items-center justify-center rounded-xl bg-brand px-4 text-sm font-medium text-brand-fg hover:bg-brand-hover disabled:opacity-60"
          >
            {isPending ? "Pensando..." : "Preguntar"}
          </button>
          <button
            type="button"
            disabled={isPending}
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-zinc-200 px-3 text-sm text-zinc-600 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
            onClick={() => {
              setHistory([]);
              setDraft("");
            }}
          >
            Limpiar chat
          </button>
        </div>
      </form>

      <div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/70">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Preguntas sugeridas
        </p>
        <div className="flex flex-wrap gap-2">
          {options.map((q) => (
            <button
              key={q}
              type="button"
              disabled={isPending}
              className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-600 hover:border-brand-border hover:bg-brand-soft dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300"
              onClick={() => submitQuestion(q)}
            >
              {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
