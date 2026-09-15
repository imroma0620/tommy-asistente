import { getIdeas, saveIdeas } from '../lib/storage'

export default function Ideas({ snapshot, onDelete, onRefresh }) {
  const add = (form) => {
    const titulo = form.get('titulo')?.trim()
    if (!titulo) return
    saveIdeas([{
      id: Date.now(),
      titulo,
      descripcion: form.get('descripcion') || '',
      tipo: form.get('tipo') || 'Reel',
      tags: (form.get('tags') || '').split(',').map((t) => t.trim()).filter(Boolean),
      estado: 'idea',
      destacada: false,
    }, ...getIdeas()])
    onRefresh()
  }
  const setEstado = (id, estado) => {
    saveIdeas(getIdeas().map((i) => i.id === id ? { ...i, estado } : i))
    onRefresh()
  }

  return (
    <div className="module">
      <div className="module-head">
        <div>
          <p className="kicker">Contenido</p>
          <h2>Ideas de contenido</h2>
          <p>Banco de ideas. Tommy las estructura si le dictas una suelta.</p>
        </div>
      </div>
      <form className="add-stack" onSubmit={(e) => { e.preventDefault(); add(new FormData(e.target)); e.target.reset() }}>
        <input name="titulo" placeholder="Título de la idea" required />
        <textarea name="descripcion" placeholder="Ángulo, guion, nota…" />
        <div className="add-row">
          <select name="tipo">
            {['Reel', 'Post', 'Story', 'Video largo', 'Blog', 'Podcast'].map((t) => <option key={t}>{t}</option>)}
          </select>
          <input name="tags" placeholder="tags, separados, por coma" />
          <button className="send-text" type="submit">Guardar idea</button>
        </div>
      </form>
      <div className="idea-grid">
        {snapshot.ideas.length === 0 && <p className="empty">No hay ideas. Escribe una o dile a Tommy: “estructura esta idea para un reel…”.</p>}
        {snapshot.ideas.map((idea) => (
          <article key={idea.id} className="idea-card">
            <div className="row">
              <strong>{idea.titulo}</strong>
              <button type="button" onClick={() => onDelete('idea', { id: idea.id })}>Eliminar</button>
            </div>
            <p className="meta">{idea.tipo}</p>
            {idea.descripcion && <p>{idea.descripcion}</p>}
            <div className="states">
              {['idea', 'desarrollo', 'listo', 'publicado'].map((s) => (
                <button key={s} type="button" className={idea.estado === s ? 'on' : ''} onClick={() => setEstado(idea.id, s)}>{s}</button>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
