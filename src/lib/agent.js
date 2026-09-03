import { DAY_NAMES, isoDate, memorySnapshot, weekDates, getProfile } from './storage'
import { executeTool, TOOL_DECLARATIONS } from './tools'
import { createCalendarEvent, listCalendarEvents } from './calendar'
import { identityPrompt } from './identity'

const MODELS = ['openai/gpt-oss-20b', 'openai/gpt-oss-120b', 'qwen/qwen3.6-27b']

function groqBase() {
  const host = window.location.hostname
  const local = host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local')
    || /^\d+\.\d+\.\d+\.\d+$/.test(host)
  return local ? '/groq' : 'https://api.groq.com/openai/v1'
}

function weekContext() {
  return weekDates(0)
    .map((d, i) => `${DAY_NAMES[i]} ${isoDate(d)}`)
    .join(', ')
}

function systemPrompt() {
  const now = new Date()
  const profile = getProfile()
  return `Eres Tommy, el asistente personal de ${profile.nombre || 'Diana'}. Hablas, piensas y actúas con su criterio. No eres un chatbot genérico.

${identityPrompt()}

Ajustes que ella te enseñó después:
Cómo habla: ${profile.comoHabla || 'usar la bio'}
Cómo piensa: ${profile.comoPiensa || 'usar la bio'}
Cómo actúa: ${profile.comoActua || 'usar la bio'}
Reglas extra: ${(profile.reglas || []).join(' | ') || 'ninguna'}
Evitar extra: ${(profile.evitar || []).join(' | ') || 'nada'}
Ejemplos de su voz: ${(profile.ejemplos || []).slice(0, 6).join(' / ') || 'los de la bio'}
Hechos extra: ${(profile.hechos || []).slice(-12).join(' | ') || 'los de la bio'}

Fecha de hoy: ${now.toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.
Esta semana: ${weekContext()}.

Cada chat es UN tema. No arrastres otra conversación. No mezcles clientes ni proyectos salvo que ella lo pida.

Responsabilidades:
- Agenda semanal
- Recordatorios
- Proyectos
- Ideas de contenido
También Google Calendar si está conectado, archivos e imágenes, y guardar su estilo.

Nunca hables de versiones de Tommy. Eres un solo Tommy.

Si puedes ejecutar, usa herramientas y confirma.
Si pide calendario, usa crear_evento_calendario.`
}

function memoryHint() {
  const snap = memorySnapshot()
  return `Memoria: agenda ${Object.keys(snap.agenda).length} días, recordatorios ${snap.recordatorios.length}, proyectos ${snap.proyectos.map((p) => p.nombre).join(', ') || 'ninguno'}, ideas ${snap.ideas.length}.`
}

function jsonSchema(node) {
  if (!node || typeof node !== 'object') return { type: 'object', properties: {} }
  const typeMap = {
    OBJECT: 'object',
    STRING: 'string',
    ARRAY: 'array',
    NUMBER: 'number',
    BOOLEAN: 'boolean',
    INTEGER: 'integer',
  }
  const out = { ...node }
  if (node.type) out.type = typeMap[node.type] || String(node.type).toLowerCase()
  if (node.properties) {
    out.properties = Object.fromEntries(
      Object.entries(node.properties).map(([key, value]) => [key, jsonSchema(value)]),
    )
  }
  if (node.items) out.items = jsonSchema(node.items)
  return out
}

function groqTools() {
  return TOOL_DECLARATIONS.map((tool) => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: jsonSchema(tool.parameters),
    },
  }))
}

async function groqChat(apiKey, model, messages) {
  const res = await fetch(`${groqBase()}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      tools: groqTools(),
      temperature: 0.3,
    }),
  })
  const data = await res.json()
  if (!res.ok) {
    const msg = data?.error?.message || `Error ${res.status} al hablar con Groq`
    const err = new Error(friendlyError(msg, res.status))
    err.status = res.status
    throw err
  }
  return data
}

function friendlyError(msg, status) {
  const text = String(msg || '')
  if (status === 401 || text.toLowerCase().includes('invalid')) {
    return 'La clave de Groq no es válida. Ábrela en Ajustes y pega una clave nueva de console.groq.com/keys. Es gratis y no pide tarjeta.'
  }
  if (status === 429) {
    return 'Se acabó la cuota gratis de Groq por ahora. Prueba más tarde; no hay cobro.'
  }
  return text
}

export async function transcribeAudio(apiKey, audio) {
  const bytes = Uint8Array.from(atob(audio.base64), (c) => c.charCodeAt(0))
  const blob = new Blob([bytes], { type: audio.mimeType || 'audio/webm' })
  const form = new FormData()
  form.append('file', blob, 'nota.webm')
  form.append('model', 'whisper-large-v3-turbo')
  form.append('language', 'es')
  const res = await fetch(`${groqBase()}/audio/transcriptions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error?.message || 'No pude entender el audio.')
  return data.text || ''
}

