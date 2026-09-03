import { useEffect, useState } from 'react'
import { calendarConnected, connectCalendar, disconnectCalendar, listCalendarEvents } from '../lib/calendar'

export default function CalendarPanel({ settings, onChange, onCalendar, connected }) {
  const origin = window.location.origin
  const inCursor = /Cursor|Electron/i.test(navigator.userAgent) || window.self !== window.top
  const [events, setEvents] = useState([])
  const [status, setStatus] = useState('')

  useEffect(() => {
    if (!connected) {
      setEvents([])
      return
    }
    listCalendarEvents().then((result) => {
      if (result.ok) setEvents(result.eventos || [])
      else setStatus(result.error)
    })
  }, [connected])

  const connect = async () => {
    setStatus('')
    if (!settings.googleClientId) {
      setStatus('Primero pega el Client ID en el recuadro de abajo (paso 8).')
      return
    }
    try {
      await connectCalendar(settings.googleClientId)
      onCalendar?.(true)
      const result = await listCalendarEvents()
      if (result.ok) setEvents(result.eventos || [])
      setStatus('Listo. Ya está conectado a tu Google Calendar.')
    } catch (error) {
      setStatus(error.message || 'No se pudo conectar.')
    }
  }

  return (
    <div className="cal-page">
      <h3>Google Calendar</h3>
      <p className="muted">Esto no aparece en el chat. Está aquí, en esta pestaña. No pongas tarjeta. No uses Gemini.</p>

      <div className={`cal-status ${connected ? 'ok' : ''}`}>
        {connected ? 'Conectado a tu calendario' : 'Aún no está conectado'}
      </div>

      <div className="cal-box">
        <p><strong>Esto no es Cursor.</strong> Google pide permiso para tu calendario. Hay que abrir Tommy en <strong>Chrome o Edge</strong>, no en la ventanita de Cursor.</p>
        <p>En Chrome entra exactamente a:</p>
        <code className="copy">http://localhost:5174</code>
        <p>El error <em>origin_mismatch</em> sale si la barra de direcciones no coincide con lo que pusiste en Google. En Credenciales, orígenes de JavaScript, tiene que estar <strong>tal cual</strong> (sin / al final):</p>
        <code className="copy">{origin}</code>
        <code className="copy">http://localhost:5174</code>
        <code className="copy">http://127.0.0.1:5174</code>
        <p>☰ → APIs y servicios → Credenciales → tu cliente OAuth web → agregar esas URIs → Guardar → espera 1 minuto → Conectar otra vez desde Chrome.</p>
        {inCursor && <p><strong>Ahora mismo estás dentro de Cursor.</strong> Cierra esto, abre Chrome y pega http://localhost:5174</p>}
      </div>

      <ol className="steps">
        <li>Entra a <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer">console.cloud.google.com</a> con el mismo Gmail del calendario.</li>
        <li>Arriba a la izquierda, elige un proyecto o pulsa <strong>New project</strong> → nombre <em>Tommy</em> → Create.</li>
        <li>En el buscador de arriba escribe <strong>Google Calendar API</strong> → entra → pulsa <strong>Enable</strong>.</li>
        <li>Menú ☰ → <strong>APIs & Services</strong> → <strong>OAuth consent screen</strong>.</li>
        <li>Elige <strong>External</strong> → Create. App name: Tommy. Tu email en user support y developer. Save. En Test users agrega tu Gmail → Save.</li>
        <li>Menú ☰ → <strong>APIs & Services</strong> → <strong>Credentials</strong> → <strong>Create credentials</strong> → <strong>OAuth client ID</strong>.</li>
        <li>Application type: <strong>Web application</strong>. Name: Tommy web.</li>
        <li>
          En <strong>Authorized JavaScript origins</strong> pulsa Add URI y pega exactamente esto:
          <code className="copy">{origin}</code>
          En <strong>Authorized redirect URIs</strong> también pega lo mismo. Create.
        </li>
        <li>Copia el <strong>Client ID</strong> (termina en <em>.apps.googleusercontent.com</em>) y pégalo aquí abajo.</li>
        <li>Pulsa <strong>Conectar Google Calendar</strong>, elige tu cuenta y Allow.</li>
      </ol>

      <label className="field">
        <span>Paso 9 — pega aquí el Client ID</span>
        <input
          value={settings.googleClientId || ''}
          placeholder="123456789-abc.apps.googleusercontent.com"
          onChange={(e) => onChange({ googleClientId: e.target.value.trim() })}
        />
      </label>

      <div className="row-btns">
        <button type="button" className="send-text" onClick={connect}>Conectar Google Calendar</button>
        <button
          type="button"
          className="ghost"
          onClick={() => {
            disconnectCalendar()
            onCalendar?.(false)
            setEvents([])
            setStatus('Desconectado')
          }}
        >
          Desconectar
        </button>
      </div>
      {status && <p className="muted">{status}</p>}

      {connected && (
        <section>
          <h3>Próximos eventos</h3>
          {events.length === 0 && <p className="muted">No hay eventos próximos, o aún no cargan.</p>}
          {events.map((event) => (
            <div key={event.id} className="card-item row">
              <span>{event.titulo}<br /><small>{event.inicio}</small></span>
            </div>
          ))}
        </section>
      )}
    </div>
  )
}
