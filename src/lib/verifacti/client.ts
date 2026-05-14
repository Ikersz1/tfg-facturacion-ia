import "server-only";

const DEFAULT_BASE = "https://api.verifacti.com";

export type VerifactuCreateResult =
  | { ok: true; status: number; json: unknown }
  | { ok: false; status: number; message: string };

function readJsonResponse(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { raw: text };
  }
}

function errorMessageFromBody(json: unknown, text: string): string {
  if (
    typeof json === "object" &&
    json !== null &&
    "message" in json &&
    typeof (json as { message: unknown }).message === "string"
  ) {
    return (json as { message: string }).message;
  }
  return text.slice(0, 800);
}

/**
 * POST /verifactu/create — requiere VERIFACTI_NIF_API_KEY (vf_test_… o vf_prod_…).
 * Autenticación: Authorization: Bearer &lt;token&gt; (documentación Verifacti).
 */
export async function verifactuCreate(body: object): Promise<VerifactuCreateResult> {
  const key = process.env.VERIFACTI_NIF_API_KEY?.trim();
  if (!key) {
    return { ok: false, status: 0, message: "Falta VERIFACTI_NIF_API_KEY en el servidor." };
  }

  const base = (process.env.VERIFACTI_API_BASE_URL ?? DEFAULT_BASE).replace(/\/$/, "");
  const url = `${base}/verifactu/create`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  const json = readJsonResponse(text);

  if (!res.ok) {
    return { ok: false, status: res.status, message: errorMessageFromBody(json, text) };
  }

  return { ok: true, status: res.status, json };
}

/**
 * GET /verifactu/status?uuid=… — respuesta de la AEAT / estado del registro (tras el envío asíncrono).
 */
export async function verifactuGetStatus(uuid: string): Promise<VerifactuCreateResult> {
  const key = process.env.VERIFACTI_NIF_API_KEY?.trim();
  if (!key) {
    return { ok: false, status: 0, message: "Falta VERIFACTI_NIF_API_KEY en el servidor." };
  }

  const id = uuid.trim();
  if (!id) {
    return { ok: false, status: 0, message: "UUID vacío." };
  }

  const base = (process.env.VERIFACTI_API_BASE_URL ?? DEFAULT_BASE).replace(/\/$/, "");
  const url = `${base}/verifactu/status?uuid=${encodeURIComponent(id)}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
    },
  });

  const text = await res.text();
  const json = readJsonResponse(text);

  if (!res.ok) {
    return { ok: false, status: res.status, message: errorMessageFromBody(json, text) };
  }

  return { ok: true, status: res.status, json };
}
