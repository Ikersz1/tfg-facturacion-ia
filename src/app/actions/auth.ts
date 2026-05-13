"use server";

import { createClient } from "@/lib/supabase/server";
import { validateRegistrationEmail } from "@/lib/validate-registration-email";
import { redirect } from "next/navigation";

export type AuthState = { error?: string };

export type RegisterState = { error?: string; success?: string };

function isAuthRateLimitError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("rate limit") ||
    m.includes("rate_limit") ||
    m.includes("too many requests") ||
    m.includes("over_email_send") ||
    m.includes("email rate limit") ||
    m.includes(" 429") ||
    m.includes("(429)") ||
    (m.includes("too many") && m.includes("signup"))
  );
}

export async function registerAction(
  _prev: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const email = formData.get("email")?.toString().trim();
  const password = formData.get("password")?.toString();
  const confirmPassword = formData.get("confirmPassword")?.toString();

  if (!email || !password) {
    return { error: "Email y contraseña son obligatorios." };
  }
  if (password !== confirmPassword) {
    return { error: "Las contraseñas no coinciden." };
  }
  if (password.length < 6) {
    return { error: "La contraseña debe tener al menos 6 caracteres." };
  }

  const emailCheck = validateRegistrationEmail(email);
  if (!emailCheck.ok) {
    if (emailCheck.reason === "format") {
      return { error: "Introduce un email con formato válido." };
    }
    return {
      error: "No se permiten correos temporales. Usa un email personal o de trabajo.",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    const msg = error.message.toLowerCase();
    if (
      msg.includes("already registered") ||
      msg.includes("already been registered") ||
      msg.includes("user already registered")
    ) {
      return { error: "Ya existe una cuenta con este email. Inicia sesión." };
    }
    if (isAuthRateLimitError(msg)) {
      return {
        error:
          "Supabase ha limitado los registros (muchas pruebas seguidas desde tu IP o con ese email). Espera unos 10–60 minutos o cambia de red/VPN. Puedes revisar límites en el panel de Supabase → Authentication.",
      };
    }
    if (msg.includes("signup") && msg.includes("not allowed")) {
      return { error: "El registro está desactivado en el proyecto (Supabase)." };
    }
    if (msg.includes("invalid") && msg.includes("email")) {
      return {
        error:
          "El servicio de autenticación no acepta ese correo. Revisa la ortografía o la configuración de dominios en Supabase.",
      };
    }
    return {
      error: `No se pudo crear la cuenta: ${error.message}`,
    };
  }

  if (data.session) {
    redirect("/");
  }

  return {
    success:
      "Cuenta creada. Revisa tu correo (incluido spam) para activarla antes de iniciar sesión.",
  };
}

export async function loginAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = formData.get("email")?.toString().trim();
  const password = formData.get("password")?.toString();

  if (!email || !password) {
    return { error: "Email y contraseña son obligatorios." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Credenciales incorrectas. Revisa el email y la contraseña." };
  }

  redirect("/");
}

export async function logoutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
