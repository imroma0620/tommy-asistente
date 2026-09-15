import { IDENTITY } from './identity'
import { applySeedMerge } from './seeds'
import {
  cloudSnapshot,
  mergeCloudLocal,
  pullRemoteState,
  pushRemoteState,
  syncEnabled,
} from './syncRemote'

const KEYS = {
  agenda: 'tommy_agenda',
  recordatorios: 'tommy_recordatorios',
  proyectos: 'tommy_proyectos',
  ideas: 'tommy_ideas',
  chat: 'tommy_chat',
  conversations: 'tommy_conversations',
  activeId: 'tommy_active_id',
  settings: 'tommy_settings',
  profile: 'tommy_profile',
  knowledge: 'tommy_knowledge',
}

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    schedulePush()
  } catch {
    // Safari privado o ITP
  }
}

function snapshotAll() {
  return {
    settings: getSettings(),
    profile: getProfile(),
    chat: getChat(),
    conversations: read(KEYS.conversations, []),
    activeId: read(KEYS.activeId, ''),
    agenda: getAgenda(),
    recordatorios: getReminders(),
    proyectos: getProjects(),
    ideas: getIdeas(),
    knowledge: getKnowledge(),
  }
}

function workSnapshot() {
  return {
    agenda: getAgenda(),
    recordatorios: getReminders(),
    proyectos: getProjects(),
    ideas: getIdeas(),
  }
}

function persistWorkSlice(slice) {
  if (slice.agenda) localStorage.setItem(KEYS.agenda, JSON.stringify(slice.agenda))
  if (slice.recordatorios) localStorage.setItem(KEYS.recordatorios, JSON.stringify(slice.recordatorios))
  if (slice.proyectos) localStorage.setItem(KEYS.proyectos, JSON.stringify(slice.proyectos))
  if (slice.ideas) localStorage.setItem(KEYS.ideas, JSON.stringify(slice.ideas))
}

let pushTimer
let cloudSync = false

function schedulePush() {
  if (!cloudSync) return
  clearTimeout(pushTimer)
  pushTimer = setTimeout(() => {
    pushRemoteState(cloudSnapshot(workSnapshot())).catch(() => {})
  }, 400)
}

function profileHasContent(profile) {
  return Boolean(profile?.nombre || profile?.comoHabla || profile?.comoPiensa || (profile?.hechos || []).length)
}

export async function syncOnBoot() {
  applyLocalSeeds()

  const pull = await pullRemoteState()
  if (pull.ok) {
    cloudSync = true
    const remote = pull.state || {}
    if (remote.settings || remote.profile || remote.conversations) {
      const localSettings = getSettings()
      const mergedSettings = {
        ...(remote.settings || {}),
        ...localSettings,
        apiKey: localSettings.apiKey || remote.settings?.apiKey || '',
        grokKey: localSettings.grokKey || remote.settings?.grokKey || '',
        googleClientId: localSettings.googleClientId || remote.settings?.googleClientId || '',
        higgsfieldKeyId: localSettings.higgsfieldKeyId || remote.settings?.higgsfieldKeyId || '',
        higgsfieldSecret: localSettings.higgsfieldSecret || remote.settings?.higgsfieldSecret || '',
      }
      localStorage.setItem(KEYS.settings, JSON.stringify(mergedSettings))

      if (!profileHasContent(getProfile()) && remote.profile) {
        localStorage.setItem(KEYS.profile, JSON.stringify(remote.profile))
      }

      const localConvos = read(KEYS.conversations, [])
      if (!localConvos.length && remote.conversations?.length) {
        localStorage.setItem(KEYS.conversations, JSON.stringify(remote.conversations))
        if (remote.activeId) localStorage.setItem(KEYS.activeId, JSON.stringify(remote.activeId))
      } else if (!getChat().length && remote.chat?.length) {
        localStorage.setItem(KEYS.chat, JSON.stringify(remote.chat))
      }
      if (!getKnowledge().length && remote.knowledge?.length) {
        localStorage.setItem(KEYS.knowledge, JSON.stringify(remote.knowledge))
      }
    }

    const merged = mergeCloudLocal(workSnapshot(), remote)
    persistWorkSlice(merged)
  } else if (syncEnabled()) {
    cloudSync = true
  }

  seedIdentity()
  migrateConversations()
  applyLocalSeeds()

  if (cloudSync) {
    await pushRemoteState(cloudSnapshot(workSnapshot())).catch(() => {})
  }
}

/** Fusiona proyectos IM ROMA e Iván aunque no haya nube. */
export function applyLocalSeeds() {
  const merged = applySeedMerge(workSnapshot())
  persistWorkSlice(merged)
  return merged
}

export function getSettings() {
  return read(KEYS.settings, {
    apiKey: '',
    grokKey: '',
    voiceReplies: false,
    googleClientId: '',
    higgsfieldKeyId: '',
    higgsfieldSecret: '',
  })
}

export function saveSettings(settings) {
  write(KEYS.settings, { ...getSettings(), ...settings })
}

export function getProfile() {
  return read(KEYS.profile, {
    nombre: '',
    comoHabla: '',
    comoPiensa: '',
    comoActua: '',
    reglas: [],
    ejemplos: [],
    evitar: [],
    hechos: [],
  })
}

