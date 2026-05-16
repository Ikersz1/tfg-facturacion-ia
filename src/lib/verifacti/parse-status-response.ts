/**
 * Interpreta la respuesta de GET /verifactu/status (estructura puede variar).
 */
export function parseVerifactuStatusResponse(json: unknown): {
  estado?: string;
  mensajeError?: string;
  qrBase64?: string;
  verificationUrl?: string;
} {
  return walk(json, 0);
}

function pickString(o: Record<string, unknown>, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "string" && v.length > 0) return v;
  }
  return undefined;
}

function walk(json: unknown, depth: number): {
  estado?: string;
  mensajeError?: string;
  qrBase64?: string;
  verificationUrl?: string;
} {
  if (depth > 5 || !json || typeof json !== "object") return {};

  const o = json as Record<string, unknown>;
  const estado = pickString(o, [
    "estado",
    "Estado",
    "status",
    "Status",
    "estado_registro",
    "EstadoRegistro",
  ]);
  const mensajeError = pickString(o, [
    "mensaje_error",
    "mensajeError",
    "MensajeError",
    "error",
    "Error",
    "message",
    "Message",
    "descripcion",
    "Descripcion",
  ]);
  const qrBase64 = pickString(o, ["qr", "QR", "qr_base64", "qrBase64"]);
  const verificationUrl = pickString(o, [
    "verification_url",
    "verificationUrl",
    "url_cotejo",
    "urlCotejo",
    "enlace_cotejo",
    "enlaceCotejo",
    "url_aeat",
    "urlAeat",
    "aeat_url",
    "aeatUrl",
    "url",
  ]);

  if (estado || mensajeError || qrBase64 || verificationUrl) {
    return { estado, mensajeError, qrBase64, verificationUrl };
  }

  for (const k of ["data", "result", "response", "payload", "registro"]) {
    const inner = o[k];
    if (inner && typeof inner === "object") {
      const nested = walk(inner, depth + 1);
      if (nested.estado || nested.mensajeError || nested.qrBase64 || nested.verificationUrl) {
        return nested;
      }
    }
  }

  return {};
}
