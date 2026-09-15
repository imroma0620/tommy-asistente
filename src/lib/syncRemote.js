import { isLocalHost } from './hosts'

const WORKSPACE = import.meta.env.VITE_TOMMY_WORKSPACE || 'im-roma-diana'

export function syncEnabled() {
  return Boolean(resolveSyncBase() || supabaseConfig())
}

export function resolveSyncBase() {
  const custom = String(import.meta.env.VITE_SYNC_URL || '').trim().replace(/\/$/, '')
  if (custom) return custom
  if (typeof window !== 'undefined' && isLocalHost()) return ''
  return ''
}

function supabaseConfig() {
  const url = String(import.meta.env.VITE_SUPABASE_URL || '').trim()
  const key = String(import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim()
  if (!url || !key) return null
  return { url: url.replace(/\/$/, ''), key }
}

async function supabasePull() {
  const cfg = supabaseConfig()
  if (!cfg) return null
  const q = `${cfg.url}/rest/v1/tommy_sync?workspace_id=eq.${encodeURIComponent(WORKSPACE)}&select=payload,updated_at`
  const res = await fetch(q, {
    headers: {
      apikey: cfg.key,
      Authorization: `Bearer ${cfg.key}`,
    },
  })
  if (!res.ok) throw new Error(`Supabase sync ${res.status}`)
  const rows = await res.json()
  return rows[0]?.payload || {}
}

async function supabasePush(payload) {
  const cfg = supabaseConfig()
  if (!cfg) return false
  const res = await fetch(`${cfg.url}/rest/v1/tommy_sync`, {
    method: 'POST',
    headers: {
      apikey: cfg.key,
      Authorization: `Bearer ${cfg.key}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify({
      workspace_id: WORKSPACE,
      payload,
      updated_at: new Date().toISOString(),
    }),
  })
  return res.ok
}

export async function pullRemoteState() {
  const sb = supabaseConfig()
  if (sb) {
    try {
      return { ok: true, state: await supabasePull(), via: 'supabase' }
    } catch (e) {
      return { ok: false, error: e.message, via: 'supabase' }
    }
  }
  const base = resolveSyncBase()
  const url = base ? `${base}/api/state` : '/api/state'
  try {
    const res = await Promise.race([
      fetch(url, { headers: { Accept: 'application/json' } }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000)),
    ])
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}`, via: 'http' }
    return { ok: true, state: await res.json(), via: 'http' }
  } catch (e) {
    return { ok: false, error: e.message, via: 'http' }
  }
}

export async function pushRemoteState(payload) {
  const sb = supabaseConfig()
  if (sb) {
    const ok = await supabasePush(payload)
    return { ok, via: 'supabase' }
  }
  const base = resolveSyncBase()
  const url = base ? `${base}/api/state` : '/api/state'
  try {
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    return { ok: res.ok, via: 'http' }
  } catch {
    return { ok: false, via: 'http' }
  }
}

/** Campos que viajan a la nube (sin claves API ni chat completo). */
export function cloudSnapshot(full) {
  return {
    meta: { workspace: WORKSPACE, updatedAt: Date.now() },
    agenda: full.agenda,
    recordatorios: full.recordatorios,
    proyectos: full.proyectos,
    ideas: full.ideas,
  }
}

function mergeListById(local = [], remote = []) {
  const map = new Map()
  for (const item of remote) {
    if (item?.id != null) map.set(String(item.id), item)
  }
  for (const item of local) {
    const id = String(item?.id)
    if (!id) continue
    const prev = map.get(id)
    const localTs = item.updatedAt || 0
    const remoteTs = prev?.updatedAt || 0
    map.set(id, localTs >= remoteTs ? item : prev)
  }
  return [...map.values()]
}

function mergeAgendaMaps(local = {}, remote = {}) {
  const keys = new Set([...Object.keys(local), ...Object.keys(remote)])
  const out = {}
  for (const key of keys) {
    out[key] = mergeListById(local[key] || [], remote[key] || [])
  }
  return out
}

export function mergeCloudLocal(localSnap, remoteSnap) {
  if (!remoteSnap || typeof remoteSnap !== 'object') return localSnap
  return {
    agenda: mergeAgendaMaps(localSnap.agenda, remoteSnap.agenda),
    recordatorios: mergeListById(localSnap.recordatorios, remoteSnap.recordatorios),
    proyectos: mergeListById(localSnap.proyectos, remoteSnap.proyectos),
    ideas: mergeListById(localSnap.ideas, remoteSnap.ideas),
  }
}
