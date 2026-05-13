# Despliegue en Vercel

## 1. Conectar el repositorio

En [vercel.com](https://vercel.com): **Add New → Project**, importa el repo de GitHub/GitLab y deja el preset **Next.js** (comando de build: `next build`, salida: `.next`).

## 2. Variables de entorno

En el proyecto Vercel: **Settings → Environment Variables**, añade las mismas claves que en `.env.local.example`:

| Variable | Entorno | Notas |
|----------|---------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Production, Preview, Development | URL del proyecto en Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Igual | Clave `anon` `public` |
| `SUPABASE_SERVICE_ROLE_KEY` | Production (y Preview si hace falta) | **Secreta**, solo servidor; no uses prefijo `NEXT_PUBLIC_` |

Tras guardar, vuelve a desplegar (**Redeploy**) para que el build las inyecte.

## 3. Supabase

- **Login del panel:** `/login` y **registro** `/register`. Crea usuarios desde la app o manualmente en **Authentication → Users**.
- En **Authentication → URL Configuration**, añade la URL de tu app en Vercel en **Site URL** (p. ej. `https://tu-proyecto.vercel.app`) y en **Redirect URLs** si hace falta (`http://localhost:3000/**` para desarrollo).
- Las migraciones en `supabase/migrations/` deben estar aplicadas en el proyecto remoto (SQL editor o CLI).

## 4. Comprobar en local

```bash
npm run build && npm run start
```

Si el build es correcto, Vercel debería compilar igual con las variables configuradas.
