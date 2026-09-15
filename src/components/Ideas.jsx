import { useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import { getIdeas, saveIdeas } from '../lib/storage'

const NOTE_COLORS = ['#FFFFFF', '#F7F6FF', '#EAE5FF', '#FFF8F0', '#F3EEFF']

function noteColor(idea, index) {
  if (idea.color && NOTE_COLORS.includes(idea.color)) return idea.color
  return NOTE_COLORS[Math.abs(Number(idea.id) || index) % NOTE_COLORS.length]
}

function emptyNote() {
  return {
    id: Date.now(),
    titulo: '',
    descripcion: '',
    tipo: 'Nota',
    tags: [],
    estado: 'idea',
    destacada: false,
    color: NOTE_COLORS[getIdeas().length % NOTE_COLORS.length],
    updatedAt: Date.now(),
  }
}

export default function Ideas({ snapshot, onDelete, onRefresh }) {
  const [draft, setDraft] = useState('')
  const titleRefs = useRef({})

  const persist = (next) => {
    saveIdeas(next)
    onRefresh()
  }

  const addNote = (titulo = '', descripcion = '') => {
    const note = { ...emptyNote(), titulo, descripcion }
    persist([note, ...getIdeas()])
    setTimeout(() => titleRefs.current[note.id]?.focus(), 40)
  }

  const addFromBar = (event) => {
    event.preventDefault()
    const text = draft.trim()
    if (!text) {
      addNote()
      return
    }
    addNote(text)
    setDraft('')
  }

  const patch = (id, fields) => {
    persist(getIdeas().map((idea) => (
      idea.id === id ? { ...idea, ...fields, updatedAt: Date.now() } : idea
    )))
  }

  const ideas = snapshot.ideas || []

  return (
    <div className="module moodboard-page">
      <div className="module-head">
        <div>
          <p className="kicker">Tablero</p>
          <h2>Mood board</h2>
          <p>Post-its para guardar ideas sueltas. Toca un recuadro para escribir.</p>
        </div>
        <div className="head-actions">
          <button type="button" className="send-text" onClick={() => addNote()}>
            <Plus size={14} /> Nueva nota
          </button>
        </div>
      </div>

      <form className="mood-bar" onSubmit={addFromBar}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Una idea, un recorte, una frase…"
          aria-label="Nueva idea"
        />
        <button className="send-text" type="submit">Pegar en el tablero</button>
      </form>

      <div className="pinboard">
        {ideas.length === 0 && (
          <button type="button" className="postit postit-ghost" onClick={() => addNote()}>
            <span className="postit-pin" />
            <strong>Añade un post-it</strong>
            <p>Toca aquí o escribe arriba. El tablero es tuyo: notas, ángulos, frases, lo que quieras retener.</p>
          </button>
        )}
        {ideas.map((idea, index) => (
          <article
            key={idea.id}
            className="postit"
            style={{
              background: noteColor(idea, index),
              '--tilt': `${((Number(idea.id) % 7) - 3) * 0.55}deg`,
            }}
          >
            <span className="postit-pin" />
            <div className="postit-colors">
              {NOTE_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={noteColor(idea, index) === color ? 'on' : ''}
                  style={{ background: color }}
                  aria-label="Color del post-it"
                  onClick={() => patch(idea.id, { color })}
                />
              ))}
            </div>
            <textarea
              ref={(node) => { titleRefs.current[idea.id] = node }}
              className="postit-title"
              value={idea.titulo}
              placeholder="Título"
              rows={2}
              onChange={(e) => patch(idea.id, { titulo: e.target.value })}
            />
            <textarea
              className="postit-body"
              value={idea.descripcion}
              placeholder="La idea, el ángulo, una imagen mental…"
              rows={5}
              onChange={(e) => patch(idea.id, { descripcion: e.target.value })}
            />
            <div className="postit-foot">
              <select
                value={idea.tipo || 'Nota'}
                onChange={(e) => patch(idea.id, { tipo: e.target.value })}
              >
                {['Nota', 'Reel', 'Post', 'Story', 'Video largo', 'Blog', 'Podcast', 'Campaña'].map((tipo) => (
                  <option key={tipo}>{tipo}</option>
                ))}
              </select>
              <button type="button" onClick={() => onDelete('idea', { id: idea.id })}>
                Quitar
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
