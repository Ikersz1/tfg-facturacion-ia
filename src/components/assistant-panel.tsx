"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { assistantAskAction, type AssistantActionState } from "@/app/actions/assistant";

const initial: AssistantActionState = {};

const SUGGESTIONS = [
  "¿Qué cliente me debe más dinero?",
  "Resume mi facturación de este mes",
  "¿Cuáles son mis facturas vencidas?",
  "Lista mis clientes",
];

type ChatEntry = {
  id: string;
  role: "user" | "assistant";
  text: string;
  links?: { label: string; href: string }[];
};

export function AssistantPanel({ llmConfigured }: { llmConfigured: boolean }) {
  const [state, formAction, isPending] = useActionState(assistantAskAction, initial);
  const [history, setHistory] = useState<ChatEntry[]>([]);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state.ok || !state.text) return;
    setHistory((h) => [
      ...h,
      {
        id: `a-${Date.now()}`,
        role: "assistant",
        text: state.text!,
        links: state.links,
      },
    ]);
  }, [state.ok, state.text, state.links]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-8 sm:px-6">
      <div className="rounded-xl border border-zinc-200/90 bg-zinc-50/50 px-4 py-3 text-xs leading-relaxed text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400">
        Las respuestas se calculan en el servidor con tus datos (misma sesión que el panel). No se envían NIF,
        direcciones ni líneas de factura al proveedor de IA; solo agregados (nombres comerciales, importes, números
        de factura).
        {!llmConfigured ? (
          <span className="mt-1 block text-amber-800 dark:text-amber-200">
            Modo local: sin OPENAI_API_KEY se usan reglas fijas; añade la clave para entender preguntas más variadas.
          </span>
        ) : null}
      </div>

      <div className="flex min-h-[12rem] flex-1 flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80">
        {history.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Pregunta en lenguaje natural sobre clientes, deudas o facturas.
          </p>
        ) : (
          <ul className="flex flex-col gap-4">
            {history.map((entry) => (
              <li
                key={entry.id}
                className={
                  entry.role === "user"
                    ? "ml-6 rounded-xl bg-brand-soft/60 px-3 py-2 text-sm text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                    : "mr-4 text-sm leading-relaxed text-zinc-800 dark:text-zinc-200"
                }
              >
                {entry.role === "user" ? (
                  <p className="font-medium text-accent dark:text-sky-300">Tú</p>
                ) : (
                  <p className="mb-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">Asistente</p>
                )}
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

        {isPending ? (
          <p className="text-xs text-zinc-500 dark:text-zinc-400" aria-live="polite">
            Consultando tus datos…
          </p>
        ) : null}

        {state.error ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {state.error}
          </p>
        ) : null}
      </div>

      <form
        ref={formRef}
        action={formAction}
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          const fd = new FormData(e.currentTarget);
          const q = fd.get("question")?.toString().trim();
          if (q) {
            setHistory((h) => [...h, { id: `u-${Date.now()}`, role: "user", text: q }]);
          }
        }}
      >
        <label htmlFor="assistant-question" className="sr-only">
          Pregunta
        </label>
        <textarea
          id="assistant-question"
          name="question"
          rows={2}
          placeholder='Ej.: "¿Quién me debe más?" o "Última factura de Acme"'
          disabled={isPending}
          className="min-h-[4.5rem] w-full resize-y rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
          autoComplete="off"
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex min-h-10 items-center justify-center rounded-xl bg-brand px-4 text-sm font-medium text-brand-fg hover:bg-brand-hover disabled:opacity-60"
          >
            {isPending ? "Pensando…" : "Preguntar"}
          </button>
          <button
            type="button"
            disabled={isPending}
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-zinc-200 px-3 text-sm text-zinc-600 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
            onClick={() => {
              setHistory([]);
              formRef.current?.reset();
            }}
          >
            Limpiar chat
          </button>
        </div>
      </form>

      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            disabled={isPending}
            className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-600 hover:border-brand-border hover:bg-brand-soft dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300"
            onClick={() => {
              const ta = formRef.current?.querySelector<HTMLTextAreaElement>("#assistant-question");
              if (ta) ta.value = s;
            }}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
