import { Plus, X } from 'lucide-react'

function preview(messages) {
  const last = [...(messages || [])].reverse().find((m) => m.text && m.id !== 'welcome')
  if (!last) return 'Sin mensajes todavía'
  const text = String(last.text).replace(/\s+/g, ' ').trim()
  return text.length > 70 ? `${text.slice(0, 70)}…` : text
}

function when(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function Conversations({ open, onClose, items, activeId, onNew, onSelect, onDelete }) {
  const list = items || []
  if (!open) return null

  return (
    <div className="inbox-overlay" onClick={onClose}>
      <aside
        className="inbox open"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => {
          const startX = e.touches[0].clientX
          const startY = e.touches[0].clientY
          const node = e.currentTarget
          const move = (ev) => {
            const dx = ev.touches[0].clientX - startX
            const dy = ev.touches[0].clientY - startY
            if (Math.abs(dx) < 12 || Math.abs(dx) < Math.abs(dy)) return
            if (dx < -48) {
              cleanup()
              onClose()
            }
          }
          const cleanup = () => {
            node.removeEventListener('touchmove', move)
            node.removeEventListener('touchend', cleanup)
          }
          node.addEventListener('touchmove', move, { passive: true })
          node.addEventListener('touchend', cleanup)
        }}
      >
        <div className="inbox-head">
          <div>
            <p className="kicker">Historial</p>
            <h2>Conversaciones</h2>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar historial">
            <X size={16} />
          </button>
        </div>
        <button type="button" className="convo-new" onClick={onNew}>
          <Plus size={16} /> Nueva conversación
        </button>
        <div className="inbox-list">
          {list.length === 0 && (
            <p className="empty">Aún no hay hilos. Crea uno con el botón de arriba.</p>
          )}
          {list.map((item) => (
            <div key={item.id} className={`inbox-item ${item.id === activeId ? 'on' : ''}`}>
              <button type="button" className="inbox-open" onClick={() => onSelect(item.id)}>
                <strong>{item.title || 'Conversación'}</strong>
                <small>{when(item.updatedAt)}</small>
                <p>{preview(item.messages)}</p>
              </button>
              {list.length > 1 && (
                <button
                  type="button"
                  className="inbox-del"
                  aria-label="Eliminar conversación"
                  onClick={() => onDelete(item.id)}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      </aside>
    </div>
  )
}
