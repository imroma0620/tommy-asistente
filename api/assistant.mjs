import { checkApiToken, corsHeaders, loadRemoteState, saveRemoteState } from './_lib/stateStore.mjs'
import { mergeAgenda, mergeProjects, mergeRecordatorios } from './_lib/seeds.mjs'

function parseBody(req) {
  let body = req.body
  if (typeof body === 'string') {
    body = JSON.parse(body || '{}')
  }
  return body || {}
}

export default async function handler(req, res) {
  Object.entries(corsHeaders()).forEach(([k, v]) => res.setHeader(k, v))
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Usa POST' })
    return
  }
  if (!checkApiToken(req)) {
    res.status(401).json({ error: 'Authorization: Bearer <TOMMY_API_TOKEN>' })
    return
  }

  let action
  try {
    action = parseBody(req)
  } catch {
    res.status(400).json({ error: 'JSON inválido' })
    return
  }

  const state = await loadRemoteState()
  const now = Date.now()

  if (action.type === 'create_project' || action.action === 'create_project') {
    const nombre = String(action.nombre || action.name || '').trim()
    if (!nombre) {
      res.status(400).json({ error: 'Falta nombre' })
      return
    }
    const proyectos = [...(state.proyectos || [])]
    if (!proyectos.some((p) => String(p.nombre).trim().toLowerCase() === nombre.toLowerCase())) {
      proyectos.push({
        id: action.id || `api-proj-${now}`,
        nombre,
        descripcion: action.descripcion || action.description || '',
        tareas: [],
        updatedAt: now,
      })
    }
    state.proyectos = proyectos
  } else if (action.type === 'agenda_event' || action.action === 'crear_tarea_agenda') {
    const fecha = String(action.fecha || action.date || '').trim()
    const texto = String(action.texto || action.text || action.titulo || '').trim()
    const hora = String(action.hora || action.time || '').trim()
    if (!fecha || !texto) {
      res.status(400).json({ error: 'Faltan fecha y texto' })
      return
    }
    const agenda = { ...(state.agenda || {}) }
    const list = [...(agenda[fecha] || [])]
    list.push({
      id: action.id || `api-agenda-${now}`,
      text: texto,
      time: hora,
      done: false,
      updatedAt: now,
    })
    agenda[fecha] = list
    state.agenda = agenda
  } else if (action.type === 'create_idea' || action.action === 'guardar_idea') {
    const titulo = String(action.titulo || action.title || '').trim()
    if (!titulo) {
      res.status(400).json({ error: 'Falta titulo' })
      return
    }
    const ideas = [
      {
        id: action.id || `api-idea-${now}`,
        titulo,
        descripcion: action.descripcion || action.description || '',
        tipo: action.tipo || 'Reel',
        tags: action.tags || [],
        estado: action.estado || 'idea',
        destacada: false,
        updatedAt: now,
      },
      ...(state.ideas || []),
    ]
    state.ideas = ideas
  } else if (action.type === 'patch' && action.payload) {
    Object.assign(state, action.payload)
  } else {
    res.status(400).json({
      error: 'Acción desconocida',
      ejemplos: [
        { type: 'create_project', nombre: 'Mi cliente' },
        { type: 'agenda_event', fecha: '2026-09-17', hora: '08:30', texto: 'Reunión' },
        { type: 'create_idea', titulo: 'Hook para reel' },
      ],
    })
    return
  }

  const seededProjects = mergeProjects(state.proyectos || [])
  state.proyectos = seededProjects.items
  const seededAgenda = mergeAgenda(state.agenda || {})
  state.agenda = seededAgenda.agenda
  const seededReminders = mergeRecordatorios(state.recordatorios || [])
  state.recordatorios = seededReminders.recordatorios
  state.meta = { ...(state.meta || {}), updatedAt: now }

  await saveRemoteState(state)
  res.status(200).json({ ok: true, state })
}
