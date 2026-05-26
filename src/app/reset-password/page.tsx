"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  updatePasswordAction,
  type UpdatePasswordState,
} from "@/app/actions/auth";

const initial: UpdatePasswordState = {};

export default function ResetPasswordPage() {
  const [state, formAction, pending] = useActionState(updatePasswordAction, initial);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand shadow-md">
            <svg
              className="h-6 w-6 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.75}
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Nueva contraseña
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Elige una contraseña nueva para tu cuenta
          </p>
        </div>

        <form
          action={formAction}
          className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          {state?.error ? (
            <p
              role="alert"
              className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-200"
            >
              {state.error}
              {state.error.includes("caducado") || state.error.includes("válido") ? (
                <>
                  {" "}
                  <Link href="/forgot-password" className="font-medium underline">
                    Solicitar nuevo enlace
                  </Link>
                </>
              ) : null}
            </p>
          ) : null}

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              Nueva contraseña
            </span>
            <input
              name="password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              placeholder="Mínimo 6 caracteres"
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none transition focus:ring-2 focus:ring-brand/40 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder:text-zinc-500"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              Repetir contraseña
            </span>
            <input
              name="confirmPassword"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              placeholder="••••••••"
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none transition focus:ring-2 focus:ring-brand/40 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder:text-zinc-500"
            />
          </label>

          <button
            type="submit"
            disabled={pending}
            className="mt-1 inline-flex h-10 items-center justify-center rounded-lg bg-brand px-4 text-sm font-medium text-brand-fg transition hover:bg-brand-hover disabled:opacity-60"
          >
            {pending ? "Guardando…" : "Guardar contraseña"}
          </button>

          <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
            <Link
              href="/login"
              className="font-medium text-brand hover:underline dark:text-brand"
            >
              Volver a iniciar sesión
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
