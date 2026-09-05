import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST = path.join(__dirname, 'dist')
const PORT = Number(process.env.TOMMY_PORT || 8787)
const DATA_DIR = path.join(__dirname, 'data')
const STATE_FILE = path.join(DATA_DIR, 'state.json')
const GROQ = 'https://api.groq.com/openai/v1'
const PHONE_HOME = 'https://imroma0620.github.io/tommy-asistente/'

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'))
  } catch {
    return {}
  }
}

function saveState(state) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2))
}

function lanIp() {
  const nets = os.networkInterfaces()
  for (const list of Object.values(nets)) {
    for (const item of list || []) {
      if (item.family === 'IPv4' && !item.internal) return item.address
    }
  }
  return 'localhost'
}

function info() {
  const ip = lanIp()
  return {
    lan: `http://${ip}:${PORT}`,
    local: `http://localhost:${PORT}`,
    https: PHONE_HOME,
    ready: true,
  }
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Cache-Control', 'no-store')
}

function json(res, code, obj) {
  cors(res)
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(obj))
}

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase()
  const types = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.webmanifest': 'application/manifest+json',
    '.json': 'application/json',
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      cors(res)
      res.writeHead(404)
      res.end('No encontrado')
      return
    }
    cors(res)
    const headers = { 'Content-Type': types[ext] || 'application/octet-stream' }
    if (ext === '.html') headers['Cache-Control'] = 'no-store'
    res.writeHead(200, headers)
    res.end(data)
  })
}

function collect(req) {
  return new Promise((resolve) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks)))
  })
}

function openFirewall() {
  spawn('netsh', [
    'advfirewall', 'firewall', 'add', 'rule',
    'name=Tommy 8787', 'dir=in', 'action=allow', 'protocol=TCP', `localport=${PORT}`,
  ], { windowsHide: true }).on('error', () => {})
}

const server = http.createServer(async (req, res) => {
  try {
    cors(res)
    if (req.method === 'OPTIONS') {
      res.writeHead(204)
      res.end()
      return
    }
    const url = new URL(req.url, `http://localhost:${PORT}`)
    if (url.pathname === '/api/info') {
      json(res, 200, info())
      return
    }
    if (url.pathname === '/api/state') {
      if (req.method === 'GET') {
        json(res, 200, loadState())
        return
      }
      if (req.method === 'PUT' || req.method === 'POST') {
        const raw = await collect(req)
        const incoming = JSON.parse(raw.toString('utf8') || '{}')
        const current = loadState()
        const next = { ...current, ...incoming }
        saveState(next)
        json(res, 200, { ok: true })
        return
      }
    }
    if (url.pathname === '/web') {
      const target = url.searchParams.get('url') || ''
      if (!/^https?:\/\//i.test(target)) {
        json(res, 400, { error: 'URL inválida' })
        return
      }
      const upstream = await fetch(target, {
        headers: { 'User-Agent': 'Tommy/1.0 (IM ROMA)' },
      })
      const buf = Buffer.from(await upstream.arrayBuffer())
      cors(res)
      res.writeHead(upstream.status, {
        'Content-Type': upstream.headers.get('content-type') || 'text/plain; charset=utf-8',
      })
      res.end(buf)
      return
    }
    if (url.pathname.startsWith('/groq')) {
      const target = GROQ + url.pathname.slice('/groq'.length) + url.search
      const body = req.method === 'GET' || req.method === 'HEAD' ? undefined : await collect(req)
      const headers = {}
      const auth = req.headers.authorization
      const contentType = req.headers['content-type']
      if (auth) headers.Authorization = auth
      if (contentType) headers['Content-Type'] = contentType
      const upstream = await fetch(target, { method: req.method, headers, body })
      const buf = Buffer.from(await upstream.arrayBuffer())
      cors(res)
      res.writeHead(upstream.status, {
        'Content-Type': upstream.headers.get('content-type') || 'application/json',
      })
      res.end(buf)
      return
    }

    let filePath = path.join(DIST, decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname))
    if (!filePath.startsWith(DIST)) {
      res.writeHead(403)
      res.end()
      return
    }
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(DIST, 'index.html')
    }
    sendFile(res, filePath)
  } catch (error) {
    cors(res)
    res.writeHead(500)
    res.end(String(error.message || error))
  }
})

server.listen(PORT, '0.0.0.0', () => {
  const ip = lanIp()
  console.log('')
  console.log('Tommy del PC esta listo.')
  console.log('  PC:      http://localhost:' + PORT)
  console.log('  Celular: https://imroma0620.github.io/tommy-asistente/')
  console.log('  El celular ya no usa esta ventana. Puedes cerrar el computador.')
  console.log('')
  openFirewall()
})
