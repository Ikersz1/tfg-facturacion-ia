# n8n — Flujo 2: recordatorios de facturas vencidas

Cuando n8n consulta el endpoint de recordatorios, la app devuelve dos tipos de avisos:

- **`issuer_alert`** — email a ti (el emisor) la primera vez que una factura vence. Solo se envía una vez por factura.
- **`client_reminder`** — email al cliente moroso, tras el período de gracia que hayas configurado. Máximo una vez cada 7 días por factura.

## Variables de entorno necesarias

| Variable | Requerida | Notas |
|----------|-----------|-------|
| `N8N_WEBHOOK_SECRET` | Sí | Bearer compartido app ↔ n8n. Sin ella el endpoint devuelve 401. |
| `SUPABASE_SERVICE_ROLE_KEY` | Sí | Permite leer facturas y pagos de todos los usuarios sin sesión. |
| `NEXT_PUBLIC_SITE_URL` | Recomendada | URL pública para los enlaces `detail_url` del payload. |

## Activar en la app

En `/settings/automatizacion` (Integraciones n8n):

- **«Avisarme a mí cuando una factura venza»** → activa `issuer_alert`.
- **«Enviar recordatorio automático al cliente moroso»** → activa `client_reminder`.
- **Días de gracia** → número de días desde el vencimiento hasta el primer aviso al cliente.

## Endpoint

```
GET /api/integrations/n8n/overdue-reminders
Authorization: Bearer <N8N_WEBHOOK_SECRET>
```

### Respuesta de ejemplo

```json
{
  "ok": true,
  "processed_at": "2026-05-28T08:00:00.000Z",
  "reminder_count": 2,
  "reminders": [
    {
      "type": "issuer_alert",
      "invoice_id": "uuid-factura",
      "invoice": {
        "number_label": "A-2026/5",
        "total": 1000.00,
        "total_formatted": "1.000,00 €",
        "outstanding": 1000.00,
        "outstanding_formatted": "1.000,00 €",
        "due_date": "2026-05-20",
        "days_overdue": 8,
        "detail_url": "https://tu-app.vercel.app/invoices/uuid-factura"
      },
      "client": {
        "name": "Empresa Cliente S.L.",
        "email": "cliente@empresa.com",
        "tax_id": "B12345678"
      },
      "to_email": "tu@correo.com",
      "issuer": {
        "legal_name": "Mi Empresa S.L.",
        "tax_id": "B87654321",
        "email": "tu@correo.com"
      }
    },
    {
      "type": "client_reminder",
      "invoice_id": "uuid-factura-2",
      "invoice": { "..." : "..." },
      "client": { "name": "Otro Cliente", "email": "otro@cliente.com", "tax_id": null },
      "to_email": "otro@cliente.com",
      "issuer": { "legal_name": "Mi Empresa S.L.", "tax_id": "B87654321", "email": "tu@correo.com" }
    }
  ]
}
```

## Workflow en n8n (pasos)

### 1. Schedule Trigger
- Interval: **Every Day** (o Every 12 Hours si quieres más frecuencia).
- Hora recomendada: 08:00–09:00 hora local.

### 2. HTTP Request — Obtener recordatorios
- Method: `GET`
- URL: `https://tu-app.vercel.app/api/integrations/n8n/overdue-reminders`
- Authentication: **Header Auth**
  - Name: `Authorization`
  - Value: `Bearer <N8N_WEBHOOK_SECRET>`
- Response Format: `JSON`

### 3. IF — ¿Hay recordatorios?
- Condition: `{{ $json.reminder_count }}` > `0`
- Branch TRUE: continuar al paso 4.
- Branch FALSE: terminar (no hay nada que enviar hoy).

### 4. Split in Batches (o Loop Over Items)
- Iterar sobre: `{{ $json.reminders }}`
- Batch Size: 1

### 5. IF — Tipo de recordatorio
- Condition: `{{ $json.type }}` equals `issuer_alert`
- Branch TRUE (issuer_alert): ir al paso 6.
- Branch FALSE (client_reminder): ir al paso 7.

### 6. Gmail — Aviso al emisor (`issuer_alert`)
- To: `{{ $json.to_email }}`
- Subject: `Factura vencida: {{ $json.invoice.number_label }} — {{ $json.client.name }}`
- Message (HTML sugerido):
  ```
  La factura <strong>{{ $json.invoice.number_label }}</strong> de <strong>{{ $json.client.name }}</strong>
  lleva <strong>{{ $json.invoice.days_overdue }} días</strong> vencida.<br><br>
  Importe pendiente: <strong>{{ $json.invoice.outstanding_formatted }}</strong><br>
  Vencimiento: {{ $json.invoice.due_date }}<br><br>
  <a href="{{ $json.invoice.detail_url }}">Ver factura en el panel →</a>
  ```
- Sender Name: `{{ $json.issuer.legal_name }}`
- Append n8n Attribution: **OFF**

### 7. Gmail — Recordatorio al cliente (`client_reminder`)
- To: `{{ $json.to_email }}`
- Subject: `Recordatorio de pago: factura {{ $json.invoice.number_label }}`
- Message (HTML sugerido):
  ```
  Estimado/a {{ $json.client.name }},<br><br>
  Le recordamos que la factura <strong>{{ $json.invoice.number_label }}</strong>
  tiene un importe pendiente de <strong>{{ $json.invoice.outstanding_formatted }}</strong>
  con vencimiento el {{ $json.invoice.due_date }}.<br><br>
  Si ya ha realizado el pago, por favor ignore este mensaje.<br><br>
  Atentamente,<br>
  <strong>{{ $json.issuer.legal_name }}</strong>
  ```
- Sender Name: `{{ $json.issuer.legal_name }}`
- Append n8n Attribution: **OFF**

## Lógica de frecuencia (gestionada por la app)

| Tipo | Primera vez | Reenvíos |
|------|-------------|---------|
| `issuer_alert` | Primera vez que la factura vence | Nunca (1 sola vez por factura) |
| `client_reminder` | Vencida ≥ N días de gracia | Máximo 1 vez cada 7 días |

Los envíos se registran en la tabla `n8n_overdue_reminders`. Si n8n falla tras recibir la respuesta, el recordatorio no se reenvía automáticamente hasta la siguiente ventana (patrón optimista). Si necesitas forzar el reenvío, elimina la fila correspondiente en Supabase.

## Notas importantes

- Si el cliente **no tiene email** registrado, la factura no aparece en `client_reminder`.
- Si el emisor **no ha configurado datos fiscales** (razón social + NIF + domicilio), el perfil no aparece en el endpoint.
- El endpoint devuelve `reminder_count: 0` y array vacío si no hay nada que enviar. El nodo IF del paso 3 evita que n8n continúe innecesariamente.
- Para probar: emite una factura con `due_date` de ayer, activa los toggles y llama al endpoint manualmente con Postman/curl.

## Debugging

Si no recibes correos:
1. Llama al endpoint desde Postman con el Bearer correcto y comprueba la respuesta.
2. Verifica que las facturas tienen `due_date` pasada, `status` ≠ `draft`/`cancelled`/`paid`, y `outstanding > 0`.
3. Comprueba en Supabase → tabla `n8n_overdue_reminders` si ya se marcaron como enviados.
4. Asegúrate de que `N8N_WEBHOOK_SECRET` coincide en Vercel y en el nodo HTTP Request de n8n.
