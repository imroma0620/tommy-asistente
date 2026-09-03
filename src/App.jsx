import { useEffect, useRef, useState } from 'react'
import { Bell, Mic, Send, Settings as SettingsIcon, Square, Volume2 } from 'lucide-react'
import Settings from './components/Settings'
import Memory from './components/Memory'
import { blobToBase64, startRecording } from './lib/audio'
import { talkToTommy, toGeminiHistory } from './lib/agent'
import {
  getChat,
  getReminders,
  getSettings,
  memorySnapshot,
  saveChat,
  saveReminders,
  saveSettings,
  getAgenda,
  saveAgenda,
  getProjects,
  saveProjects,
  getIdeas,
  saveIdeas,
} from './lib/storage'

const WELCOME = {
  id: 'welcome',
  role: 'assistant',
  text: 'Soy Tommy. Háblame por texto o por audio: armo tu semana, te dejo recordatorios, organizo proyectos y le doy forma a ideas de contenido. No tienes que llenar tableros. Dime qué necesitas.',
}

export default function App() {
  const [messages, setMessages] = useState(() => {
    const saved = getChat()
    return saved.length ? saved : [WELCOME]
  })
  const [input, setInput] = useState('')
  const [settings, setSettings] = useState(getSettings)
  const [busy, setBusy] = useState(false)
  const [recording, setRecording] = useState(false)
  const [recordSecs, setRecordSecs] = useState(0)
  const [showSettings, setShowSettings] = useState(!getSettings().apiKey)
  const [showMemory, setShowMemory] = useState(false)
  const [snapshot, setSnapshot] = useState(memorySnapshot)
  const [errorBanner, setErrorBanner] = useState('')
  const endRef = useRef(null)
  const recRef = useRef(null)
  const timerRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    saveChat(messages)
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (Notification.permission === 'default') Notification.requestPermission()
    const tick = setInterval(() => {
      const now = new Date()
      const items = getReminders()
      let changed = false
      const next = items.map((item) => {
        if (item.done || item.notified || !item.fecha || !item.hora) return item
        if (now >= new Date(`${item.fecha}T${item.hora}`)) {
          changed = true
          if (Notification.permission === 'granted') {
            new Notification('Tommy', { body: item.text })
          }
          return { ...item, notified: true }
        }
        return item
      })
      if (changed) saveReminders(next)
    }, 30000)
    return () => clearInterval(tick)
  }, [])

  const persistSettings = (patch) => {
    const next = { ...settings, ...patch }
    setSettings(next)
    saveSettings(next)
  }

  const speak = (text) => {
    if (!settings.voiceReplies || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utter = new SpeechSynthesisUtterance(text)
    utter.lang = 'es-CO'
    window.speechSynthesis.speak(utter)
  }

  const send = async ({ text, audio, preview }) => {
    const trimmed = (text || '').trim()
    if ((!trimmed && !audio) || busy) return
    if (!settings.apiKey) {
      setShowSettings(true)
      setErrorBanner('Necesito tu clave gratis de Gemini para poder hacer las cosas.')
      return
    }

    const userMsg = {
      id: Date.now(),
      role: 'user',
      text: trimmed || 'Nota de voz',
      voice: Boolean(audio),
    }
    const pending = { id: Date.now() + 1, role: 'assistant', text: '', pending: true }
    setMessages((prev) => [...prev, userMsg, pending])
    setInput('')
    setBusy(true)
    setErrorBanner('')

    try {
      const result = await talkToTommy({
        apiKey: settings.apiKey,
        history: toGeminiHistory(messages),
        text: trimmed,
        audio,
      })
      const actions = (result.actions || []).map((a) => labelAction(a)).filter(Boolean)
      setMessages((prev) =>
        prev.map((m) =>
          m.id === pending.id
            ? { ...m, text: result.text, pending: false, actions }
            : m.id === userMsg.id && preview
              ? { ...m, text: preview }
              : m,
        ),
      )
      setSnapshot(memorySnapshot())
      speak(result.text)
    } catch (error) {
      const msg = settings.apiKey
        ? (error.message || 'Gemini respondió con un error. Recarga e inténtalo de nuevo.')
        : 'Necesito tu clave gratis de Gemini para poder hacer las cosas.'
      setMessages((prev) =>
        prev.map((m) => (m.id === pending.id ? { ...m, text: msg, pending: false, error: true } : m)),
      )
      setErrorBanner(msg)
    } finally {
      setBusy(false)
      inputRef.current?.focus()
    }
  }

  const toggleRecord = async () => {
    if (recording) {
      setRecording(false)
      clearInterval(timerRef.current)
      const session = recRef.current
      recRef.current = null
      if (!session) return
      const blob = await session.stop()
      if (blob.size < 800) return
      const base64 = await blobToBase64(blob)
      await send({
        audio: { base64, mimeType: blob.type || 'audio/webm' },
        preview: 'Nota de voz',
      })
      return
    }
    try {
      recRef.current = await startRecording()
      setRecording(true)
      setRecordSecs(0)
      timerRef.current = setInterval(() => setRecordSecs((s) => s + 1), 1000)
    } catch {
      setErrorBanner('No pude usar el micrófono. En iPhone abre Tommy en Safari y permite el audio.')
    }
  }

  const onDelete = (type, payload) => {
    if (type === 'agenda') {
      const agenda = getAgenda()
      agenda[payload.fecha] = (agenda[payload.fecha] || []).filter((t) => t.id !== payload.id)
      saveAgenda(agenda)
    }
    if (type === 'recordatorio') saveReminders(getReminders().filter((i) => i.id !== payload.id))
    if (type === 'proyecto') saveProjects(getProjects().filter((p) => p.id !== payload.id))
    if (type === 'idea') saveIdeas(getIdeas().filter((i) => i.id !== payload.id))
    setSnapshot(memorySnapshot())
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="avatar">T</div>
          <div>
            <h1>Tommy</h1>
            <p>{busy ? 'Trabajando…' : recording ? 'Escuchando…' : 'Listo para hablar'}</p>
          </div>
        </div>
        <div className="top-actions">
          <button className="icon-btn" onClick={() => setShowMemory(true)} title="Memoria">
            <Bell size={18} />
          </button>
          <button className="icon-btn" onClick={() => setShowSettings(true)} title="Ajustes">
            <SettingsIcon size={18} />
          </button>
        </div>
      </header>

      {errorBanner && <div className="banner">{errorBanner}</div>}

      <main className="thread">
        {messages.map((m) => (
          <article key={m.id} className={`bubble ${m.role} ${m.error ? 'error' : ''}`}>
            {m.voice && <span className="voice-tag">Audio</span>}
            <p>{m.pending ? 'Tommy está resolviendo eso…' : m.text}</p>
            {m.actions?.length > 0 && (
              <ul className="actions">
                {m.actions.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            )}
          </article>
        ))}
        <div ref={endRef} />
      </main>

      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault()
          send({ text: input })
        }}
      >
        <button
          type="button"
          className={`mic ${recording ? 'on' : ''}`}
          onClick={toggleRecord}
          aria-label={recording ? 'Detener audio' : 'Grabar audio'}
        >
          {recording ? <Square size={18} /> : <Mic size={18} />}
        </button>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={recording ? `Grabando ${recordSecs}s…` : 'Escríbele a Tommy…'}
          disabled={recording || busy}
        />
        <button type="submit" className="send" disabled={busy || recording || !input.trim()} aria-label="Enviar">
          <Send size={18} />
        </button>
      </form>
      {settings.voiceReplies && (
        <p className="hint"><Volume2 size={12} /> Tommy leerá sus respuestas</p>
      )}

      {showSettings && (
        <Settings
          settings={settings}
          onChange={persistSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
      {showMemory && (
        <Memory snapshot={snapshot} onClose={() => setShowMemory(false)} onDelete={onDelete} />
      )}
    </div>
  )
}

function labelAction(action) {
  const map = {
    planificar_semana: 'Armé tareas en tu agenda',
    crear_tarea_agenda: 'Agregué algo a la agenda',
    crear_recordatorio: 'Dejé un recordatorio',
    crear_proyecto: 'Creé un proyecto',
    agregar_tarea_proyecto: 'Sumé una tarea a un proyecto',
    mover_tarea_proyecto: 'Moví una tarea de proyecto',
    guardar_idea: 'Estructuré y guardé una idea',
    actualizar_idea: 'Actualicé una idea',
    completar_tarea_agenda: 'Marqué una tarea de la agenda',
    completar_recordatorio: 'Marqué un recordatorio',
    borrar_tarea_agenda: 'Borré una tarea',
    borrar_recordatorio: 'Borré un recordatorio',
  }
  return map[action.name] || ''
}
