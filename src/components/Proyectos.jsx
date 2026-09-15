import { getProjects, saveProjects } from '../lib/storage'

const COLS = [
  ['pendiente', 'Por hacer'],
  ['en_progreso', 'En curso'],
  ['revision', 'Revisión'],
  ['completado', 'Hecho'],
]

export default function Proyectos({ snapshot, onDelete, onRefresh }) {
  const addProject = (form) => {
    const nombre = form.get('nombre')?.trim()
    if (!nombre) return
    saveProjects([...getProjects(), { id: Date.now(), nombre, descripcion: form.get('descripcion') || '', tareas: [] }])
    onRefresh()
  }
  const addTask = (projectId, form) => {
    const texto = form.get('texto')?.trim()
    if (!texto) return
    saveProjects(getProjects().map((p) => p.id === projectId
      ? { ...p, tareas: [...p.tareas, { id: Date.now(), texto, columna: 'pendiente', prioridad: 'media' }] }
      : p))
    onRefresh()
  }
  const move = (projectId, tareaId, columna) => {
    saveProjects(getProjects().map((p) => p.id === projectId
      ? { ...p, tareas: p.tareas.map((t) => t.id === tareaId ? { ...t, columna } : t) }
      : p))
    onRefresh()
  }

  return (
    <div className="module">
      <div className="module-head">
        <div>
          <p className="kicker">Operación</p>
          <h2>Proyectos</h2>
          <p>Organiza trabajo en columnas. Tommy puede crear y mover tareas si se lo pides.</p>
        </div>
      </div>
      <form className="add-row" onSubmit={(e) => { e.preventDefault(); addProject(new FormData(e.target)); e.target.reset() }}>
        <input name="nombre" placeholder="Nuevo proyecto" required />
        <input name="descripcion" placeholder="Para qué es" />
        <button className="send-text" type="submit">Crear</button>
      </form>
      {snapshot.proyectos.length === 0 && <p className="empty">No hay proyectos. Crea uno o dile a Tommy: “crea el proyecto Invictus”.</p>}
      {snapshot.proyectos.map((project) => (
        <article key={project.id} className="project-card">
          <div className="row">
            <div>
              <strong>{project.nombre}</strong>
              {project.descripcion && <p>{project.descripcion}</p>}
            </div>
            <button type="button" onClick={() => onDelete('proyecto', { id: project.id })}>Eliminar</button>
          </div>
          <div className="kanban">
            {COLS.map(([id, label]) => (
              <div key={id} className="kanban-col">
                <h4>{label}</h4>
                {project.tareas.filter((t) => t.columna === id).map((t) => (
                  <div key={t.id} className="pill">
                    <span>{t.texto}</span>
                    <select value={t.columna} onChange={(e) => move(project.id, t.id, e.target.value)}>
                      {COLS.map(([cid, clabel]) => <option key={cid} value={cid}>{clabel}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <form className="mini" onSubmit={(e) => { e.preventDefault(); addTask(project.id, new FormData(e.target)); e.target.reset() }}>
            <input name="texto" placeholder="Nueva tarea en este proyecto" required />
            <button type="submit" className="add-mini" aria-label="Añadir">+</button>
          </form>
        </article>
      ))}
    </div>
  )
}
