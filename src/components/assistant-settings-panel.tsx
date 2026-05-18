"use client";

import { OpenAssistantButton } from "@/components/open-assistant-button";

const EXAMPLE_QUESTIONS = [
  "¿Cuántos clientes tengo?",
  "Facturas que vencen esta semana",
  "Compara mi facturación con el mes pasado",
  "Abrir facturas vencidas",
  "Genera un recordatorio de cobro para",
] as const;

export function AssistantSettingsPanel({ openAiEnabled }: { openAiEnabled: boolean }) {
  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Estado</h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          {openAiEnabled ? (
            <>
              <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700 dark:text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
                OpenAI activo
              </span>
              {" — "}
              entiende preguntas más variadas. Los datos de negocio siguen consultándose solo en el servidor.
            </>
          ) : (
            <>
              <span className="inline-flex items-center gap-1.5 font-medium text-zinc-700 dark:text-zinc-300">
                <span className="h-2 w-2 rounded-full bg-zinc-400" aria-hidden />
                Modo local
              </span>
              {" — "}
              responde con reglas fijas (sin coste de API). Añade{" "}
              <code className="rounded bg-zinc-100 px-1 text-xs dark:bg-zinc-800">OPENAI_API_KEY</code> en el
              servidor para ampliar el lenguaje natural.
            </>
          )}
        </p>
      </section>

      <section className="rounded-2xl border border-brand/25 bg-gradient-to-br from-brand-soft/40 via-white to-white p-5 dark:border-brand/35 dark:from-zinc-900 dark:via-zinc-900">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Cómo usarlo</h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          El chat principal es el botón <strong className="font-medium text-zinc-800 dark:text-zinc-200">Preguntar</strong>{" "}
          (abajo a la derecha) en cualquier pantalla. También puedes usar el bloque del inicio o las preguntas de
          ejemplo de abajo.
        </p>
        <OpenAssistantButton
          source="settings"
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-brand-fg shadow-sm transition hover:bg-brand-hover"
        >
          Abrir asistente
        </OpenAssistantButton>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Qué puede hacer (v1)</h2>
        <ul className="mt-3 list-inside list-disc space-y-1.5 text-sm text-zinc-600 dark:text-zinc-400">
          <li>Contar y listar clientes; abrir listado de clientes filtrado</li>
          <li>Cliente moroso, mejor cliente, resumen y última factura</li>
          <li>Facturas vencidas, pendientes o que vencen pronto</li>
          <li>Comparar facturación entre meses</li>
          <li>Borrador de recordatorio de cobro (copiar y enviar)</li>
          <li>Resumen del mes o trimestre; abrir listados filtrados</li>
        </ul>
        <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-500">
          No crea ni emite facturas. El historial del chat se guarda en este navegador.
        </p>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Privacidad</h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          La IA no accede a la base de datos. El servidor ejecuta consultas con tu sesión (RLS) y solo envía al
          proveedor resúmenes agregados (sin NIF ni líneas de factura).
        </p>
      </section>

      <section>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Probar con una pregunta
        </p>
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_QUESTIONS.map((q) => (
            <OpenAssistantButton
              key={q}
              question={q}
              source="settings-example"
              className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:border-brand/40 hover:bg-brand-soft/50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-brand/50"
            >
              {q}
            </OpenAssistantButton>
          ))}
        </div>
      </section>
    </div>
  );
}
