import { corsHeaders, loadRemoteState, saveRemoteState } from './_lib/stateStore.mjs'

export default async function handler(req, res) {
  Object.entries(corsHeaders()).forEach(([k, v]) => res.setHeader(k, v))
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  if (req.method === 'GET') {
    const state = await loadRemoteState()
    res.status(200).json(state)
    return
  }

  if (req.method === 'PUT' || req.method === 'POST') {
    let body = req.body
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body)
      } catch {
        res.status(400).json({ error: 'JSON inválido' })
        return
      }
    }
    const current = await loadRemoteState()
    const next = { ...current, ...body, meta: { ...(body.meta || {}), updatedAt: Date.now() } }
    const saved = await saveRemoteState(next)
    res.status(200).json({ ok: true, persisted: saved })
    return
  }

  res.status(405).json({ error: 'Método no permitido' })
}
