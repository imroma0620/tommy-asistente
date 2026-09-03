const KEYS = {
  agenda: 'tommy_agenda',
  recordatorios: 'tommy_recordatorios',
  proyectos: 'tommy_proyectos',
  ideas: 'tommy_ideas',
  chat: 'tommy_chat',
  settings: 'tommy_settings',
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
  localStorage.setItem(key, JSON.stringify(value))
}

export function getSettings() {
  return read(KEYS.settings, { apiKey: '', voiceReplies: false })
}

export function saveSettings(settings) {
  write(KEYS.settings, { ...getSettings(), ...settings })
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
