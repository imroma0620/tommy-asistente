import CopyRow from './CopyRow'
import { TOMMY_WEB } from '../lib/hosts'

export const PHONE_HOME = TOMMY_WEB

export default function Phone({ open, onClose }) {
  if (!open) return null
  const onPhone = /iPhone|iPad|Android/i.test(navigator.userAgent)
  const installed = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&bgcolor=FFFFFF&color=0D0D1A&data=${encodeURIComponent(PHONE_HOME)}`

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>Celular</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>
        {installed ? (
          <>
            <p className="muted">Tommy ya está en este teléfono. Agenda, proyectos e ideas se sincronizan en la nube en la URL de Vercel (mismo enlace que instalaste). Para hablarle, el iPhone necesita datos móviles o Wi‑Fi.</p>
            <p className="muted phone-hint">Si no ves cambios recientes, cierra la app desde el conmutador de apps y ábrela otra vez desde el icono (Safari actualiza la PWA al reiniciar).</p>
          </>
        ) : onPhone ? (
          <>
            <p className="muted">En Safari: toca <strong>Compartir</strong> → <strong>Añadir a pantalla de inicio</strong>. Ábrelo siempre desde el icono (no desde una pestaña) para que el micrófono y la PWA funcionen bien.</p>
            <p className="muted phone-hint">Cuando publiquemos una versión nueva, cierra Tommy por completo y vuelve a abrirlo desde el icono para refrescar.</p>
            <CopyRow value={PHONE_HOME} />
          </>
        ) : (
          <>
            <p className="muted">Escanea esto en Safari. Es Tommy en internet, no localhost. Luego: Compartir → Añadir a pantalla de inicio. El PC puede estar apagado. Lo autónomo (Grok Bot) es otra app, la que ya instalaste.</p>
            <img className="qr" src={qr} alt="Código de Tommy en el celular" />
            <CopyRow value={PHONE_HOME} />
          </>
        )}
      </div>
    </div>
  )
}
