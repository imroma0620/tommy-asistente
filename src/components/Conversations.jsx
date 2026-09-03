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

export default function Conversations({ items, activeId, onNew, onSelect, onDelete }) {
  const list = items || []
  return (
    <aside className="inbox">
      <div className="inbox-head">
        <div>
          <p className="kicker">Historial</p>
          <h2>Conversaciones</h2>
        </div>
        <span className="inbox-count">{list.length}</span>
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
  )
}
