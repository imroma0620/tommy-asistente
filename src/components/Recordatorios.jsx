import { getReminders, saveReminders } from '../lib/storage'

export default function Recordatorios({ snapshot, onDelete, onRefresh }) {
  const add = (form) => {
    const text = form.get('texto')?.trim()
    if (!text) return
    saveReminders([{
      id: Date.now(),
      text,
      fecha: form.get('fecha') || '',
      hora: form.get('hora') || '',
      prioridad: form.get('prioridad') || 'media',
      nota: '',
      done: false,
      notified: false,
    }, ...getReminders()])
    onRefresh()
  }

  return (
    <div className="module">
      <div className="module-head">
        <div>
          <h2>Recordatorios</h2>
          <p>Cosas clave con fecha. Tommy también puede crearlos por chat o audio.</p>
        </div>
      </div>
      <form className="add-row" onSubmit={(e) => { e.preventDefault(); add(new FormData(e.target)); e.target.reset() }}>
        <input name="texto" placeholder="Qué no se te puede olvidar" required />
        <input name="fecha" type="date" />
        <input name="hora" type="time" />
        <select name="prioridad">
          <option value="alta">Alta</option>
          <option value="media">Media</option>
          <option value="baja">Baja</option>
        </select>
        <button className="send-text" type="submit">Añadir</button>
      </form>
      <div className="list">
        {snapshot.recordatorios.length === 0 && <p className="empty">Aún no hay recordatorios. Añade uno o díselo a Tommy.</p>}
        {snapshot.recordatorios.map((item) => (
          <div key={item.id} className={`row prio-${item.prioridad}`}>
            <div>
              <strong className={item.done ? 'done' : ''}>{item.text}</strong>
              <p>{[item.fecha, item.hora, item.prioridad].filter(Boolean).join(' · ')}</p>
            </div>
            <button type="button" onClick={() => onDelete('recordatorio', { id: item.id })}>Eliminar</button>
          </div>
        ))}
      </div>
    </div>
  )
}
