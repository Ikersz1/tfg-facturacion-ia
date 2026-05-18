"use client";

import { OpenAssistantButton } from "@/components/open-assistant-button";

const QUICK_ASK = [
  "Que cliente me debe mas?",
  "Que facturas vencen esta semana?",
  "Abrir facturas pendientes",
];

export function HomeAssistantCta() {
  return (
    <section className="rounded-2xl border border-brand/25 bg-gradient-to-r from-brand-soft/70 via-white to-white p-5 shadow-sm dark:border-brand/35 dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-900/80">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-accent dark:text-sky-300">
            Copilot
          </p>
          <h2 className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Haz una pregunta y te llevo directo
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Ahorra clicks: consulta deuda, vencimientos o abre listados filtrados desde aqui.
          </p>
        </div>
        <OpenAssistantButton
          source="home_cta"
          className="inline-flex h-10 items-center justify-center rounded-xl bg-brand px-4 text-sm font-semibold text-brand-fg shadow-sm hover:bg-brand-hover"
        >
          Preguntar ahora
        </OpenAssistantButton>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {QUICK_ASK.map((question) => (
          <OpenAssistantButton
            key={question}
            question={question}
            source="home_suggestion"
            className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-600 hover:border-brand-border hover:bg-brand-soft dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300"
          >
            {question}
          </OpenAssistantButton>
        ))}
      </div>
    </section>
  );
}
