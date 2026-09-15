# Configuración · Tommy IM ROMA (Diana)

## Checklist Vercel — escrituras que persisten (Grok Bot, PUT `/api/state`)

Sin **Upstash Redis** o **Supabase** en el proyecto de Vercel, `GET /api/state` sigue devolviendo la agenda semilla (clases, Iván, recordatorios), pero **`PUT /api/state` responde `{ "ok": true, "persisted": false }`**: los cambios del bot **no se guardan** en la nube.

### Una pantalla — Upstash (recomendado)

1. Abre [Vercel](https://vercel.com) → proyecto **`tommy-asistente`** (URL: `https://tommy-asistente.vercel.app`).
2. **Settings** → **Environment Variables** → añade estas tres (Production, Preview y Development):

   | Variable | Valor |
   |----------|--------|
   | `UPSTASH_REDIS_REST_URL` | URL REST de tu base Redis (Upstash → database → REST API) |
   | `UPSTASH_REDIS_REST_TOKEN` | Token REST de la misma base |
   | `TOMMY_WORKSPACE` | `im-roma-diana` |

3. **Deployments** → último deploy → **⋯** → **Redeploy** (marca *Use existing Build Cache* si quieres; las variables nuevas sí aplican).
4. Comprueba:
   - `curl -s https://tommy-asistente.vercel.app/api/state | head` → debe incluir clases **2026-09-15/16/17** y recordatorios **17:50**.
   - `curl -s -X PUT https://tommy-asistente.vercel.app/api/state -H 'Content-Type: application/json' -d '{"meta":{"test":1}}'` → debe incluir **`"persisted":true`**.

### Alternativa — Supabase en el servidor

En lugar de Upstash, en Vercel:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE` (clave **service role**, no la anon)
- `TOMMY_WORKSPACE=im-roma-diana`

Ejecuta [`supabase/schema.sql`](supabase/schema.sql) en el proyecto Supabase. Redeploy igual que arriba.

### GitHub Pages + sync

La PWA en Pages necesita saber dónde está la API:

```bash
VITE_SYNC_URL=https://tommy-asistente.vercel.app
VITE_TOMMY_WORKSPACE=im-roma-diana
```

Luego `npm run build` y sube `docs/`.

### Token opcional para Grok Bot

`TOMMY_API_TOKEN` en Vercel (y en el bot): envía `Authorization: Bearer <token>` en `POST /api/assistant` y, si lo activas, en `PUT /api/state`.
