import { isoDate, weekDates } from './storage'

const SCOPE = 'https://www.googleapis.com/auth/calendar.events'
const TOKEN_KEY = 'tommy_gcal'
const EXP_KEY = 'tommy_gcal_exp'
export const DEFAULT_GOOGLE_CLIENT_ID = '602305915619-ossmsvibhoo3e95bl88t2um9gk41dq3j.apps.googleusercontent.com'
export const GOOGLE_JS_ORIGIN = 'https://imroma0620.github.io'
export const GOOGLE_REDIRECT = 'https://imroma0620.github.io/tommy-asistente/'

export function googleJsOrigin() {
  return window.location.origin
}

export function googleRedirectUri() {
  if (window.location.hostname.endsWith('github.io')) return GOOGLE_REDIRECT
  return `${window.location.origin}/`
}

function isPhone() {
  return /iPhone|iPad|Android/i.test(navigator.userAgent)
    || window.matchMedia('(display-mode: standalone)').matches
    || Boolean(window.navigator.standalone)
}

function readStore(key) {
  try { return localStorage.getItem(key) || sessionStorage.getItem(key) || '' } catch { return '' }
}

function writeStore(key, value) {
  try { localStorage.setItem(key, value) } catch { /* Safari */ }
  try { sessionStorage.removeItem(key) } catch { /* Safari */ }
}

function clearStore(key) {
  try { localStorage.removeItem(key) } catch { /* Safari */ }
  try { sessionStorage.removeItem(key) } catch { /* Safari */ }
}

function token() {
  const access = readStore(TOKEN_KEY)
  if (!access) return ''
  const exp = Number(readStore(EXP_KEY) || 0)
  if (exp && Date.now() > exp) {
    clearStore(TOKEN_KEY)
    clearStore(EXP_KEY)
    return ''
  }
  return access
}

function saveToken(access, expiresIn = 3600) {
  const seconds = Math.max(60, Number(expiresIn) || 3600)
  writeStore(TOKEN_KEY, access)
  writeStore(EXP_KEY, String(Date.now() + (seconds - 60) * 1000))
}

export function calendarConnected() {
  return Boolean(token())
}

function friendlyOAuthError(raw) {
  const text = String(raw || '')
  if (/origin_mismatch|javascript origin/i.test(text)) {
    return 'Google no acepta el link largo de GitHub. En Credenciales pega solo el origen https://imroma0620.github.io'
  }
  if (/redirect_uri_mismatch/i.test(text)) {
    return 'Falta la URI de redirección https://imroma0620.github.io/tommy-asistente/ en tu cliente de Google.'
  }
  if (/popup|closed|access_denied|popup_closed/i.test(text)) {
    return 'Google se cerró. Toca Conectar otra vez.'
  }
  return text || 'Google rechazó la conexión.'
}

export function captureCalendarRedirect() {
  const hash = window.location.hash || ''
  if (!hash.includes('access_token=') && !hash.includes('error=')) {
    return { ok: calendarConnected() }
  }
  const params = new URLSearchParams(hash.replace(/^#/, ''))
  try {
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
  } catch { /* Safari */ }
  const error = params.get('error')
  if (error) return { ok: false, error: friendlyOAuthError(error) }
  const access = params.get('access_token')
  if (!access) return { ok: calendarConnected() }
  saveToken(access, params.get('expires_in'))
  return { ok: true }
}

function beginRedirect(clientId) {
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.searchParams.set('client_id', clientId.trim())
  url.searchParams.set('redirect_uri', googleRedirectUri())
  url.searchParams.set('response_type', 'token')
  url.searchParams.set('scope', SCOPE)
  url.searchParams.set('include_granted_scopes', 'true')
  url.searchParams.set('prompt', 'select_account')
  window.location.assign(url.toString())
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

async function connectWithPopup(clientId) {
  await loadGoogle()
  return new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId.trim(),
      scope: SCOPE,
      error_callback: (err) => {
        reject(new Error(friendlyOAuthError(err?.message || err?.type)))
      },
      callback: (resp) => {
        if (resp.error) reject(new Error(friendlyOAuthError(resp.error)))
        else {
          saveToken(resp.access_token, resp.expires_in)
          resolve(resp.access_token)
        }
      },
    })
    client.requestAccessToken()
  })
}

export async function connectCalendar(clientId) {
  const id = (clientId || DEFAULT_GOOGLE_CLIENT_ID).trim()
  if (!id) throw new Error('Falta el Client ID de Google.')
  if (isPhone()) {
    beginRedirect(id)
    return new Promise(() => {})
  }
  try {
    return await connectWithPopup(id)
  } catch (error) {
    beginRedirect(id)
    return new Promise(() => {})
  }
}

export function disconnectCalendar() {
  clearStore(TOKEN_KEY)
  clearStore(EXP_KEY)
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
  if (res.status === 401) {
    disconnectCalendar()
    return { ok: false, error: 'Google se desconectó. Toca Vincular Google.' }
  }
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
