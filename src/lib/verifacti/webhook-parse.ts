import { parseVerifactuStatusResponse } from "@/lib/verifacti/parse-status-response";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuidString(s: string): boolean {
  return UUID_RE.test(s.trim());
}

function readUuid(o: Record<string, unknown>): string | undefined {
  for (const k of ["uuid", "UUID", "request_id", "requestId", "id"]) {
    const v = o[k];
    if (typeof v === "string" && isUuidString(v)) return v.trim();
  }
  return undefined;
}

/**
 * Recorre el JSON del webhook y devuelve, por cada UUID encontrado en un objeto,
 * los campos de estado parseables (misma heurística que GET /verifactu/status).
 */
export function extractVerifactiWebhookUpdates(body: unknown): Map<
  string,
  { estado?: string; mensajeError?: string; qrBase64?: string }
> {
  const out = new Map<string, { estado?: string; mensajeError?: string; qrBase64?: string }>();

  function visit(node: unknown): void {
    if (node === null || node === undefined) return;
    if (Array.isArray(node)) {
      for (const x of node) visit(x);
      return;
    }
    if (typeof node !== "object") return;

    const o = node as Record<string, unknown>;
    const uuid = readUuid(o);
    if (uuid) {
      const parsed = parseVerifactuStatusResponse(o);
      const prev = out.get(uuid) ?? {};
      out.set(uuid, {
        estado: parsed.estado ?? prev.estado,
        mensajeError: parsed.mensajeError ?? prev.mensajeError,
        qrBase64: parsed.qrBase64 ?? prev.qrBase64,
      });
    }

    for (const v of Object.values(o)) {
      if (v && typeof v === "object") visit(v);
    }
  }

  visit(body);
  return out;
}
