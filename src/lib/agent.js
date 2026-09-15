import { DAY_NAMES, isoDate, memorySnapshot, weekDates, getProfile, getKnowledge, rememberSource } from './storage'
import { executeTool, TOOL_DECLARATIONS } from './tools'
import { createCalendarEvent, listCalendarEvents } from './calendar'
import { identityPrompt } from './identity'
import { hasApiProxy, isLocalHost } from './hosts'

const GROQ_MODELS = ['openai/gpt-oss-20b', 'openai/gpt-oss-120b', 'qwen/qwen3.6-27b']
const GROK_MODELS = ['grok-4.6', 'grok-4.5', 'grok-4']

function groqBase() {
  return hasApiProxy() ? '/groq' : 'https://api.groq.com/openai/v1'
}

function xaiBase() {
  return hasApiProxy() ? '/xai' : 'https://api.x.ai/v1'
}

export function isGrokKey(key) {
  const value = String(key || '').trim()
  if (!value || value.startsWith('gsk_')) return false
  return value.startsWith('xai-') || value.startsWith('xai_') || value.length >= 24
}

function weekContext() {
  return weekDates(0)
    .map((d, i) => `${DAY_NAMES[i]} ${isoDate(d)}`)
    .join(', ')
}

function systemPrompt(online) {
  const now = new Date()
  const profile = getProfile()
  const searchLine = online
    ? '- Estás en línea con Grok. Investiga con web search nativo y, si hace falta, con buscar_internet y leer_pagina. No inventes datos de actualidad.'
    : '- Buscar en internet con buscar_internet y leer URLs con leer_pagina cuando pida investigar.'
  return `Eres Tommy, el asistente de trabajo de ${profile.nombre || 'Diana Stephani Muñoz Ramos (Cali)'}. No eres un planner local. Trabajas como cuando ella te habla en Cursor: investigas, escribes, armas archivos y recuerdas quién es.

${identityPrompt(profile, getKnowledge())}

Fecha de hoy: ${now.toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.
Esta semana: ${weekContext()}.

Cada chat es UN tema. No mezcles clientes ni proyectos salvo que ella lo pida.

Lo que SÍ haces:
${searchLine}
- Crear PDF/documento con crear_pdf, presentaciones con crear_presentacion y guiones con crear_guion. Entrégaselos, no los describas nada más.
- Generar imágenes con Higgsfield Soul (generar_imagen_higgsfield) y videos (generar_video_higgsfield). Si pide Soul, still, imagen, reel o video, genera. No te limites a escribir el prompt.
- Agenda, recordatorios, proyectos, ideas y Google Calendar.
- Aprender: si adjunta bio, brief, formato o te corrige, usa aprender_de_documento o recordar_preferencia. No vuelvas a tratarla como extraña.

Nunca hables de versiones de Tommy. Eres un solo Tommy.
Si puedes ejecutar, usa herramientas y confirma.`
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

function openaiTools() {
  return TOOL_DECLARATIONS.map((tool) => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: jsonSchema(tool.parameters),
    },
  }))
}

function grokTools() {
  return [
    { type: 'web_search' },
    ...TOOL_DECLARATIONS.map((tool) => ({
      type: 'function',
      name: tool.name,
      description: tool.description,
      parameters: jsonSchema(tool.parameters),
    })),
  ]
}

async function parseError(res, data, fallback) {
  const msg = data?.error?.message || data?.error || fallback
  const err = new Error(friendlyError(String(msg), res.status))
  err.status = res.status
  return err
}

function friendlyError(msg, status) {
  const text = String(msg || '')
  const lower = text.toLowerCase()
  if (status === 401 || lower.includes('invalid') || lower.includes('incorrect api')) {
    if (lower.includes('groq') || lower.includes('gsk')) {
      return 'La clave de Groq no es válida. Ábrela en Ajustes y pega una clave nueva de console.groq.com/keys.'
    }
    return 'La clave de Grok no es válida. En Ajustes pega una API key de console.x.ai.'
  }
  if (status === 429) {
    return 'Se acabó la cuota por ahora. Si es Grok, revisa créditos en console.x.ai. Si es Groq, prueba más tarde.'
  }
  if (status === 402 || lower.includes('credits') || lower.includes('billing')) {
    return 'Grok no tiene créditos. Recarga en console.x.ai y vuelve a intentar.'
  }
  return text
}

