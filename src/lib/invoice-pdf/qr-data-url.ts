/** Data URL para incrustar el QR Verifacti en web o PDF. */
export function verifactiQrDataUrl(b64: string): string {
  const t = b64.trim();
  if (t.startsWith("data:")) return t;
  return `data:image/png;base64,${t}`;
}
