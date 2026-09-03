import CopyRow from './CopyRow'

export const PHONE_HOME = 'https://imroma0620.github.io/tommy-asistente/'

export default function Phone({ open, onClose }) {
  if (!open) return null
  const onPhone = /iPhone|iPad|Android/i.test(navigator.userAgent)
  const installed = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&bgcolor=0D0D1A&color=F7F6FF&data=${encodeURIComponent(PHONE_HOME)}`

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>Celular</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>
        {installed ? (
          <p className="muted">Tommy ya está en este teléfono. Puedes apagar el computador. Agenda, recordatorios, proyectos e ideas quedan aquí. Para hablarle, el iPhone sí necesita datos (no el PC).</p>
        ) : onPhone ? (
          <>
            <p className="muted">Esto no usa el computador. En Safari: Compartir → Añadir a pantalla de inicio. La próxima vez ábrelo desde el icono, con el PC apagado.</p>
            <CopyRow value={PHONE_HOME} />
          </>
        ) : (
          <>
            <p className="muted">Escanea esto en Safari. Es la copia del celular, no el túnel ni el PC. Luego: Compartir → Añadir a pantalla de inicio. Después puedes cerrar el computador.</p>
            <img className="qr" src={qr} alt="Código de Tommy en el celular" />
            <CopyRow value={PHONE_HOME} />
          </>
        )}
      </div>
    </div>
  )
}
