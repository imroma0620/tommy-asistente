import { useEffect, useState } from 'react'
import { connectCalendar, disconnectCalendar, listCalendarEvents } from '../lib/calendar'

export default function CalendarConnect({ settings, onChange, onCalendar, connected, onEvents, open, onClose }) {
  const origin = window.location.origin
  const [status, setStatus] = useState('')
  const [clientId, setClientId] = useState(settings.googleClientId || '')

  useEffect(() => { setClientId(settings.googleClientId || '') }, [settings.googleClientId])

  if (!open) return null

  const connect = async () => {
    onChange({ googleClientId: clientId.trim() })
    if (!clientId.trim()) {
      setStatus('Pega el Client ID que termina en .apps.googleusercontent.com')
      return
    }
    try {
      await connectCalendar(clientId.trim())
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
          <h2>Vincular Google Calendar</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>
        {connected ? (
          <>
            <p className="muted">Ya está vinculado. La agenda muestra tus eventos de Google.</p>
            <button type="button" className="ghost" onClick={() => { disconnectCalendar(); onCalendar?.(false); onEvents?.([]); onClose() }}>Desconectar</button>
          </>
        ) : (
          <>
            <p className="muted">Ábrelo en Chrome, no en Cursor. En Google Cloud → Credenciales → tu cliente web, agrega este origen:</p>
            <code className="copy">{origin}</code>
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
