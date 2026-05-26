"use client";

import Link from "next/link";
import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { loginAction, type AuthState } from "@/app/actions/auth";
import { GoogleSignInSection } from "@/components/google-sign-in-button";

const initial: AuthState = {};

function LoginAlerts() {
  const searchParams = useSearchParams();
  const reset = searchParams.get("reset");
  const authError = searchParams.get("error");

  if (reset === "1") {
    return (
      <p
        role="status"
        className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100"
      >
        Contraseña actualizada. Ya puedes iniciar sesión.
      </p>
    );
  }

  if (authError === "auth_callback") {
    return (
      <p
        role="alert"
        className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-200"
      >
        El enlace de recuperación no es válido o ha caducado.{" "}
        <Link href="/forgot-password" className="font-medium underline">
          Solicita uno nuevo
        </Link>
        .
      </p>
    );
  }

  if (authError === "google") {
    return (
      <p
        role="alert"
        className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-200"
      >
        No se pudo iniciar sesión con Google. Comprueba que Google esté activado en
        Supabase (Authentication → Providers).
      </p>
    );
  }

  return null;
}

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, initial);

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
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Facturación IA
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Inicia sesión para acceder al panel
          </p>
        </div>

        <div className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
          <Suspense fallback={null}>
            <LoginAlerts />
          </Suspense>

          <GoogleSignInSection errorPath="/login" label="Iniciar sesión con Google" />

        <form action={formAction} className="flex flex-col gap-4">
          {state?.error ? (
            <p
              role="alert"
              className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-200"
            >
              {state.error}
            </p>
          ) : null}

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">Email</span>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="tu@email.com"
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none transition focus:ring-2 focus:ring-brand/40 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder:text-zinc-500"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="flex items-center justify-between gap-2 font-medium text-zinc-700 dark:text-zinc-300">
              <span>Contraseña</span>
              <Link
                href="/forgot-password"
                className="text-xs font-normal text-brand hover:underline"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </span>
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none transition focus:ring-2 focus:ring-brand/40 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder:text-zinc-500"
            />
          </label>

          <button
            type="submit"
            disabled={pending}
            className="mt-1 inline-flex h-10 items-center justify-center rounded-lg bg-brand px-4 text-sm font-medium text-brand-fg transition hover:bg-brand-hover disabled:opacity-60"
          >
            {pending ? "Entrando…" : "Iniciar sesión"}
          </button>

          <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
            ¿No tienes cuenta?{" "}
            <Link
              href="/register"
              className="font-medium text-brand hover:underline dark:text-brand"
            >
              Registrarse
            </Link>
          </p>
        </form>
        </div>
      </div>
    </div>
  );
}