async function groqChat(apiKey, model, messages) {
  let res
  try {
    res = await fetch(`${groqBase()}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        tools: openaiTools(),
        temperature: 0.3,
      }),
    })
  } catch {
    throw new Error('No pude contactar a Groq. Revisa internet.')
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw await parseError(res, data, `Error ${res.status} al hablar con Groq`)
  return data
}

async function grokRequest(grokKey, body) {
  let res
  try {
    res = await fetch(`${xaiBase()}/responses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${grokKey}`,
      },
      body: JSON.stringify(body),
    })
  } catch {
    throw new Error(
      isLocalHost()
        ? 'No pude contactar a Grok. Revisa internet.'
        : 'Grok no deja llamadas desde GitHub Pages. Ábrelo en el PC: http://localhost:5174',
    )
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw await parseError(res, data, `Error ${res.status} al hablar con Grok`)
  return data
}

async function grokChatCompletions(grokKey, model, messages) {
  let res
  try {
    res = await fetch(`${xaiBase()}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${grokKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        tools: openaiTools(),
        temperature: 0.3,
        search_parameters: { mode: 'auto', return_citations: true },
      }),
    })
  } catch {
    throw new Error(
      isLocalHost()
        ? 'No pude contactar a Grok. Revisa internet.'
        : 'Grok no deja llamadas desde GitHub Pages. Ábrelo en el PC: http://localhost:5174',
    )
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw await parseError(res, data, `Error ${res.status} al hablar con Grok`)
  return data
}

function grokText(data) {
  if (data?.output_text) return String(data.output_text).trim()
  const parts = []
  for (const item of data?.output || []) {
    if (item.type !== 'message') continue
    for (const chunk of item.content || []) {
      if (chunk.text) parts.push(chunk.text)
    }
  }
  return parts.join('\n').trim()
}

