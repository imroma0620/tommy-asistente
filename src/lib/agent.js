import { DAY_NAMES, isoDate, memorySnapshot, weekDates } from './storage'
import { executeTool, TOOL_DECLARATIONS } from './tools'

const MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
]

function weekContext() {
  return weekDates(0)
    .map((d, i) => `${DAY_NAMES[i]} ${isoDate(d)}`)
    .join(', ')
}

function systemPrompt() {
  const now = new Date()
  return `Eres Tommy, un asistente personal real. El usuario te habla por chat o por notas de voz y TÚ haces el trabajo.

Fecha de hoy: ${now.toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.
Esta semana: ${weekContext()}.

Tus responsabilidades:
- Armar y ajustar la agenda semanal
- Crear y gestionar recordatorios
- Organizar proyectos y sus tareas
- Recibir ideas sueltas y estructurarlas como contenido (título, formato, ángulo, tags, siguiente paso)

Reglas:
- No le pidas que llene tableros. Si te da una instrucción y puedes ejecutarla, usa las herramientas y luego confirma qué hiciste.
- Si falta un dato crítico (por ejemplo el día o la hora de un recordatorio), pregunta SOLO eso. No hagas un cuestionario.
- Habla en español, claro y breve. Como un asistente cercano, no como un formulario.
- Si te mandan audio, entiende lo que dijo y actúa.
- Cuando estructures una idea de contenido, no la dejes cruda: guarda título, tipo, descripción útil y tags.
- Si te piden la agenda o un resumen, usa las herramientas para leer la memoria real, no inventes.
- Puedes hacer varias acciones en el mismo turno si el usuario pidió varias cosas.`
}

function memoryHint() {
  const snap = memorySnapshot()
  return `Memoria actual (resumen interno, no la copies literal salvo que pregunten):
Agenda días con tareas: ${Object.keys(snap.agenda).length}
Recordatorios: ${snap.recordatorios.length}
Proyectos: ${snap.proyectos.map((p) => p.nombre).join(', ') || 'ninguno'}
Ideas: ${snap.ideas.length}`
}

async function generate(apiKey, model, contents) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: `${systemPrompt()}\n\n${memoryHint()}` }] },
      contents,
      tools: [{ function_declarations: TOOL_DECLARATIONS }],
    }),
  })
  const data = await res.json()
  if (!res.ok) {
    const msg = data?.error?.message || `Error ${res.status} al hablar con Gemini`
    const err = new Error(msg)
    err.status = res.status
    throw err
  }
  return data
}

function partsFromResponse(data) {
  return data?.candidates?.[0]?.content?.parts || []
}

export async function talkToTommy({ apiKey, history, text, audio }) {
  if (!apiKey) {
    throw new Error('Falta tu clave de Gemini. Ábrela en Ajustes: es gratis en Google AI Studio.')
  }

  const userParts = []
  if (text) userParts.push({ text })
  if (audio?.base64) {
    userParts.push({
      inline_data: {
        mime_type: audio.mimeType || 'audio/webm',
        data: audio.base64,
      },
    })
    if (!text) {
      userParts.unshift({
        text: 'El usuario mandó una nota de voz. Entiende lo que dijo y actúa. En tu respuesta, menciona en una frase qué escuchaste.',
      })
    }
  }

  const contents = [
    ...history,
    { role: 'user', parts: userParts },
  ]

  let lastError
  for (const model of MODELS) {
    try {
      return await runLoop(apiKey, model, structuredClone(contents))
    } catch (error) {
      lastError = error
      if (!shouldTryNextModel(error)) break
    }
  }
  throw lastError || new Error('No pude contactar a Gemini.')
}

function shouldTryNextModel(error) {
  const status = error?.status
  const msg = String(error?.message || '').toLowerCase()
  if (status === 404 || status === 400) return true
  return (
    msg.includes('no longer available') ||
    msg.includes('not found') ||
    msg.includes('is not supported') ||
    msg.includes('not available')
  )
}

async function runLoop(apiKey, model, contents) {
  const actions = []
  let data = await generate(apiKey, model, contents)
  let guard = 0

  while (guard < 6) {
    const parts = partsFromResponse(data)
    const calls = parts.filter((p) => p.functionCall)
    const texts = parts.filter((p) => p.text).map((p) => p.text).join('\n').trim()

    if (!calls.length) {
      return { text: texts || 'Listo, ya lo anoté.', actions, model }
    }

    contents.push({ role: 'model', parts })
    const responses = []
    for (const part of calls) {
      const name = part.functionCall.name
      const args = part.functionCall.args || {}
      const result = executeTool(name, args)
      actions.push({ name, args, result })
      responses.push({
        functionResponse: {
          name,
          response: result,
        },
      })
    }
    contents.push({ role: 'user', parts: responses })
    data = await generate(apiKey, model, contents)
    guard += 1
  }

  return { text: 'Hice los cambios, pero el modelo se quedó en un bucle. Revisa la memoria.', actions, model }
}

export function toGeminiHistory(messages) {
  return messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .filter((m) => m.text && !m.error)
    .slice(-16)
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.text }],
    }))
}
