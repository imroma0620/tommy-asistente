import { DAY_NAMES, isoDate, weekDates } from '../lib/storage'

const COL = {
  pendiente: 'Por hacer',
  en_progreso: 'En curso',
  revision: 'Revisión',
  completado: 'Hecho',
}

export default function Board({ snapshot, onDelete }) {
  const week = weekDates(0)
  return (
    <div className="board">
      <section>
        <h3>Agenda de la semana</h3>
        <div className="week">
          {week.map((date, i) => {
            const key = isoDate(date)
            const tasks = snapshot.agenda[key] || []
            const today = isoDate(new Date()) === key
            return (
              <div key={key} className={`day ${today ? 'today' : ''}`}>
                <strong>{DAY_NAMES[i]}</strong>
                <span>{date.getDate()}/{date.getMonth() + 1}</span>
                {tasks.length === 0 && <p className="muted">Vacío</p>}
                {tasks.map((task) => (
                  <div key={task.id} className="card-item">
                    <p className={task.done ? 'done' : ''}>{task.time ? `${task.time} · ` : ''}{task.text}</p>
                    <button onClick={() => onDelete('agenda', { fecha: key, id: task.id })}>✕</button>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </section>

      <section>
        <h3>Recordatorios</h3>
        {snapshot.recordatorios.length === 0 && <p className="muted">Nada pendiente</p>}
        {snapshot.recordatorios.map((item) => (
          <div key={item.id} className="card-item row">
            <span className={item.done ? 'done' : ''}>{item.text} {item.fecha} {item.hora}</span>
            <button onClick={() => onDelete('recordatorio', { id: item.id })}>✕</button>
          </div>
        ))}
      </section>

      <section>
        <h3>Proyectos</h3>
        {snapshot.proyectos.length === 0 && <p className="muted">Aún no hay proyectos. Pídeselos a Tommy en el chat.</p>}
        {snapshot.proyectos.map((project) => (
          <div key={project.id} className="project">
            <div className="card-item row">
              <strong>{project.nombre}</strong>
              <button onClick={() => onDelete('proyecto', { id: project.id })}>✕</button>
            </div>
            <div className="cols">
              {Object.entries(COL).map(([id, label]) => (
                <div key={id}>
                  <p className="muted">{label}</p>
                  {project.tareas.filter((t) => t.columna === id).map((t) => (
                    <p key={t.id} className="pill">{t.texto}</p>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section>
        <h3>Ideas de contenido</h3>
        <div className="ideas">
          {snapshot.ideas.length === 0 && <p className="muted">Ninguna idea aún</p>}
          {snapshot.ideas.map((idea) => (
            <div key={idea.id} className="idea">
              <div className="card-item row">
                <strong>{idea.titulo}</strong>
                <button onClick={() => onDelete('idea', { id: idea.id })}>✕</button>
              </div>
              <p className="muted">{idea.tipo} · {idea.estado}</p>
              {idea.descripcion && <p>{idea.descripcion}</p>}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
