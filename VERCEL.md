# Despliegue en Vercel

## 1. Conectar el repositorio

En [vercel.com](https://vercel.com): **Add New → Project**, importa el repo de GitHub/GitLab y deja el preset **Next.js** (comando de build: `next build`, salida: `.next`).

## 2. Variables de entorno

En el proyecto Vercel: **Settings → Environment Variables**, añade las mismas claves que en `.env.local.example`:

| Variable | Entorno | Notas |
|----------|---------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Production, Preview, Development | URL del proyecto en Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Igual | Clave `anon` `public` |
| `SUPABASE_SERVICE_ROLE_KEY` | Opcional en local | **Obligatoria en Vercel** si activas el cron de estado Verifacti (usa cliente admin para leer/actualizar facturas sin sesión). El panel sigue usando solo `anon` + JWT. |
| `VERIFACTI_NIF_API_KEY` | Opcional | Clave NIF Verifacti (`vf_test_…` / `vf_prod_…`). |
| `CRON_SECRET` | Opcional | Secreto largo aleatorio. Si está definido en Vercel, las invocaciones programadas de `/api/cron/verifacti-status` llevan `Authorization: Bearer <CRON_SECRET>`; la ruta rechaza peticiones sin coincidencia. |
| `OPENAI_API_KEY` | Opcional | Asistente en `/asistente`: enrutado de preguntas y redacción. Sin ella, el asistente usa reglas locales. |
| `OPENAI_MODEL` | Opcional | Por defecto `gpt-4o-mini`. |
| `ASSISTANT_SKIP_POLISH` | Opcional | Si es `1`, no se llama al LLM para redactar (solo datos + plantillas). |

El archivo `vercel.json` define un cron **una vez al día** (`0 6 * * *` → ~06:00 UTC; en Hobby la hora real puede variar ±59 min según [Vercel](https://vercel.com/docs/cron-jobs/usage-and-pricing)) contra `/api/cron/verifacti-status`, compatible con el plan **Hobby** (máximo una ejecución diaria). En **Pro** puedes acortar el intervalo si lo necesitas.

Tras guardar, vuelve a desplegar (**Redeploy**) para que el build las inyecte.

## 3. Supabase

- **Login del panel:** `/login` y **registro** `/register`. Crea usuarios desde la app o manualmente en **Authentication → Users**.
- **Sin confirmar email al registrarse:** en el panel de Supabase ve a **Authentication → Providers → Email** y desactiva **Confirm email** (a veces aparece como desactivar confirmaciones por correo). Así `signUp` devuelve sesión al momento y la app te manda al panel sin abrir el mail.
- En **Authentication → URL Configuration**, añade la URL de tu app en Vercel en **Site URL** (p. ej. `https://tu-proyecto.vercel.app`) y en **Redirect URLs** si hace falta (`http://localhost:3000/**` para desarrollo).
- **Datos por usuario:** primero crea las tablas si el proyecto está vacío: ejecuta `supabase/migrations/20250101000000_initial_schema.sql`. Después aplica `20260513140000_tenant_user_id_rls.sql` (columna `user_id` + RLS). Si ya tenías tablas creadas a mano, **no** hace falta el `initial_schema`. El archivo `20260402120000_invoice_status_partial.sql` solo ajusta el CHECK de `status` si venías de un esquema sin estado `partial`. Para **producto vs servicio** en catálogo: `20260514120000_products_catalog_kind.sql` (o columna `kind` ya incluida si recreaste el esquema inicial nuevo).

## 4. Comprobar en local

```bash
npm run build && npm run start
```

Si el build es correcto, Vercel debería compilar igual con las variables configuradas.
