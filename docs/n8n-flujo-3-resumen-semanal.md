# n8n — Flujo 3: resumen semanal al emisor

Un email **a ti** (no al cliente) con el resumen de la **semana anterior** (lunes–domingo): facturas emitidas, cobrado, pendiente total, vencido y hasta 5 facturas morosas.

## Variables de entorno

| Variable | Requerida | Notas |
|----------|-----------|-------|
| `N8N_WEBHOOK_SECRET` | Sí | Bearer en el nodo HTTP Request. |
| `SUPABASE_SERVICE_ROLE_KEY` | Sí | Lectura de facturas/pagos de todos los usuarios. |
| `NEXT_PUBLIC_SITE_URL` | Recomendada | Enlaces a informes y facturas. |

## Activar en la app

En **Ajustes → Automatización** → **«Recibir resumen semanal por email»**.

Migración: `20260528143000_n8n_weekly_summary.sql`.

## Endpoint

```
GET https://tfg-facturacion-ia.vercel.app/api/integrations/n8n/weekly-summary
Authorization: Bearer <N8N_WEBHOOK_SECRET>
```

### Respuesta de ejemplo

```json
{
  "ok": true,
  "week_key": "2026-05-19",
  "summary_count": 1,
  "summaries": [
    {
      "type": "weekly_summary",
      "to_email": "tu@correo.com",
      "period": {
        "from": "2026-05-19",
        "to": "2026-05-25",
        "label": "19 may 2026 – 25 may 2026"
      },
      "metrics": {
        "issued_count": 2,
        "billed_total_formatted": "242,00 €",
        "collected_in_period_formatted": "121,00 €",
        "pending_now_formatted": "350,00 €",
        "overdue_now_formatted": "121,00 €",
        "overdue_count": 1
      },
      "overdue_invoices": [
        {
          "number_label": "A-2026/3",
          "client_name": "Cliente SL",
          "outstanding_formatted": "121,00 €",
          "days_overdue": 4,
          "detail_url": "https://..."
        }
      ],
      "links": {
        "informes_url": "https://tu-app.vercel.app/informes",
        "dashboard_url": "https://tu-app.vercel.app/"
      },
      "issuer": { "legal_name": "Mi Empresa SL", "tax_id": "B12345678", "email": "tu@correo.com" }
    }
  ]
}
```

Máximo **un resumen por usuario y semana** (`week_key` = lunes de la semana resumida).

## Workflow en n8n

### 1. Schedule Trigger
- **Weeks** → cada **1** semana
- Día: **Monday** (lunes)
- Hora: **8:00** (o la que prefieras)

### 2. HTTP Request
- **GET** `https://tfg-facturacion-ia.vercel.app/api/integrations/n8n/weekly-summary`
- **Header Auth:** `Authorization` = `Bearer <N8N_WEBHOOK_SECRET>`
- Response: JSON

### 3. IF — `summary_count` > 0

### 4. Split Out — campo `summaries`

### 5. Gmail — un email por resumen
- **To:** `{{ $json.to_email }}`
- **Subject:** `Resumen semanal · {{ $json.period.label }}`
- **Email Type:** HTML
- **Message** (plantilla):

```html
<h2>Resumen semanal — {{ $json.issuer.legal_name }}</h2>
<p>Periodo: <strong>{{ $json.period.label }}</strong></p>
<ul>
  <li>Facturas emitidas: <strong>{{ $json.metrics.issued_count }}</strong> ({{ $json.metrics.billed_total_formatted }})</li>
  <li>Cobrado en el periodo: <strong>{{ $json.metrics.collected_in_period_formatted }}</strong></li>
  <li>Pendiente de cobro (ahora): <strong>{{ $json.metrics.pending_now_formatted }}</strong></li>
  <li>Vencido (ahora): <strong>{{ $json.metrics.overdue_now_formatted }}</strong> ({{ $json.metrics.overdue_count }} factura(s))</li>
</ul>
<p><a href="{{ $json.links.informes_url }}">Ver informes →</a> · <a href="{{ $json.links.dashboard_url }}">Panel →</a></p>
```

Para listar morosos en n8n Cloud puedes añadir un nodo **Code** que genere HTML desde `overdue_invoices`, o pegar manualmente las 5 primeras con expresiones si el array es pequeño.

- **Sender Name:** `{{ $json.issuer.legal_name }}`
- **Append n8n Attribution:** OFF

## Probar de nuevo

Si ya ejecutaste el GET, borra en Supabase → `n8n_weekly_summaries_sent` la fila de tu `user_id` y `week_key` actual (lunes de la semana pasada).

## Debugging

- `summary_count: 0` → toggle desactivado o ya enviado esta semana.
- Sin email en Auth → el usuario no aparece en `summaries`.
