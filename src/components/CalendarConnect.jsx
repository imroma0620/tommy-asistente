import { useEffect, useState } from 'react'
import {
  connectCalendar,
  disconnectCalendar,
  listCalendarEvents,
  DEFAULT_GOOGLE_CLIENT_ID,
  GOOGLE_JS_ORIGIN,
  GOOGLE_REDIRECT,
} from '../lib/calendar'
import CopyRow from './CopyRow'

export default function CalendarConnect({ settings, onChange, onCalendar, connected, onEvents, open, onClose }) {
  const [status, setStatus] = useState('')
  const [clientId, setClientId] = useState(settings.googleClientId || DEFAULT_GOOGLE_CLIENT_ID)
  const onPhone = /iPhone|iPad|Android/i.test(navigator.userAgent)

  useEffect(() => {
    setClientId(settings.googleClientId || DEFAULT_GOOGLE_CLIENT_ID)
  }, [settings.googleClientId])

  if (!open) return null

  const connect = async () => {
    const id = (clientId || DEFAULT_GOOGLE_CLIENT_ID).trim()
    onChange({ googleClientId: id })
    if (!id) {
      setStatus('Falta el Client ID que termina en .apps.googleusercontent.com')
      return
    }
    try {
      setStatus('Abriendo Google…')
      await connectCalendar(id)
      onCalendar?.(true)
      const result = await listCalendarEvents()
      if (result.ok) onEvents?.(result.eventos || [])
      onClose()
    } catch (error) {
      setStatus(error.message)
    }
  }

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>Google Calendar</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>
        {connected ? (
          <>
            <p className="muted">Ya está vinculado. La agenda muestra tus eventos de Google.</p>
            <button type="button" className="ghost" onClick={() => { disconnectCalendar(); onCalendar?.(false); onEvents?.([]); onClose() }}>Desconectar</button>
          </>
        ) : onPhone ? (
          <>
            <p className="muted">Toca Conectar. Google se abre y vuelve aquí. No copies el link de GitHub en Google: ese no es el origen.</p>
            {status && <p className="muted">{status}</p>}
            {status && /origen|redirección|GitHub/i.test(status) && (
              <>
                <CopyRow label="Origen de JavaScript" value={GOOGLE_JS_ORIGIN} />
                <CopyRow label="URI de redirección" value={GOOGLE_REDIRECT} />
              </>
            )}
            <button type="button" className="send-text" onClick={connect}>Conectar</button>
          </>
        ) : (
          <>
            <p className="muted">Si el celular no puede conectar, en Google Cloud → Credenciales → tu cliente web agrega estas dos. El origen va sin /tommy-asistente. El link largo solo va en redirección.</p>
            <CopyRow label="Origen de JavaScript" value={GOOGLE_JS_ORIGIN} />
            <CopyRow label="URI de redirección" value={GOOGLE_REDIRECT} />
            <label className="field">
              <span>Client ID</span>
              <input value={clientId} onChange={(e) => setClientId(e.target.value.trim())} placeholder="….apps.googleusercontent.com" />
            </label>
            {status && <p className="muted">{status}</p>}
            <button type="button" className="send-text" onClick={connect}>Conectar</button>
          </>
        )}
      </div>
    </div>
  )
}
