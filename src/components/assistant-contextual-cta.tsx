"use client";

import { OpenAssistantButton } from "@/components/open-assistant-button";

export function AssistantContextualCta({
  questions,
  source,
  title = "Preguntar al asistente",
}: {
  questions: string[];
  source: string;
  title?: string;
}) {
  if (questions.length === 0) return null;

  return (
    <div className="rounded-xl border border-brand/20 bg-gradient-to-r from-brand-soft/40 to-white px-4 py-3 dark:border-brand/30 dark:from-zinc-900 dark:to-zinc-900/80">
      <p className="text-xs font-semibold uppercase tracking-wide text-accent dark:text-sky-300">
        {title}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {questions.map((q) => (
          <OpenAssistantButton
            key={q}
            question={q}
            source={source}
            className="rounded-full border border-zinc-200/90 bg-white px-3 py-1.5 text-left text-xs font-medium text-zinc-700 shadow-sm transition hover:border-brand/40 hover:bg-brand-soft/60 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:border-brand/50"
          >
            {q}
          </OpenAssistantButton>
        ))}
      </div>
    </div>
  );
}
