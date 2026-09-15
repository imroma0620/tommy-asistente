import { applyRemoteSeeds, defaultRemoteSlice } from './seeds.mjs'

const WORKSPACE = process.env.TOMMY_WORKSPACE || 'im-roma-diana'
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN
const SB_URL = process.env.SUPABASE_URL
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY

function redisKey() {
  return `tommy:state:${WORKSPACE}`
}

async function redisGet() {
  if (!REDIS_URL || !REDIS_TOKEN) return null
  const res = await fetch(`${REDIS_URL}/get/${encodeURIComponent(redisKey())}`, {
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
  })
  const data = await res.json()
  if (!data.result) return null
  try {
    return JSON.parse(data.result)
  } catch {
    return null
  }
}

async function redisSet(state) {
  if (!REDIS_URL || !REDIS_TOKEN) return false
  const res = await fetch(`${REDIS_URL}/set/${encodeURIComponent(redisKey())}/${encodeURIComponent(JSON.stringify(state))}`, {
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
  })
  const data = await res.json()
  return data.result === 'OK'
}

async function supabaseGet() {
  if (!SB_URL || !SB_KEY) return null
  const q = `${SB_URL.replace(/\/$/, '')}/rest/v1/tommy_sync?workspace_id=eq.${encodeURIComponent(WORKSPACE)}&select=payload`
  const res = await fetch(q, {
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
    },
  })
  if (!res.ok) return null
  const rows = await res.json()
  return rows[0]?.payload || null
}

async function supabaseSet(state) {
  if (!SB_URL || !SB_KEY) return false
  const res = await fetch(`${SB_URL.replace(/\/$/, '')}/rest/v1/tommy_sync`, {
    method: 'POST',
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify({
      workspace_id: WORKSPACE,
      payload: state,
      updated_at: new Date().toISOString(),
    }),
  })
  return res.ok
}

export async function loadRemoteState() {
  const fromRedis = await redisGet()
  if (fromRedis) return applyRemoteSeeds(fromRedis)
  const fromSb = await supabaseGet()
  if (fromSb) return applyRemoteSeeds(fromSb)
  return defaultRemoteSlice()
}

export async function saveRemoteState(state) {
  if (await redisSet(state)) return true
  if (await supabaseSet(state)) return true
  return false
}

export function checkApiToken(req) {
  const expected = process.env.TOMMY_API_TOKEN
  if (!expected) return true
  const header = req.headers.authorization || req.headers.Authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  return token === expected
}

export function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,PUT,POST,PATCH,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Cache-Control': 'no-store',
  }
}
