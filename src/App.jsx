import { useEffect, useRef, useState } from 'react'
import { Bell, CalendarDays, FolderKanban, Lightbulb, MessageSquare, Mic, Paperclip, PanelLeft, Plus, Send, Settings as SettingsIcon, Smartphone, Square, Volume2, X } from 'lucide-react'
import Settings from './components/Settings'
import Agenda from './components/Agenda'
import Recordatorios from './components/Recordatorios'
import Proyectos from './components/Proyectos'
import Ideas from './components/Ideas'
import CalendarConnect from './components/CalendarConnect'
import Phone from './components/Phone'
import Conversations from './components/Conversations'
import { blobToBase64, startRecording } from './lib/audio'
import { prepareFiles } from './lib/files'
import { talkToTommy, toChatHistory } from './lib/agent'
import { calendarConnected, captureCalendarRedirect, listCalendarEvents } from './lib/calendar'
import {
  getChat,
  getReminders,
  getSettings,
  getProfile,
  saveProfile,
  memorySnapshot,
  saveReminders,
  saveSettings,
  getAgenda,
  saveAgenda,
  getProjects,
  saveProjects,
  getIdeas,
  saveIdeas,
  isoDate,
  weekDates,
  syncOnBoot,
  getConversations,
  getActiveId,
  setActiveId,
  saveConversationMessages,
  createConversation,
  deleteConversation,
  seedIdentity,
} from './lib/storage'
import { WELCOME } from './lib/identity'

const TABS = [
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'agenda', label: 'Agenda', icon: CalendarDays },
  { id: 'recordatorios', label: 'Recordatorios', icon: Bell },
  { id: 'proyectos', label: 'Proyectos', icon: FolderKanban },
  { id: 'ideas', label: 'Ideas', icon: Lightbulb },
]

