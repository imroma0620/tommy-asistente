# Tommy · Asistente IM ROMA

PWA para Diana (IM ROMA, Cali): chat con Grok, agenda, recordatorios, proyectos, ideas, Google Calendar y Higgsfield.

**Sitio en vivo:** [https://imroma0620.github.io/tommy-asistente/](https://imroma0620.github.io/tommy-asistente/) · **API sync:** [https://tommy-asistente.vercel.app](https://tommy-asistente.vercel.app)

> **Importante (Grok Bot / Vercel):** sin Upstash o Supabase en Vercel, `PUT /api/state` devuelve `persisted: false` y el bot no guarda cambios. Sigue la [**checklist en SETUP.md**](SETUP.md).

Marca: midnight `#0D0D1A`, violet `#4C3AAF`, lavender `#B8A4F0`, fondo `#F7F6FF` · Cinzel + Montserrat · español tú.

## iPhone: instalar y actualizar

1. Abre el enlace en **Safari** (no en Chrome).
2. Toca **Compartir** → **Añadir a pantalla de inicio**.
3. Abre Tommy **desde el icono**, no desde una pestaña guardada.
4. Si no ves cambios después de una actualización: cierra la app en el conmutador de apps y ábrela otra vez desde el icono (la PWA refresca al reiniciar).

El botón **Celular** dentro de la app repite estos pasos.

## Sincronización entre dispositivos

Agenda, recordatorios, proyectos e ideas se guardan en el navegador y, si configuras la nube, se **fusionan** entre iPhone, PC y API externa (sin borrar lo que ya tengas).

### Opción A — Supabase (recomendada con GitHub Pages)

1. Crea un proyecto gratis en [Supabase](https://supabase.com).
2. En el SQL Editor, ejecuta [`supabase/schema.sql`](supabase/schema.sql).
3. Copia **Project URL** y **anon public key**.
4. Al hacer build, define:

```bash
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_TOMMY_WORKSPACE=im-roma-diana
```

5. Vuelve a publicar (`npm run build` y sube la carpeta `docs/`).

### Opción B — API en Vercel

Proyecto en producción: **`https://tommy-asistente.vercel.app`**.

1. Conecta este repo a [Vercel](https://vercel.com).
2. **Obligatorio para que Grok Bot persista escrituras** — variables del **servidor** (elige una):
   - **Upstash:** `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `TOMMY_WORKSPACE=im-roma-diana`
   - **Supabase:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE`, `TOMMY_WORKSPACE=im-roma-diana`
3. Redeploy después de guardar variables. Sin ellas, `GET /api/state` muestra datos semilla, pero `PUT` responde `persisted: false`.
4. Opcional: `TOMMY_API_TOKEN` para escrituras autenticadas.
5. En el build de GitHub Pages:

```bash
VITE_SYNC_URL=https://tommy-asistente.vercel.app
VITE_TOMMY_WORKSPACE=im-roma-diana
```

Detalle paso a paso: [**SETUP.md**](SETUP.md).

### PC local (sync incluida)

```bash
npm install
npm run build
node server.mjs
```

Abre `http://localhost:8787`. El estado vive en `data/state.json`.

## Datos semilla IM ROMA

Al abrir la app se **añaden si faltan** (por nombre):

- Arts Digital Institute, NutriQ Baby, La Gran Chuleta, Marcas desde la raíz, Clases Partner Media, Bootcamp, Redes sociales — Diana / IM ROMA
- Agenda (America/Bogotá): clases **mar–jue 2026-09-15…17 a las 18:30** (*Clase 6:30–9:30 p. m.*) + **2026-09-17 08:30** *Reunión con Iván* (conviven en el mismo día)
- Recordatorios: **17:50** esos tres días — *En 40 min: clase 6:30–9:30 p. m.* (prioridad alta)

## API para Grok Bot u otro asistente

Base: `https://tu-api.vercel.app` o tu PC `http://localhost:8787`.

| Método | Ruta | Auth | Uso |
|--------|------|------|-----|
| GET | `/api/state` | no | Leer agenda, proyectos, ideas, recordatorios |
| PUT | `/api/state` | Bearer opcional* | Fusionar estado completo (solo campos de trabajo) |
| POST | `/api/assistant` | Bearer opcional* | Acciones puntuales |

\* Si defines `TOMMY_API_TOKEN` en el servidor, envía `Authorization: Bearer <token>`.

### Ejemplos

```bash
# Crear proyecto
curl -X POST "$BASE/api/assistant" \
  -H "Authorization: Bearer $TOMMY_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"create_project","nombre":"Cliente nuevo","descripcion":"Cliente"}'

# Evento de agenda
curl -X POST "$BASE/api/assistant" \
  -H "Authorization: Bearer $TOMMY_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"agenda_event","fecha":"2026-09-20","hora":"10:00","texto":"Llamada con cliente"}'

# Idea de contenido
curl -X POST "$BASE/api/assistant" \
  -H "Authorization: Bearer $TOMMY_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"create_idea","titulo":"Hook reel nutrición","tipo":"Reel","descripcion":"3 mitos en 30s"}'
```

La PWA **no** sube claves API, chat ni perfil a la nube; solo agenda, recordatorios, proyectos e ideas.

## Desarrollo

```bash
npm install
npm run dev          # Vite (proxy /api → server si lo levantas aparte)
node server.mjs      # Producción local + sync
npm run build        # Genera dist/ y copia a docs/ para GitHub Pages
npm run lint
```

Publicación GitHub Pages: la rama `main` sirve la carpeta **`docs/`** (generada con `npm run build`).

## Qué no tocar

Chat, OAuth de Google Calendar y credenciales Higgsfield siguen en **Ajustes** locales; la sync no las sobrescribe si ya las tienes en el dispositivo.
