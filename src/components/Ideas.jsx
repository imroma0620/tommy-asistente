import { getIdeas, saveIdeas } from '../lib/storage'

const ESTADOS = [
  { id: 'idea', label: 'Idea', tone: 'yellow' },
  { id: 'desarrollo', label: 'En desarrollo', tone: 'lavender' },
  { id: 'listo', label: 'Listo', tone: 'mint' },
  { id: 'publicado', label: 'Publicado', tone: 'violet' },
]

function toneFor(estado) {
  return ESTADOS.find((e) => e.id === estado)?.tone || 'yellow'
}

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
      updatedAt: Date.now(),
    }, ...getIdeas()])
    onRefresh()
  }
  const setEstado = (id, estado) => {
    saveIdeas(getIdeas().map((i) => (i.id === id ? { ...i, estado, updatedAt: Date.now() } : i)))
    onRefresh()
  }

  return (
    <div className="module ideas-module">
      <div className="module-head">
        <div>
          <p className="kicker">Contenido</p>
          <h2>Tablero de ideas</h2>
          <p>Post-its visuales. Tommy sigue guardando el mismo formato de datos.</p>
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
          <button className="send-text" type="submit">Pegar idea</button>
        </div>
      </form>
      <div className="sticky-board" aria-label="Tablero de post-its">
        {snapshot.ideas.length === 0 && (
          <p className="empty board-empty">No hay ideas. Escribe una o dile a Tommy: “estructura esta idea para un reel…”.</p>
        )}
        {snapshot.ideas.map((idea, index) => (
          <article
            key={idea.id}
            className={`sticky-note tone-${toneFor(idea.estado)}`}
            style={{ '--rot': `${((index % 7) - 3) * 1.4}deg` }}
          >
            <div className="sticky-pin" aria-hidden="true" />
            <div className="sticky-head">
              <span className="sticky-type">{idea.tipo}</span>
              <button type="button" className="sticky-del" onClick={() => onDelete('idea', { id: idea.id })} aria-label="Eliminar">
                ×
              </button>
            </div>
            <h3 className="sticky-title">{idea.titulo}</h3>
            {idea.descripcion && <p className="sticky-body">{idea.descripcion}</p>}
            {idea.tags?.length > 0 && (
              <div className="sticky-tags">
                {idea.tags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
            )}
            <div className="sticky-states">
              {ESTADOS.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  className={idea.estado === id ? 'on' : ''}
                  onClick={() => setEstado(idea.id, id)}
                >
                  {label}
                </button>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
