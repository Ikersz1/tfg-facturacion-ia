# TFG Facturacion con IA

Aplicacion web de facturacion orientada a pymes/autonomos con:
- gestion de clientes, catalogo, facturas y cobros;
- exportacion y generacion de PDF de factura;
- integracion opcional con Verifacti;
- automatizaciones opcionales con n8n;
- asistente conversacional para consultas del panel.

## Stack tecnico

- `Next.js` (App Router, Server Actions)
- `TypeScript`
- `Tailwind CSS`
- `Supabase` (Auth + PostgreSQL + RLS)
- `@react-pdf/renderer` para PDF
- Integraciones opcionales: `OpenAI`, `Verifacti`, `n8n`

## Funcionalidades principales

- Alta/edicion/listado de clientes.
- Alta/edicion/listado de productos y servicios.
- Creacion de facturas con lineas, estados y cobros.
- Informes de facturacion y cobro.
- Panel inicial con KPIs y tablas de seguimiento.
- Asistente IA para consultas y aperturas de listados filtrados.

## Requisitos

- Node.js 20+
- npm 10+ (o equivalente)
- Proyecto de Supabase configurado

## Puesta en marcha local

1. Instalar dependencias:

```bash
npm install
```

2. Crear variables de entorno:

```bash
cp .env.local.example .env.local
```

3. Completar `.env.local` con tus valores.
4. Lanzar en desarrollo:

```bash
npm run dev
```

5. Abrir `http://localhost:3000`.

## Variables de entorno

Las variables necesarias estan documentadas en `.env.local.example` usando nombres y ejemplos ficticios.

Variables clave:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (solo servidor; opcional segun flujos)
- `VERIFACTI_NIF_API_KEY` (opcional)
- `CRON_SECRET` (opcional)
- `N8N_INVOICE_ISSUED_WEBHOOK_URL` (opcional)
- `N8N_WEBHOOK_SECRET` (opcional)
- `OPENAI_API_KEY` (opcional)

## Despliegue

Despliegue recomendado en Vercel.

La configuracion de entorno y cron esta documentada en:
- `VERCEL.md`
- `vercel.json`

## Seguridad y privacidad

- El repositorio no debe incluir secretos ni credenciales reales.
- No subir archivos `.env*` con valores reales.
- Usar datos anonimizados en semillas o ejemplos.
- Rotar claves si alguna vez se han compartido fuera de un entorno seguro.

## Documentacion adicional

- `docs/asistente-ia.md`
- `docs/n8n-flujo-1-factura-emitida.md`
- `docs/n8n-flujo-2-recordatorio-morosos.md`
- `docs/n8n-flujo-3-resumen-semanal.md`

## Estado del proyecto

Proyecto desarrollado como Trabajo Fin de Grado (TFG) con alcance funcional de MVP ampliado para facturacion diaria, reporting e integraciones opcionales.
