# Tommy · Asistente IM ROMA

PWA para Diana (IM ROMA, Cali): chat con Grok, agenda, recordatorios, proyectos, ideas, Google Calendar y Higgsfield.

**Enlace canónico (iPhone + sync + API):** [https://tommy-asistente.vercel.app](https://tommy-asistente.vercel.app)

**Espejo GitHub Pages:** [https://imroma0620.github.io/tommy-asistente/](https://imroma0620.github.io/tommy-asistente/)

> Primera vez en Vercel: sigue **[SETUP-VERCEL.md](SETUP-VERCEL.md)** (importar repo, Upstash gratis, `TOMMY_API_TOKEN`).

Marca: midnight `#0D0D1A`, violet `#4C3AAF`, lavender `#B8A4F0`, fondo `#F7F6FF` · Cinzel + Montserrat · español tú.

## iPhone: un enlace para siempre

1. Abre **https://tommy-asistente.vercel.app** en **Safari** (no Chrome).
2. **Compartir** → **Añadir a pantalla de inicio**.
3. Usa siempre el **icono** en la pantalla de inicio (no una pestaña).
4. Tras cada actualización en GitHub, Vercel redeploya solo; si no ves cambios, cierra Tommy en el conmutador de apps y ábrelo otra vez desde el icono.

El botón **Celular** dentro de la app repite estos pasos y muestra el enlace permanente.

## Sincronización entre dispositivos

Agenda, recordatorios, proyectos e ideas se guardan en el navegador y se **fusionan** en la nube (iPhone, PC, Grok Bot) sin borrar lo local.

### Recomendado — Vercel + Upstash (mismo dominio)

En [Vercel](https://vercel.com) con este repo:

- Servidor: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `TOMMY_WORKSPACE=im-roma-diana`, `TOMMY_API_TOKEN`
- La PWA en `.vercel.app` llama a `/api/state` **sin** `VITE_SYNC_URL` (mismo origen).

Detalle paso a paso: **[SETUP-VERCEL.md](SETUP-VERCEL.md)**.

### Alternativa — Supabase desde GitHub Pages

1. Proyecto en [Supabase](https://supabase.com) + [`supabase/schema.sql`](supabase/schema.sql).
2. Build con `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_TOMMY_WORKSPACE=im-roma-diana`.
3. Publica `docs/` en Pages.

### Espejo Pages + API Vercel

Build de Pages con:

```bash
VITE_SYNC_URL=https://tommy-asistente.vercel.app
```

### PC local

```bash
npm install
npm run build
node server.mjs
```

Abre `http://localhost:8787`. Estado en `data/state.json`.

## Datos semilla IM ROMA

Al abrir la app se **añaden si faltan** (por nombre):

- Arts Digital Institute, NutriQ Baby, La Gran Chuleta, Marcas desde la raíz, Clases Partner Media, Bootcamp, Redes sociales — Diana / IM ROMA
- Agenda: **2026-09-17 08:30** (America/Bogotá) — *Reunión con Iván*

## API para Grok Bot u otro asistente

Base: **https://tommy-asistente.vercel.app** (o `http://localhost:8787` en local).

| Método | Ruta | Auth | Uso |
|--------|------|------|-----|
| GET | `/api/state` | no | Leer agenda, proyectos, ideas, recordatorios |
| PUT | `/api/state` | Bearer opcional* | Fusionar estado (campos de trabajo) |
| POST | `/api/assistant` | Bearer opcional* | Acciones puntuales |

\* Con `TOMMY_API_TOKEN` en Vercel, envía `Authorization: Bearer <token>`.

### Ejemplos

```bash
BASE=https://tommy-asistente.vercel.app

curl -sS "$BASE/api/state"

curl -X POST "$BASE/api/assistant" \
  -H "Authorization: Bearer $TOMMY_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"create_project","nombre":"Cliente nuevo","descripcion":"Cliente"}'

curl -X POST "$BASE/api/assistant" \
  -H "Authorization: Bearer $TOMMY_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"agenda_event","fecha":"2026-09-20","hora":"10:00","texto":"Llamada con cliente"}'
```

La PWA **no** sube claves API, chat ni perfil a la nube; solo agenda, recordatorios, proyectos e ideas.

## Desarrollo

```bash
npm install
npm run dev          # Vite (proxy /api → server.mjs en :8787)
node server.mjs      # Producción local + sync
npm run build        # dist/ + copia a docs/ (GitHub Pages)
npm run lint
```

- **Vercel:** `vite build` → carpeta `dist/` + funciones en `/api` (`vercel.json`).
- **GitHub Pages:** rama `main`, carpeta **`docs/`** (generada con `npm run build`).

## Qué no tocar

Chat, OAuth de Google Calendar y credenciales Higgsfield siguen en **Ajustes** locales; la sync no las sobrescribe si ya las tienes en el dispositivo.
