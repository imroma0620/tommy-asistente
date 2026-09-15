import { getSettings } from './storage'
import { hasApiProxy, isLocalHost } from './hosts'

function apiBase() {
  return hasApiProxy() ? '/higgsfield' : 'https://api.higgsfield.ai'
}

function proxyUrl(url) {
  if (!url) return url
  try {
    const parsed = new URL(url, window.location.origin)
    if (parsed.hostname === 'api.higgsfield.ai') {
      return `${apiBase()}${parsed.pathname}${parsed.search}`
    }
  } catch {
    // keep original
  }
  return url
}

function credentials() {
  const settings = getSettings()
  const keyId = String(settings.higgsfieldKeyId || '').trim()
  const secret = String(settings.higgsfieldSecret || '').trim()
  if (!keyId || !secret) {
    return { ok: false, error: 'Falta Higgsfield. En Ajustes pega tu Key ID y tu Secret de cloud.higgsfield.ai (API Keys).' }
  }
  return { ok: true, keyId, secret }
}

function authHeader(keyId, secret) {
  return `Key ${keyId}:${secret}`
}

async function higgsFetch(pathOrUrl, { keyId, secret, method = 'GET', body, headers = {} } = {}) {
  const url = pathOrUrl.startsWith('http') ? proxyUrl(pathOrUrl) : `${apiBase()}${pathOrUrl}`
  let res
  try {
    res = await fetch(url, {
      method,
      headers: {
        Authorization: authHeader(keyId, secret),
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new Error(
      isLocalHost()
        ? 'No pude hablar con Higgsfield. Revisa internet y vuelve a intentar.'
        : 'Higgsfield no deja llamadas desde GitHub Pages. Ábrelo en el PC con npm run dev (localhost) para generar.',
    )
  }

  const data = await res.json().catch(() => ({}))
  if (res.status === 401) {
    throw new Error('Las claves de Higgsfield no son válidas. En Ajustes pega otra vez el Key ID y el Secret.')
  }
  if (!res.ok) {
    const detail = data?.detail || data?.error || data?.message || `Error ${res.status} de Higgsfield`
    throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail))
  }
  return data
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function pollRequest(submitted, creds, { timeoutMs = 180000 } = {}) {
  const started = Date.now()
  let wait = 2000
  let status = submitted
  const done = new Set(['completed', 'failed', 'nsfw', 'canceled'])
  while (!done.has(status.status)) {
    if (Date.now() - started > timeoutMs) {
      throw new Error('Higgsfield tardó demasiado. Revisa el dashboard en cloud.higgsfield.ai o inténtalo otra vez.')
    }
    await sleep(wait)
    wait = Math.min(wait + 1000, 6000)
    const statusUrl = status.status_url || `/requests/${status.request_id}/status`
    status = await higgsFetch(statusUrl, creds)
  }
  if (status.status === 'nsfw') {
    throw new Error('Higgsfield bloqueó el resultado por contenido. Cambia el prompt y vuelve a pedir.')
  }
  if (status.status === 'canceled') {
    throw new Error('La generación se canceló en Higgsfield.')
  }
  if (status.status === 'failed') {
    throw new Error(status.error || 'Higgsfield falló al generar. No te cobró; puedes repetir.')
  }
  return status
}

function collectMedia(status) {
  const images = (status.images || []).map((item) => item.url).filter(Boolean)
  const videos = []
  if (status.video?.url) videos.push(status.video.url)
  for (const item of status.videos || []) {
    if (item?.url) videos.push(item.url)
  }
  const downloads = [
    ...images.map((url, i) => ({
      filename: `higgsfield-imagen-${i + 1}.jpg`,
      url,
      kind: 'image',
    })),
    ...videos.map((url, i) => ({
      filename: `higgsfield-video-${i + 1}.mp4`,
      url,
      kind: 'video',
    })),
  ]
  return { images, videos, downloads }
}

async function submitAndWait(path, body, creds, timeoutMs) {
  let submitted
  try {
    submitted = await higgsFetch(path, { ...creds, method: 'POST', body })
  } catch (error) {
    if (String(error.message || '').includes('404') && path === '/higgsfield-ai/soul/standard') {
      submitted = await higgsFetch('/higgsfield-ai/soul/v2/standard', { ...creds, method: 'POST', body })
    } else {
      throw error
    }
  }
  const status = await pollRequest(submitted, creds, { timeoutMs })
  const media = collectMedia(status)
  if (!media.downloads.length) {
    throw new Error('Higgsfield terminó, pero no devolvió archivo. Revisa créditos en cloud.higgsfield.ai.')
  }
  return {
    ok: true,
    request_id: status.request_id,
    modelo: path.replace(/^\//, ''),
    ...media,
    download: media.downloads[0],
  }
}

export async function uploadImageFile(file) {
  const creds = credentials()
  if (!creds.ok) return creds
  const contentType = file.mimeType || file.type || 'image/jpeg'
  const ticket = await higgsFetch('/files/generate-upload-url', {
    ...creds,
    method: 'POST',
    body: { content_type: contentType },
  })
  const blob = file.blob || (file.dataUrl ? await (await fetch(file.dataUrl)).blob() : null)
  if (!blob) return { ok: false, error: 'No pude leer la imagen adjunta para Higgsfield.' }
  const headers = { ...(ticket.upload_headers || {}), 'Content-Type': contentType }
  const put = await fetch(ticket.upload_url, { method: 'PUT', headers, body: blob })
  if (!put.ok) {
    return { ok: false, error: 'No pude subir la imagen a Higgsfield. Prueba con una URL pública o genera solo con texto.' }
  }
  return { ok: true, url: ticket.public_url }
}

export async function generateHiggsfieldImage(args = {}) {
  const creds = credentials()
  if (!creds.ok) return creds
  const prompt = String(args.prompt || '').trim()
  if (!prompt) return { ok: false, error: 'Falta el prompt de la imagen.' }
  const num = Math.min(4, Math.max(1, Number(args.cantidad || args.num_images || 1)))
  const body = {
    prompt,
    num_images: num,
    resolution: args.resolucion === '4K' ? '4K' : '2K',
    aspect_ratio: args.formato || args.aspect_ratio || '9:16',
  }
  try {
    return await submitAndWait('/higgsfield-ai/soul/standard', body, creds, 150000)
  } catch (error) {
    return { ok: false, error: error.message }
  }
}

export async function generateHiggsfieldVideo(args = {}, context = {}) {
  const creds = credentials()
  if (!creds.ok) return creds
  const prompt = String(args.prompt || '').trim()
  if (!prompt) return { ok: false, error: 'Falta el prompt del video.' }

  let imageUrl = String(args.image_url || args.imagen || '').trim()
  if (!imageUrl && context.files?.length) {
    const image = context.files.find((f) => f.kind === 'image')
    if (image) {
      const uploaded = await uploadImageFile(image)
      if (!uploaded.ok) return uploaded
      imageUrl = uploaded.url
    }
  }

  const duration = Math.min(12, Math.max(2, Number(args.duracion || args.duration || 5)))
  const aspect = args.formato || args.aspect_ratio || '9:16'

  try {
    if (imageUrl) {
      try {
        return await submitAndWait(
          '/higgsfield-ai/dop/lite',
          { prompt, image_url: imageUrl, enhance_prompt: true },
          creds,
          240000,
        )
      } catch {
        return await submitAndWait(
          '/bytedance/seedance/v1/lite/image-to-video',
          { prompt, image_url: imageUrl, duration, aspect_ratio: aspect, resolution: '720' },
          creds,
          240000,
        )
      }
    }
    return await submitAndWait(
      '/bytedance/seedance/v1/lite/text-to-video',
      { prompt, duration, aspect_ratio: aspect, resolution: '720' },
      creds,
      240000,
    )
  } catch (error) {
    return { ok: false, error: error.message }
  }
}
