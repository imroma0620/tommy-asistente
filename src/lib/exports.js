function slug(text) {
  return String(text || 'tommy')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) || 'tommy'
}

function triggerDownload(filename, blob) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  return { filename, url }
}

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function brandedHtml({ title, kicker, body }) {
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)} · IM ROMA</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@700&family=Montserrat:wght@400;500;600&display=swap" rel="stylesheet" />
  <style>
    :root { --bg:#0D0D1A; --violet:#4C3AAF; --text:#F7F6FF; --muted:#B8A4F0; }
    * { box-sizing: border-box; }
    body { margin:0; background:var(--bg); color:var(--text); font-family:Montserrat,sans-serif; }
    header { padding:48px 40px 24px; border-bottom:1px solid #2A1F5C; }
    .kicker { color:var(--muted); letter-spacing:.2em; text-transform:uppercase; font-size:11px; }
    h1 { font-family:Cinzel,serif; font-size:36px; margin:10px 0 0; }
    main { padding:36px 40px 72px; max-width:820px; line-height:1.65; white-space:pre-wrap; }
    footer { padding:20px 40px 40px; color:var(--muted); font-size:12px; }
    .mark { color:var(--violet); }
    @media print { body { background:white; color:#111; } header { border-color:#ddd; } }
  </style>
</head>
<body>
  <header>
    <p class="kicker">IM ROMA · ${escapeHtml(kicker || 'Documento')}</p>
    <h1>${escapeHtml(title)}</h1>
  </header>
  <main>${escapeHtml(body)}</main>
  <footer>IM ROMA Creative Ecosystem · Cali. <span class="mark">Hecho por Tommy para Diana.</span></footer>
</body>
</html>`
}

function slidesHtml({ title, slides }) {
  const cards = (slides || []).map((slide, i) => `
    <section class="slide">
      <p class="num">${String(i + 1).padStart(2, '0')}</p>
      <h2>${escapeHtml(slide.titulo || `Pieza ${i + 1}`)}</h2>
      <p>${escapeHtml(slide.cuerpo || '')}</p>
      ${slide.nota ? `<small>${escapeHtml(slide.nota)}</small>` : ''}
    </section>`).join('')
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)} · IM ROMA</title>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@700&family=Montserrat:wght@400;500;600&display=swap" rel="stylesheet" />
  <style>
    :root { --bg:#0D0D1A; --violet:#4C3AAF; --text:#F7F6FF; --muted:#B8A4F0; }
    * { box-sizing:border-box; }
    body { margin:0; background:var(--bg); color:var(--text); font-family:Montserrat,sans-serif; }
    header { padding:28px 32px 8px; }
    .kicker { color:var(--muted); letter-spacing:.2em; text-transform:uppercase; font-size:11px; }
    h1 { font-family:Cinzel,serif; font-size:28px; margin:8px 0 16px; }
    .deck { display:flex; overflow-x:auto; scroll-snap-type:x mandatory; gap:16px; padding:0 32px 48px; }
    .slide { min-width:min(88vw,720px); min-height:420px; scroll-snap-align:start; background:#141428; border:1px solid #2A1F5C; border-left:4px solid var(--violet); border-radius:16px; padding:28px; }
    .num { color:var(--violet); letter-spacing:.16em; font-size:12px; }
    h2 { font-family:Cinzel,serif; font-size:26px; margin:8px 0 14px; }
    p { white-space:pre-wrap; line-height:1.55; }
    small { display:block; margin-top:18px; color:var(--muted); }
  </style>
</head>
<body>
  <header>
    <p class="kicker">IM ROMA · Presentación</p>
    <h1>${escapeHtml(title)}</h1>
  </header>
  <div class="deck">${cards}</div>
</body>
</html>`
}

function scriptBody(escenas, cuerpo) {
  if (cuerpo) return cuerpo
  return (escenas || []).map((escena, i) => {
    return `${escena.titulo || `Escena ${i + 1}`}${escena.tiempo ? ` · ${escena.tiempo}` : ''}\nLocución: ${escena.locucion || ''}\nVisual: ${escena.visual || ''}`
  }).join('\n\n')
}

export function createDocument({ titulo, cuerpo, kicker }) {
  const filename = `${slug(titulo)}.html`
  const html = brandedHtml({ title: titulo || 'Documento IM ROMA', kicker: kicker || 'PDF / documento', body: cuerpo || '' })
  const download = triggerDownload(filename, new Blob([html], { type: 'text/html;charset=utf-8' }))
  return { ok: true, tipo: 'documento', download }
}

export function createPresentation({ titulo, slides }) {
  const filename = `${slug(titulo)}-presentacion.html`
  const html = slidesHtml({ title: titulo || 'Presentación IM ROMA', slides: slides || [] })
  const download = triggerDownload(filename, new Blob([html], { type: 'text/html;charset=utf-8' }))
  return { ok: true, tipo: 'presentacion', slides: (slides || []).length, download }
}

export function createScript({ titulo, tipo, escenas, cuerpo }) {
  const filename = `${slug(titulo)}-guion.html`
  const html = brandedHtml({
    title: titulo || 'Guion IM ROMA',
    kicker: `Guion · ${tipo || 'contenido'}`,
    body: scriptBody(escenas, cuerpo),
  })
  const download = triggerDownload(filename, new Blob([html], { type: 'text/html;charset=utf-8' }))
  return { ok: true, tipo: 'guion', download }
}
