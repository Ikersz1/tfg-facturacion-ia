import "server-only";

const DEFAULT_BASE = "https://api.verifacti.com";

export type VerifactuCreateResult =
  | { ok: true; status: number; json: unknown }
  | { ok: false; status: number; message: string };

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
  let json: unknown;
  try {
    json = JSON.parse(text) as unknown;
  } catch {
    json = { raw: text };
  }

  if (!res.ok) {
    const msg =
      typeof json === "object" &&
      json !== null &&
      "message" in json &&
      typeof (json as { message: unknown }).message === "string"
        ? (json as { message: string }).message
        : text.slice(0, 800);
    return { ok: false, status: res.status, message: msg };
  }

  return { ok: true, status: res.status, json };
}
