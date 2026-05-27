import "server-only";

export function verifyN8nBearer(request: Request): boolean {
  const secret = process.env.N8N_WEBHOOK_SECRET?.trim();
  if (!secret) return false;
  const auth = request.headers.get("authorization")?.trim();
  return auth === `Bearer ${secret}`;
}

export function isN8nIntegrationConfigured(): boolean {
  return Boolean(process.env.N8N_INVOICE_ISSUED_WEBHOOK_URL?.trim());
}
