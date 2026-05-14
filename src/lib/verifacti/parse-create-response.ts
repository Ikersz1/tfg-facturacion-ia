/**
 * Extrae campos recomendados por Verifacti (uuid, QR Base64, huella) de la respuesta de crear factura.
 * La forma exacta del JSON puede variar; se aceptan varias claves habituales y un objeto anidado.
 */
export function parseVerifactuCreateResponse(json: unknown): {
  uuid?: string;
  qrBase64?: string;
  huella?: string;
  estado?: string;
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
  uuid?: string;
  qrBase64?: string;
  huella?: string;
  estado?: string;
} {
  if (depth > 4 || !json || typeof json !== "object") return {};

  const o = json as Record<string, unknown>;
  const uuid = pickString(o, ["uuid", "UUID", "id", "Id", "request_id", "requestId"]);
  const qrBase64 = pickString(o, ["qr", "QR", "qr_base64", "qrBase64", "imagen", "imagen_qr"]);
  const huella = pickString(o, ["huella", "Huella", "hash", "Hash"]);
  const estado = pickString(o, ["estado", "Estado", "status", "Status"]);

  if (uuid || qrBase64 || huella || estado) {
    return { uuid, qrBase64, huella, estado };
  }

  for (const k of ["data", "result", "response", "payload"]) {
    const inner = o[k];
    if (inner && typeof inner === "object") {
      const nested = walk(inner, depth + 1);
      if (nested.uuid || nested.qrBase64 || nested.huella || nested.estado) return nested;
    }
  }

  return {};
}