async function runTool(name, args, files) {
  if (name === 'listar_calendario') return listCalendarEvents()
  if (name === 'crear_evento_calendario') return createCalendarEvent(args)
  return executeTool(name, args, { files })
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

export async function talkToTommy({ apiKey, grokKey, history, text, audio, files = [] }) {
  const groqOk = String(apiKey || '').startsWith('gsk_')
  const grokOk = isGrokKey(grokKey)
  if (!grokOk && !groqOk) {
    throw new Error('No es Grok. En Ajustes abre Groq (gratis), crea una clave gsk_ y pégala una vez.')
  }

  let userText = (text || '').trim()
  if (audio?.base64) {
    if (!groqOk) {
      throw new Error('El audio sigue usando Groq (gratis, gsk_). Pega esa clave en Ajustes, o escribe el mensaje.')
    }
    const heard = await transcribeAudio(apiKey, audio)
    userText = heard ? `${userText ? `${userText}\n` : ''}${heard}`.trim() : userText || 'Nota de voz vacía'
  }
  const images = files.filter((f) => f.kind === 'image')
  const texts = files.filter((f) => f.kind === 'text')
  if (texts.length) {
    userText += `\n\nArchivos adjuntos:\n${texts.map((f) => `--- ${f.name} ---\n${f.text}`).join('\n\n')}`
    texts.forEach((file) => rememberSource(file.name, file.text))
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
    { role: 'system', content: `${systemPrompt(grokOk)}\n\n${memoryHint()}` },
    ...history,
    { role: 'user', content: userContent },
  ]

  if (grokOk) {
    try {
      const result = await runGrokLoop(grokKey, messages, files)
      return { ...result, transcript: userText }
    } catch (error) {
      if (!shouldTryCompletions(error)) throw error
      const result = await runLoop(grokKey, GROK_MODELS, messages, files, grokChatCompletions)
      return { ...result, transcript: userText }
    }
  }

  const models = images.length
    ? ['qwen/qwen3.6-27b', 'openai/gpt-oss-20b', 'openai/gpt-oss-120b']
    : GROQ_MODELS
  const result = await runLoop(apiKey, models, messages, files, groqChat)
  return { ...result, transcript: userText }
}

function shouldTryCompletions(error) {
  const msg = String(error?.message || '').toLowerCase()
  return (
    error?.status === 404
    || msg.includes('not found')
    || msg.includes('unknown path')
    || msg.includes('/responses')
  )
}

function shouldTryNext(error) {
  const msg = String(error?.message || '').toLowerCase()
  return (
    error?.status === 404 ||
    error?.status === 400 ||
    msg.includes('not found') ||
    msg.includes('decommissioned') ||
    msg.includes('does not exist') ||
    msg.includes('model')
  )
}

function collectDownloads(actions) {
  return actions.flatMap((item) => {
    if (Array.isArray(item.result?.downloads) && item.result.downloads.length) return item.result.downloads
    if (item.result?.download) return [item.result.download]
    return []
  })
}

function grokUserInput(content) {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return String(content || '')
  return content.map((part) => {
    if (part.type === 'text') return { type: 'input_text', text: part.text }
    if (part.type === 'image_url') {
      const url = part.image_url?.url || part.image_url
      return { type: 'input_image', image_url: url }
    }
    return part
  })
}

async function runGrokLoop(grokKey, messages, files = []) {
  const tools = grokTools()
  const input = messages.map((item) => {
    if (item.role === 'system') return { role: 'system', content: item.content }
    if (item.role === 'assistant') return { role: 'assistant', content: item.content || '' }
    return { role: item.role, content: grokUserInput(item.content) }
  })

  let lastError
  let data
  for (const model of GROK_MODELS) {
    try {
      data = await grokRequest(grokKey, { model, input, tools, store: true, temperature: 0.3 })
      lastError = null
      break
    } catch (error) {
      lastError = error
      if (!shouldTryNext(error)) break
    }
  }
  if (!data) throw lastError || new Error('No pude contactar a Grok.')

  const actions = []
  let guard = 0
  const modelName = data.model || 'grok-4.6'

  while (guard < 8) {
    const calls = (data.output || []).filter((item) => item.type === 'function_call')
    if (!calls.length) {
      return {
        text: grokText(data) || 'Listo, ya lo anoté.',
        actions,
        downloads: collectDownloads(actions),
        model: modelName,
      }
    }

    const outputs = []
    for (const call of calls) {
      let args = {}
      try {
        args = JSON.parse(call.arguments || '{}')
      } catch {
        args = {}
      }
      const result = await runTool(call.name, args, files)
      actions.push({ name: call.name, args, result })
      outputs.push({
        type: 'function_call_output',
        call_id: call.call_id,
        output: JSON.stringify(result),
      })
    }

    data = await grokRequest(grokKey, {
      model: modelName,
      input: outputs,
      tools,
      previous_response_id: data.id,
      temperature: 0.3,
    })
    guard += 1
  }

  return {
    text: 'Hice los cambios, pero el modelo se quedó en un bucle. Revisa la memoria.',
    actions,
    downloads: collectDownloads(actions),
    model: modelName,
  }
}

async function runLoop(apiKey, models, messages, files, chatFn) {
  const actions = []
  let lastError
  let data
  let modelUsed = models[0]
  for (const model of models) {
    try {
      data = await chatFn(apiKey, model, messages)
      modelUsed = model
      lastError = null
      break
    } catch (error) {
      lastError = error
      if (!shouldTryNext(error)) break
    }
  }
  if (!data) throw lastError || new Error('No pude contactar al modelo.')

  let guard = 0
  while (guard < 6) {
    const choice = data?.choices?.[0]?.message || {}
    const calls = choice.tool_calls || []
    if (!calls.length) {
      return {
        text: (choice.content || 'Listo, ya lo anoté.').trim(),
        actions,
        downloads: collectDownloads(actions),
        model: modelUsed,
      }
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
      const result = await runTool(name, args, files)
      actions.push({ name, args, result })
      messages.push({
        role: 'tool',
        tool_call_id: call.id,
        content: JSON.stringify(result),
      })
    }
    data = await chatFn(apiKey, modelUsed, messages)
    guard += 1
  }

  return {
    text: 'Hice los cambios, pero el modelo se quedó en un bucle. Revisa la memoria.',
    actions,
    downloads: collectDownloads(actions),
    model: modelUsed,
  }
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
