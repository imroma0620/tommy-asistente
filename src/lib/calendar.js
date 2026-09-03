import { isoDate, weekDates } from './storage'

const SCOPE = 'https://www.googleapis.com/auth/calendar.events'

function token() {
  try {
    return sessionStorage.getItem('tommy_gcal') || ''
  } catch {
    return ''
  }
}

export function calendarConnected() {
  return Boolean(token())
}

export async function loadGoogle() {
  if (window.google?.accounts?.oauth2) return
  await new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.onload = resolve
    script.onerror = () => reject(new Error('No pude cargar Google'))
    document.head.appendChild(script)
  })
}

export async function connectCalendar(clientId) {
  if (!clientId) throw new Error('Falta el Client ID de Google.')
  await loadGoogle()
  return new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId.trim(),
      scope: SCOPE,
      error_callback: (err) => {
        reject(new Error(err?.message || err?.type || 'Google rechazó la conexión.'))
      },
      callback: (resp) => {
        if (resp.error) reject(new Error(resp.error))
        else {
          try { sessionStorage.setItem('tommy_gcal', resp.access_token) } catch { /* Safari */ }
          resolve(resp.access_token)
        }
      },
    })
    client.requestAccessToken()
  })
}

export function disconnectCalendar() {
  try { sessionStorage.removeItem('tommy_gcal') } catch { /* Safari */ }
}

async function calendarFetch(path, options = {}) {
  const access = token()
  if (!access) return { ok: false, error: 'Calendario no conectado.' }
  const res = await fetch(`https://www.googleapis.com/calendar/v3${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${access}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) return { ok: false, error: data?.error?.message || `Calendario ${res.status}` }
  return { ok: true, data }
}

export function eventDayKey(inicio) {
  if (!inicio) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(inicio)) return inicio
  return isoDate(new Date(inicio))
}

export function eventTimeLabel(inicio) {
  if (!inicio || /^\d{4}-\d{2}-\d{2}$/.test(inicio)) return ''
  const d = new Date(inicio)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
}

export async function listCalendarEvents(range) {
  const week = weekDates(0)
  const from = range?.from || week[0]
  const to = range?.to || (() => {
    const end = new Date(week[6])
    end.setHours(23, 59, 59, 999)
    return end
  })()
  const path = `/calendars/primary/events?maxResults=120&singleEvents=true&orderBy=startTime&timeMin=${encodeURIComponent(from.toISOString())}&timeMax=${encodeURIComponent(to.toISOString())}`
  const result = await calendarFetch(path)
  if (!result.ok) return result
  return {
    ok: true,
    eventos: (result.data.items || []).map((event) => ({
      id: event.id,
      titulo: event.summary || '(Sin título)',
      inicio: event.start?.dateTime || event.start?.date,
      fin: event.end?.dateTime || event.end?.date,
    })),
  }
}

export async function createCalendarEvent(args = {}) {
  const start = args.hora
    ? new Date(`${args.fecha}T${args.hora}:00`)
    : new Date(`${args.fecha}T09:00:00`)
  if (Number.isNaN(start.getTime())) return { ok: false, error: 'Fecha u hora inválida' }
  const end = new Date(start.getTime() + (Number(args.duracionMin || 60) * 60000))
  return calendarFetch('/calendars/primary/events', {
    method: 'POST',
    body: JSON.stringify({
      summary: args.titulo || args.texto,
      description: args.nota || 'Creado por Tommy',
      start: { dateTime: start.toISOString() },
      end: { dateTime: end.toISOString() },
    }),
  })
}