export default function App() {
  const [tab, setTab] = useState('chat')
  const [activeId, setActiveConvo] = useState(getActiveId)
  const [conversations, setConversations] = useState(getConversations)
  const [messages, setMessages] = useState(() => {
    const conv = getConversations().find((c) => c.id === getActiveId())
    const saved = (conv?.messages || getChat())
      .filter((m) => !m.error && !String(m.text || '').includes('denied access'))
      .map((m) => (m.id === 'welcome' ? WELCOME : m))
    return saved.length ? saved : [WELCOME]
  })
  const [input, setInput] = useState('')
  const [settings, setSettings] = useState(getSettings)
  const [profile, setProfile] = useState(getProfile)
  const [busy, setBusy] = useState(false)
  const [recording, setRecording] = useState(false)
  const [recordSecs, setRecordSecs] = useState(0)
  const [showSettings, setShowSettings] = useState(!String(getSettings().apiKey || '').startsWith('gsk_'))
  const [showPhone, setShowPhone] = useState(false)
  const [inboxOpen, setInboxOpen] = useState(false)
  const [showCalendar, setShowCalendar] = useState(false)
  const skipPersist = useRef(false)
  const [snapshot, setSnapshot] = useState(memorySnapshot)
  const [calOk, setCalOk] = useState(calendarConnected)
  const [events, setEvents] = useState([])
  const [errorBanner, setErrorBanner] = useState('')
  const endRef = useRef(null)
  const recRef = useRef(null)
  const timerRef = useRef(null)
  const [pendingFiles, setPendingFiles] = useState([])
  const fileRef = useRef(null)
  const inputRef = useRef(null)
  const activeRef = useRef(activeId)
  activeRef.current = activeId

  const refresh = () => setSnapshot(memorySnapshot())

  useEffect(() => {
    const back = captureCalendarRedirect()
    if (back.error) {
      setErrorBanner(back.error)
      setShowCalendar(true)
    }
    if (back.ok) setCalOk(true)
    let alive = true
    syncOnBoot().then(() => {
      if (!alive) return
      seedIdentity()
      setSettings(getSettings())
      setProfile(getProfile())
      setSnapshot(memorySnapshot())
      setConversations(getConversations())
      const id = getActiveId()
      setActiveConvo(id)
      const conv = getConversations().find((c) => c.id === id)
      const saved = (conv?.messages || [])
        .filter((m) => !m.error && !String(m.text || '').includes('denied access'))
        .map((m) => (m.id === 'welcome' ? WELCOME : m))
      if (saved.length) setMessages(saved)
      const key = String(getSettings().apiKey || '')
      if (key.startsWith('gsk_')) setShowSettings(false)
    })
    return () => { alive = false }
  }, [])

  useEffect(() => {
    if (/iPhone|iPad|Android/i.test(navigator.userAgent)) return undefined
    if (sessionStorage.getItem('tommy_phone_seen')) return undefined
    sessionStorage.setItem('tommy_phone_seen', '1')
    setShowPhone(true)
    return undefined
  }, [])

  useEffect(() => {
    if (skipPersist.current) {
      skipPersist.current = false
      setConversations(getConversations())
    } else {
      saveConversationMessages(activeRef.current, messages)
      setConversations(getConversations())
    }
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (!calOk) {
      setEvents([])
      return
    }
    const from = new Date()
    from.setMonth(from.getMonth() - 1, 1)
    from.setHours(0, 0, 0, 0)
    const to = new Date()
    to.setMonth(to.getMonth() + 2, 0)
    to.setHours(23, 59, 59, 999)
    listCalendarEvents({ from, to }).then((result) => {
      if (result.ok) setEvents(result.eventos || [])
    })
  }, [calOk])

  useEffect(() => {
    try {
      if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
        Notification.requestPermission()
      }
    } catch {
      // iPhone a veces no tiene Notification
    }
    const tick = setInterval(() => {
      const now = new Date()
      const items = getReminders()
      let changed = false
      const next = items.map((item) => {
        if (item.done || item.notified || !item.fecha || !item.hora) return item
        if (now >= new Date(`${item.fecha}T${item.hora}`)) {
          changed = true
          try {
            if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
              new Notification('Tommy', { body: item.text, icon: './tommy.png' })
            }
          } catch {
            // iPhone
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

  const persistProfile = (next) => {
    setProfile(next)
    saveProfile(next)
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
    const files = pendingFiles
    if ((!trimmed && !audio && files.length === 0) || busy) return
    if (!String(settings.apiKey || '').startsWith('gsk_')) {
      setShowSettings(true)
      setErrorBanner('Pega en Ajustes una clave de Groq (gsk_...). Es gratis y no pide tarjeta.')
      return
    }

    const label = trimmed || (audio ? 'Nota de voz' : files.map((f) => f.name).join(', '))
    const userMsg = {
      id: Date.now(),
      role: 'user',
      text: files.length ? `${label}\n📎 ${files.map((f) => f.name).join(', ')}` : label,
      voice: Boolean(audio),
    }
    const pending = { id: Date.now() + 1, role: 'assistant', text: '', pending: true }
    setMessages((prev) => [...prev, userMsg, pending])
    setInput('')
    setPendingFiles([])
    setBusy(true)
    setErrorBanner('')
    setTab('chat')

    try {
      const result = await talkToTommy({
        apiKey: settings.apiKey,
        history: toChatHistory(messages),
        text: trimmed,
        audio,
        files,
      })
      const actions = (result.actions || []).map((a) => labelAction(a)).filter(Boolean)
      setMessages((prev) =>
        prev.map((m) =>
          m.id === pending.id
            ? { ...m, text: result.text, pending: false, actions }
            : m.id === userMsg.id && (preview || result.transcript)
              ? { ...m, text: result.transcript || preview }
              : m,
        ),
      )
      refresh()
      setProfile(getProfile())
      speak(result.text)
    } catch (error) {
      const msg = error.message || 'No pude completar eso.'
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
      await send({ audio: { base64, mimeType: blob.type || 'audio/webm' }, preview: 'Nota de voz' })
      return
    }
    try {
      recRef.current = await startRecording()
      setRecording(true)
      setRecordSecs(0)
      timerRef.current = setInterval(() => setRecordSecs((s) => s + 1), 1000)
    } catch {
      const https = window.isSecureContext
      setErrorBanner(
        https
          ? 'Safari bloqueó el micrófono. Ajustes → Safari → Tommy → Micrófono: Permitir.'
          : 'Safari solo da el micrófono en la copia del celular (https). Ábrela desde el icono de la pantalla de inicio, no desde el PC.',
      )
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
    refresh()
  }

  const openConversation = (id) => {
    if (id !== activeId) {
      saveConversationMessages(activeId, messages)
      skipPersist.current = true
      setActiveId(id)
      setActiveConvo(id)
      const conv = getConversations().find((c) => c.id === id)
      const next = (conv?.messages || []).map((m) => (m.id === 'welcome' ? WELCOME : m))
      setMessages(next.length ? next : [WELCOME])
    }
    setInboxOpen(false)
    setTab('chat')
  }

  const newConversation = () => {
    saveConversationMessages(activeId, messages)
    skipPersist.current = true
    const conv = createConversation(WELCOME)
    setActiveConvo(conv.id)
    setConversations(getConversations())
    setMessages([WELCOME])
    setInboxOpen(false)
    setTab('chat')
  }

  const removeConversation = (id) => {
    skipPersist.current = true
    const fallback = deleteConversation(id)
    setConversations(getConversations())
    const nextId = getActiveId()
    setActiveConvo(nextId)
    const conv = getConversations().find((c) => c.id === nextId) || fallback
    const next = (conv?.messages || []).map((m) => (m.id === 'welcome' ? WELCOME : m))
    setMessages(next.length ? next : [WELCOME])
  }

  const weekKeys = weekDates(0).map(isoDate)
  const weekTasks = weekKeys.reduce((n, key) => n + (snapshot.agenda[key] || []).length, 0)
  const openReminders = snapshot.recordatorios.filter((r) => !r.done).length

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <button className="icon-btn" onClick={() => setInboxOpen(true)} title="Conversaciones" aria-label="Abrir conversaciones">
            <PanelLeft size={18} />
          </button>
          <img className="avatar" src="./tommy.png" alt="Tommy" />
          <div>
            <h1>Tommy</h1>
            <p>IM ROMA · {busy ? 'Trabajando…' : recording ? 'Escuchando…' : calOk ? 'Google conectado' : 'Listo'}</p>
          </div>
        </div>
        <div className="top-actions">
          <button className="icon-btn" onClick={newConversation} title="Nueva conversación" aria-label="Nueva conversación">
            <Plus size={18} />
          </button>
          <button className="icon-btn" onClick={() => setShowPhone(true)} title="Celular">
            <Smartphone size={18} />
          </button>
          <button className="icon-btn" onClick={() => setShowSettings(true)} title="Ajustes">
            <SettingsIcon size={18} />
          </button>
        </div>
      </header>

      <nav className="tabs">
        {TABS.map((item) => {
          const Icon = item.icon
          return (
            <button key={item.id} className={tab === item.id ? 'on' : ''} onClick={() => setTab(item.id)}>
              <Icon size={15} />
              {item.label}
            </button>
          )
        })}
      </nav>

      {errorBanner && <div className="banner">{errorBanner}</div>}

      <Conversations
        open={inboxOpen}
        onClose={() => setInboxOpen(false)}
        items={conversations}
        activeId={activeId}
        onNew={newConversation}
        onSelect={openConversation}
        onDelete={removeConversation}
      />

      {tab === 'chat' && (
        <div
          className="chat-layout"
          onTouchStart={(e) => {
            if (inboxOpen) return
            const x = e.touches[0].clientX
            const y = e.touches[0].clientY
            if (x > 28) return
            const node = e.currentTarget
            const move = (ev) => {
              const dx = ev.touches[0].clientX - x
              const dy = ev.touches[0].clientY - y
              if (Math.abs(dx) < 12 || Math.abs(dx) < Math.abs(dy)) return
              if (dx > 48) {
                node.removeEventListener('touchmove', move)
                node.removeEventListener('touchend', end)
                setInboxOpen(true)
              }
            }
            const end = () => {
              node.removeEventListener('touchmove', move)
              node.removeEventListener('touchend', end)
            }
            node.addEventListener('touchmove', move, { passive: true })
            node.addEventListener('touchend', end)
          }}
        >
          <main className="thread">
            <div className="dash">
              <button type="button" className="dash-card" onClick={() => setTab('agenda')}>
                <CalendarDays size={16} />
                <strong>Agenda</strong>
                <span>{weekTasks} esta semana</span>
              </button>
              <button type="button" className="dash-card" onClick={() => setTab('recordatorios')}>
                <Bell size={16} />
                <strong>Recordatorios</strong>
                <span>{openReminders} abiertos</span>
              </button>
              <button type="button" className="dash-card" onClick={() => setTab('proyectos')}>
                <FolderKanban size={16} />
                <strong>Proyectos</strong>
                <span>{snapshot.proyectos.length}</span>
              </button>
              <button type="button" className="dash-card" onClick={() => setTab('ideas')}>
                <Lightbulb size={16} />
                <strong>Ideas</strong>
                <span>{snapshot.ideas.length}</span>
              </button>
            </div>
            {messages.map((m) => (
              <article key={m.id} className={`bubble ${m.role} ${m.error ? 'error' : ''}`}>
                {m.role === 'assistant' && <img className="bubble-face" src="./tommy.png" alt="" />}
                <div>
                  {m.voice && <span className="voice-tag">Audio</span>}
                  <p>{m.pending ? 'Tommy está resolviendo eso…' : m.text}</p>
                  {m.actions?.length > 0 && (
                    <ul className="actions">{m.actions.map((a, i) => <li key={i}>{a}</li>)}</ul>
                  )}
                </div>
              </article>
            ))}
            <div ref={endRef} />
          </main>
        </div>
      )}

      {tab === 'agenda' && (
        <main className="thread wide">
          <Agenda
            snapshot={snapshot}
            events={events}
            connected={calOk}
            onConnect={() => setShowCalendar(true)}
            onDelete={onDelete}
            onRefresh={refresh}
          />
        </main>
      )}

      {tab === 'recordatorios' && (
        <main className="thread">
          <Recordatorios snapshot={snapshot} onDelete={onDelete} onRefresh={refresh} />
        </main>
      )}

      {tab === 'proyectos' && (
        <main className="thread wide">
          <Proyectos snapshot={snapshot} onDelete={onDelete} onRefresh={refresh} />
        </main>
      )}

      {tab === 'ideas' && (
        <main className="thread">
          <Ideas snapshot={snapshot} onDelete={onDelete} onRefresh={refresh} />
        </main>
      )}

      <div className="composer-wrap">
        {pendingFiles.length > 0 && (
          <div className="file-chips">
            {pendingFiles.map((file, i) => (
              <span key={`${file.name}-${i}`} className="chip">
                {file.name}
                <button type="button" onClick={() => setPendingFiles((prev) => prev.filter((_, idx) => idx !== i))} aria-label="Quitar archivo">
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}
        <form
          className="composer"
          onSubmit={(e) => {
            e.preventDefault()
            send({ text: input })
          }}
        >
          <input
            ref={fileRef}
            type="file"
            multiple
            hidden
            accept="image/*,.txt,.md,.csv,.json,.pdf"
            onChange={async (e) => {
              try {
                const ready = await prepareFiles(e.target.files)
                setPendingFiles((prev) => [...prev, ...ready])
              } catch (error) {
                setErrorBanner(error.message)
              }
              e.target.value = ''
            }}
          />
          <button type="button" className="mic" onClick={() => fileRef.current?.click()} aria-label="Adjuntar archivo">
            <Paperclip size={18} />
          </button>
          <button type="button" className={`mic ${recording ? 'on' : ''}`} onClick={toggleRecord} aria-label={recording ? 'Detener audio' : 'Grabar audio'}>
            {recording ? <Square size={18} /> : <Mic size={18} />}
          </button>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={recording ? `Grabando ${recordSecs}s…` : 'Escríbele a Tommy…'}
            disabled={recording || busy}
          />
          <button type="submit" className="send" disabled={busy || recording || (!input.trim() && pendingFiles.length === 0)} aria-label="Enviar">
            <Send size={18} />
          </button>
        </form>
      </div>
      {settings.voiceReplies && <p className="hint"><Volume2 size={12} /> Tommy leerá sus respuestas</p>}

      {showSettings && (
        <Settings
          settings={settings}
          profile={profile}
          onChange={persistSettings}
          onProfile={persistProfile}
          onClose={() => setShowSettings(false)}
        />
      )}
      <CalendarConnect
        settings={settings}
        onChange={persistSettings}
        onCalendar={setCalOk}
        connected={calOk}
        onEvents={setEvents}
        open={showCalendar}
        onClose={() => setShowCalendar(false)}
      />
      <Phone open={showPhone} onClose={() => setShowPhone(false)} />
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
    actualizar_estilo: 'Guardé tu forma de hablar y decidir',
    recordar_preferencia: 'Lo dejé en tu perfil',
    crear_evento_calendario: 'Lo metí a Google Calendar',
    listar_calendario: 'Revisé tu calendario',
  }
  return map[action.name] || ''
}
