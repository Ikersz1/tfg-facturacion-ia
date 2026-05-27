# n8n — Flujo 1: factura emitida

Cuando en la app se **emite** una factura (de borrador a emitida), el servidor hace un `POST` al webhook de n8n con los datos de la factura y el cliente.

## 1. Variables en Vercel / `.env.local`

| Variable | Obligatoria | Descripción |
|----------|-------------|-------------|
| `N8N_INVOICE_ISSUED_WEBHOOK_URL` | Sí (para activar) | URL del nodo **Webhook** en n8n (modo POST). |
| `N8N_WEBHOOK_SECRET` | Recomendada | Mismo valor en la app y en n8n. La app envía `Authorization: Bearer <secreto>` y el endpoint de PDF lo exige. |
| `NEXT_PUBLIC_SITE_URL` | Recomendada | URL pública de la app (`https://tu-app.vercel.app`). |
| `SUPABASE_SERVICE_ROLE_KEY` | Sí para PDF | Permite generar el PDF en `/api/integrations/n8n/invoices/{id}/pdf`. |

Sin `N8N_INVOICE_ISSUED_WEBHOOK_URL` la factura se emite igual; no se llama a n8n.

## 2. Workflow en n8n (pasos)

1. **Webhook**
   - Método: `POST`
   - Path: el que te asigne n8n (copia la URL de producción).
   - Authentication (opcional): Header `Authorization` = `Bearer <N8N_WEBHOOK_SECRET>` (mismo que en Vercel).

2. **HTTP Request** (descargar PDF) — opcional
   - Method: `GET`
   - URL: `{{ $json.body.invoice.pdf_url }}` (o la ruta que llegue en el payload; ver ejemplo abajo).
   - Header: `Authorization` = `Bearer <N8N_WEBHOOK_SECRET>`
   - Response format: File

3. **Gmail** / **Send Email**
   - To: `{{ $json.body.client.email }}`
   - Subject: `Factura {{ $json.body.invoice.number_label }}`
   - Body: texto con total, vencimiento, enlace `invoice.detail_url`
   - Attachment: salida del nodo HTTP (PDF)

4. **Respond to Webhook** (opcional)
   - Status 200, body `{ "ok": true }`

Activa el workflow y usa la URL de **producción** en `N8N_INVOICE_ISSUED_WEBHOOK_URL`.

## 3. Payload JSON (ejemplo)

```json
{
  "event": "invoice.issued",
  "emitted_at": "2026-05-26T12:00:00.000Z",
  "invoice": {
    "id": "uuid-factura",
    "number_label": "A-2026/12",
    "series": "A",
    "year": 2026,
    "number": 12,
    "status": "issued",
    "issue_date": "2026-05-26",
    "due_date": "2026-06-26",
    "subtotal": 100,
    "tax_amount": 21,
    "total": 121,
    "currency": "EUR",
    "total_formatted": "121,00 €",
    "detail_url": "https://tu-app.vercel.app/invoices/uuid-factura",
    "pdf_url": "https://tu-app.vercel.app/api/integrations/n8n/invoices/uuid-factura/pdf"
  },
  "client": {
    "id": "uuid-cliente",
    "name": "Acme SL",
    "email": "cliente@ejemplo.com",
    "tax_id": "B12345678",
    "address": "Calle Mayor 1, 28001 Madrid"
  },
  "issuer": {
    "legal_name": "Mi Empresa SL",
    "tax_id": "B87654321",
    "address": "Polígono Industrial 2"
  }
}
```

En n8n, según versión, los datos pueden estar en `$json.body` o directamente en `$json` — abre la ejecución de prueba y mira la estructura.

## 4. Probar

1. Configura las variables y redeploy en Vercel.
2. En n8n: workflow activo, copia URL del Webhook.
3. En la app: emite una factura de prueba con cliente que tenga **email**.
4. En n8n → **Executions** debe aparecer una ejecución correcta.

Si falla, en la ficha de la factura (eventos) puede aparecer `n8n_webhook_error`; en la UI de emisión, un aviso amarillo.

## 5. Memoria / TFG

- **Trigger:** evento de negocio en la app (emisión).
- **Orquestación:** n8n (email + PDF).
- **Seguridad:** secreto compartido; PDF no público sin Bearer.
