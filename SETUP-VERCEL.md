# Tommy en Vercel — URL permanente (una sola vez)

Objetivo: **https://tommy-asistente.vercel.app** (o el dominio `.vercel.app` que elijas al importar el repo). Ahí viven la PWA **y** `/api/state` + `/api/assistant` en el **mismo origen** (no hace falta `VITE_SYNC_URL` en Vercel).

GitHub Pages (`https://imroma0620.github.io/tommy-asistente/`) puede quedar como copia secundaria; el enlace canónico para el iPhone es Vercel.

---

## 1. Importar el repo en Vercel (≈2 min)

1. Entra en [vercel.com/new](https://vercel.com/new) con la cuenta de Diana (GitHub conectado).
2. **Import** → repositorio **`imroma0620/tommy-asistente`**.
3. Deja el nombre del proyecto como **`tommy-asistente`** para obtener `https://tommy-asistente.vercel.app`.
4. **Framework Preset:** Vite (debería detectarse solo).
5. **Build Command:** `vite build` · **Output Directory:** `dist` (ya vienen en `vercel.json`).
6. **No** marques “Override” salvo que Vercel no detecte Vite.

Antes del primer deploy, configura las variables del paso 2 y luego **Deploy**.

---

## 2. Persistencia — Upstash Redis (recomendado, free tier)

1. [console.upstash.com](https://console.upstash.com) → **Create database** → región cercana (ej. `us-east-1`).
2. En la base, pestaña **REST API** → copia:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
3. En Vercel: proyecto **tommy-asistente** → **Settings** → **Environment Variables** → añade:

| Variable | Valor | Entornos |
|----------|--------|----------|
| `UPSTASH_REDIS_REST_URL` | URL REST de Upstash | Production, Preview, Development |
| `UPSTASH_REDIS_REST_TOKEN` | Token REST de Upstash | Production, Preview, Development |
| `TOMMY_WORKSPACE` | `im-roma-diana` | Production, Preview, Development |
| `TOMMY_API_TOKEN` | Secreto largo (ver abajo) | Production, Preview, Development |

**Generar `TOMMY_API_TOKEN` (no lo subas a Git):**

- En tu Mac/PC: `openssl rand -hex 32`
- O en Vercel, pega un valor generado y guárdalo en un gestor de contraseñas (1Password, Notes seguras, etc.).

Guárdalo para Grok Bot / `curl` contra `/api/assistant`.

**Alternativa Supabase (servidor):** en lugar de Upstash, puedes usar `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE` (service role, **nunca** en el cliente). Ejecuta antes [`supabase/schema.sql`](supabase/schema.sql) en el SQL Editor.

---

## 3. Variables de build en Vercel (cliente)

En el mismo proyecto, **no** hace falta `VITE_SYNC_URL`: la app en `.vercel.app` usa `/api/state` en el mismo dominio.

Opcional (solo si quieres Supabase directo desde el navegador además de la API):

- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` / `VITE_TOMMY_WORKSPACE`

Para el despliegue principal en Vercel, **Upstash + API** basta.

---

## 4. Redeploy

Después de guardar env vars: **Deployments** → último deploy → **⋯** → **Redeploy** (marca “Use existing Build Cache” si quieres).

---

## 5. Comprobar que funciona

Sustituye `BASE` por tu URL (ej. `https://tommy-asistente.vercel.app`):

```bash
curl -sS "$BASE/api/state" | head -c 400
```

Deberías ver JSON con `proyectos`, `agenda`, etc. (datos semilla IM ROMA si la base está vacía).

Prueba la API del asistente (usa tu token real, no lo commitees):

```bash
curl -sS -X POST "$BASE/api/assistant" \
  -H "Authorization: Bearer TU_TOMMY_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"create_idea","titulo":"Prueba Vercel"}'
```

Abre `BASE` en Safari: debe cargar Tommy como PWA.

---

## 6. iPhone — un enlace para siempre

1. Safari → `https://tommy-asistente.vercel.app`
2. **Compartir** → **Añadir a pantalla de inicio**
3. Abre siempre desde el **icono** (no una pestaña guardada).
4. Cada `git push` a `main` redeploya Vercel; cierra Tommy en el conmutador de apps y ábrelo de nuevo para refrescar la PWA.

---

## 7. Google Calendar (opcional)

Si conectas Calendar desde la URL de Vercel, en [Google Cloud Console](https://console.cloud.google.com/) → credenciales OAuth del cliente de Tommy:

- **Authorized JavaScript origins:** `https://tommy-asistente.vercel.app`
- **Authorized redirect URIs:** `https://tommy-asistente.vercel.app/`

Mantén también los de GitHub Pages si sigues usándolos.

---

## 8. GitHub Pages como espejo (opcional)

Si quieres que Pages siga actualizándose pero **sincronice vía la API de Vercel**, al hacer `npm run build` local o en CI define:

```bash
VITE_SYNC_URL=https://tommy-asistente.vercel.app
```

Sin eso, Pages solo usa `localStorage` en el navegador (a menos que configures `VITE_SUPABASE_*`).

---

## Resumen de secretos

| Dónde | Qué |
|-------|-----|
| Vercel env | Upstash URL/token, `TOMMY_WORKSPACE`, `TOMMY_API_TOKEN` |
| Git | **Nunca** claves reales — solo `.env.example` |
| Diana | Token API en gestor de contraseñas; Grok Bot usa `Authorization: Bearer …` |
