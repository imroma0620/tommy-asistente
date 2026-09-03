import { DAY_NAMES, isoDate, weekDates } from '../lib/storage'

const COL = {
  pendiente: 'Por hacer',
  en_progreso: 'En progreso',
  revision: 'En revisión',
  completado: 'Hecho',
}

export default function Memory({ snapshot, onClose, onDelete }) {
  const week = weekDates(0)

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet wide" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>Lo que Tommy tiene guardado</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>
        <p className="muted">Esto lo llena el agente cuando le hablas. No es un tablero para cargar a mano.</p>

        <section>
          <h3>Agenda de esta semana</h3>
          {week.map((d, i) => {
            const key = isoDate(d)
            const tasks = snapshot.agenda[key] || []
            return (
              <div key={key} className="mem-block">
                <strong>{DAY_NAMES[i]} {d.getDate()}/{d.getMonth() + 1}</strong>
                {tasks.length === 0 && <p className="muted">Sin tareas</p>}
                {tasks.map((t) => (
                  <div key={t.id} className="mem-row">
                    <span className={t.done ? 'done' : ''}>{t.time ? `${t.time} · ` : ''}{t.text}</span>
                    <button onClick={() => onDelete('agenda', { fecha: key, id: t.id })}>Borrar</button>
                  </div>
                ))}
              </div>
            )
          })}
        </section>

        <section>
          <h3>Recordatorios</h3>
          {snapshot.recordatorios.length === 0 && <p className="muted">Ninguno</p>}
          {snapshot.recordatorios.map((r) => (
            <div key={r.id} className="mem-row">
              <span className={r.done ? 'done' : ''}>
                {r.text}{r.fecha ? ` · ${r.fecha}` : ''}{r.hora ? ` ${r.hora}` : ''}
              </span>
              <button onClick={() => onDelete('recordatorio', { id: r.id })}>Borrar</button>
            </div>
          ))}
        </section>

        <section>
          <h3>Proyectos</h3>
          {snapshot.proyectos.length === 0 && <p className="muted">Ninguno</p>}
          {snapshot.proyectos.map((p) => (
            <div key={p.id} className="mem-block">
              <div className="mem-row">
                <strong>{p.nombre}</strong>
                <button onClick={() => onDelete('proyecto', { id: p.id })}>Borrar</button>
              </div>
              {p.tareas.map((t) => (
                <p key={t.id} className="muted">{COL[t.columna] || t.columna}: {t.texto}</p>
              ))}
            </div>
          ))}
        </section>

        <section>
          <h3>Ideas de contenido</h3>
          {snapshot.ideas.length === 0 && <p className="muted">Ninguna</p>}
          {snapshot.ideas.map((idea) => (
            <div key={idea.id} className="mem-row">
              <span>{idea.titulo} · {idea.tipo} · {idea.estado}</span>
              <button onClick={() => onDelete('idea', { id: idea.id })}>Borrar</button>
            </div>
          ))}
        </section>
      </div>
    </div>
  )
}