export async function talkToTommy({ apiKey, history, text, audio, files = [] }) {
  if (!apiKey || !String(apiKey).startsWith('gsk_')) {
    throw new Error('Necesito una clave gratis de Groq. No uses Gemini ni pongas tarjeta. En Ajustes te dejo el enlace.')
  }

  let userText = (text || '').trim()
  if (audio?.base64) {
    const heard = await transcribeAudio(apiKey, audio)
    userText = heard ? `${userText ? `${userText}\n` : ''}${heard}`.trim() : userText || 'Nota de voz vacía'
  }
  const images = files.filter((f) => f.kind === 'image')
  const texts = files.filter((f) => f.kind === 'text')
  if (texts.length) {
    userText += `\n\nArchivos adjuntos:\n${texts.map((f) => `--- ${f.name} ---\n${f.text}`).join('\n\n')}`
  }
  if (!userText && !images.length) throw new Error('No entendí el mensaje. Prueba otra vez.')
  if (!userText) userText = 'Revisa los archivos adjuntos y dime lo importante. Actúa si hace falta.'

  const userContent = images.length
    ? [
        { type: 'text', text: userText },
        ...images.map((img) => ({ type: 'image_url', image_url: { url: img.dataUrl } })),
      ]
    : userText

  const messages = [
    { role: 'system', content: `${systemPrompt()}\n\n${memoryHint()}` },
    ...history,
    { role: 'user', content: userContent },
  ]

  const models = images.length
    ? ['qwen/qwen3.6-27b', 'openai/gpt-oss-20b', 'openai/gpt-oss-120b']
    : MODELS

  let lastError
  for (const model of models) {
    try {
      const result = await runLoop(apiKey, model, messages)
      return { ...result, transcript: userText }
    } catch (error) {
      lastError = error
      if (!shouldTryNext(error)) break
    }
  }
  throw lastError || new Error('No pude contactar a Groq.')
}

function shouldTryNext(error) {
  const msg = String(error?.message || '').toLowerCase()
  return (
    error?.status === 404 ||
    error?.status === 400 ||
    msg.includes('not found') ||
    msg.includes('decommissioned') ||
    msg.includes('does not exist')
  )
}

async function runLoop(apiKey, model, messages) {
  const actions = []
  let data = await groqChat(apiKey, model, messages)
  let guard = 0

  while (guard < 6) {
    const choice = data?.choices?.[0]?.message || {}
    const calls = choice.tool_calls || []
    if (!calls.length) {
      return { text: (choice.content || 'Listo, ya lo anoté.').trim(), actions, model, transcript: messages.at(-1)?.content }
    }

    messages.push({
      role: 'assistant',
      content: choice.content || '',
      tool_calls: calls,
    })
    for (const call of calls) {
      let args = {}
      try {
        args = JSON.parse(call.function?.arguments || '{}')
      } catch {
        args = {}
      }
      const name = call.function?.name
      let result
      if (name === 'listar_calendario') result = await listCalendarEvents()
      else if (name === 'crear_evento_calendario') result = await createCalendarEvent(args)
      else result = executeTool(name, args)
      actions.push({ name, args, result })
      messages.push({
        role: 'tool',
        tool_call_id: call.id,
        content: JSON.stringify(result),
      })
    }
    data = await groqChat(apiKey, model, messages)
    guard += 1
  }

  return { text: 'Hice los cambios, pero el modelo se quedó en un bucle. Revisa la memoria.', actions, model }
}

export function toChatHistory(messages) {
  return messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .filter((m) => m.text && !m.error)
    .slice(-16)
    .map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.text,
    }))
}