export function saveProfile(profile) {
  write(KEYS.profile, { ...getProfile(), ...profile })
}

function uniqueList(list) {
  const seen = new Set()
  const out = []
  for (const item of list || []) {
    const key = String(item || '').trim()
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(key)
  }
  return out
}

export function seedIdentity() {
  const p = getProfile()
  saveProfile({
    nombre: p.nombre || IDENTITY.nombre,
    comoHabla: p.comoHabla || IDENTITY.comoHabla,
    comoPiensa: p.comoPiensa || IDENTITY.comoPiensa,
    comoActua: p.comoActua || IDENTITY.comoActua,
    reglas: uniqueList([...(IDENTITY.reglas), ...(p.reglas || [])]),
    ejemplos: uniqueList([...(IDENTITY.ejemplos), ...(p.ejemplos || [])]),
    evitar: uniqueList([...(IDENTITY.evitar), ...(p.evitar || [])]),
    hechos: uniqueList([...(IDENTITY.hechos), ...(p.hechos || [])]).slice(-80),
  })
  saveSettings({ identitySeeded: true })
}

export function getKnowledge() {
  return read(KEYS.knowledge, [])
}

export function rememberSource(name, text) {
  const body = String(text || '').replace(/\s+/g, ' ').trim()
  if (!body || body.length < 40) return
  const entry = {
    id: Date.now(),
    name: name || 'documento',
    text: body.slice(0, 12000),
    at: Date.now(),
  }
  const rest = getKnowledge().filter((item) => item.name !== entry.name)
  write(KEYS.knowledge, [entry, ...rest].slice(0, 24))
}

export function rememberFacts(facts = []) {
  const current = getProfile()
  const hechos = uniqueList([...(current.hechos || []), ...facts]).slice(-80)
  saveProfile({ ...current, hechos })
}

function titleFrom(messages) {
  const user = (messages || []).find((m) => m.role === 'user' && m.text)
  const text = String(user?.text || '').replace(/\s+/g, ' ').trim()
  if (!text) return 'Nueva conversación'
  return text.length > 36 ? `${text.slice(0, 36)}…` : text
}

function migrateConversations() {
  const current = read(KEYS.conversations, [])
  if (current.length) {
    if (!read(KEYS.activeId, '')) write(KEYS.activeId, current[0].id)
    return current
  }
  const old = getChat()
  const first = {
    id: 'c-main',
    title: titleFrom(old) || 'Conversación',
    updatedAt: Date.now(),
    messages: old.length ? old : [],
  }
  write(KEYS.conversations, [first])
  write(KEYS.activeId, first.id)
  return [first]
}

export function getConversations() {
  return migrateConversations().slice().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
}

export function getActiveId() {
  migrateConversations()
  return read(KEYS.activeId, 'c-main')
}

export function setActiveId(id) {
  write(KEYS.activeId, id)
}

export function saveConversationMessages(id, messages) {
  const list = getConversations().map((c) =>
    c.id === id
      ? { ...c, messages: messages.slice(-80), title: titleFrom(messages), updatedAt: Date.now() }
      : c,
  )
  write(KEYS.conversations, list)
  if (id === getActiveId()) write(KEYS.chat, messages.slice(-80))
}

export function createConversation(welcome) {
  const conv = {
    id: `c-${Date.now()}`,
    title: 'Nueva conversación',
    updatedAt: Date.now(),
    messages: welcome ? [welcome] : [],
  }
  write(KEYS.conversations, [conv, ...getConversations()])
  write(KEYS.activeId, conv.id)
  write(KEYS.chat, conv.messages)
  return conv
}

export function deleteConversation(id) {
  const rest = getConversations().filter((c) => c.id !== id)
  if (!rest.length) {
    return createConversation()
  }
  write(KEYS.conversations, rest)
  if (getActiveId() === id) {
    write(KEYS.activeId, rest[0].id)
    write(KEYS.chat, rest[0].messages || [])
  }
  return rest[0]
}

export function getChat() {
  return read(KEYS.chat, [])
}

export function saveChat(messages) {
  write(KEYS.chat, messages.slice(-80))
}

export function getAgenda() {
  return read(KEYS.agenda, {})
}

export function saveAgenda(agenda) {
  write(KEYS.agenda, agenda)
}

export function getReminders() {
  return read(KEYS.recordatorios, [])
}

export function saveReminders(items) {
  write(KEYS.recordatorios, items)
}

export function getProjects() {
  return read(KEYS.proyectos, [])
}

export function saveProjects(items) {
  write(KEYS.proyectos, items)
}

export function getIdeas() {
  return read(KEYS.ideas, [])
}

export function saveIdeas(items) {
  write(KEYS.ideas, items)
}

export function memorySnapshot() {
  return {
    agenda: getAgenda(),
    recordatorios: getReminders(),
    proyectos: getProjects(),
    ideas: getIdeas(),
  }
}

export function weekDates(offset = 0) {
  const now = new Date()
  const day = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + offset * 7)
  monday.setHours(0, 0, 0, 0)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

export function isoDate(date) {
  const d = new Date(date)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
