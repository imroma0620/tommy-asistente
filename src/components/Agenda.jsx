import { useMemo, useState } from 'react'
import { DAY_NAMES, isoDate, weekDates, getAgenda, saveAgenda } from '../lib/storage'
import { eventDayKey, eventTimeLabel } from '../lib/calendar'

function monthCells(cursor) {
  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const first = new Date(year, month, 1)
  const pad = (first.getDay() + 6) % 7
  const last = new Date(year, month + 1, 0).getDate()
  const cells = Array.from({ length: pad }, () => null)
  for (let day = 1; day <= last; day += 1) cells.push(new Date(year, month, day))
  while (cells.length % 7) cells.push(null)
  return cells
}

export default function Agenda({ snapshot, events = [], connected, onConnect, onDelete, onRefresh }) {
  const [mode, setMode] = useState('semana')
  const [cursor, setCursor] = useState(() => new Date())
  const [picked, setPicked] = useState(isoDate(new Date()))
  const week = weekDates(0)
  const cells = useMemo(() => monthCells(cursor), [cursor])
  const monthLabel = cursor.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })

  const itemsFor = (key) => ({
    tasks: snapshot.agenda[key] || [],
    gcal: events.filter((e) => eventDayKey(e.inicio) === key),
    reminders: (snapshot.recordatorios || []).filter((r) => r.fecha === key && !r.done),
  })

  const add = (fecha, form) => {
    const text = form.get('texto')?.trim()
    if (!text) return
    const agenda = getAgenda()
    const task = { id: Date.now(), text, time: form.get('hora') || '', done: false }
    agenda[fecha] = [...(agenda[fecha] || []), task]
    saveAgenda(agenda)
    onRefresh()
  }

  const renderItems = (key, compact) => {
    const { tasks, gcal, reminders } = itemsFor(key)
    const gcalShown = compact ? gcal.slice(0, 2) : gcal
    const remindersShown = compact ? reminders.slice(0, 1) : reminders
    const tasksShown = compact ? tasks.slice(0, 2) : tasks
    return (
      <>
        {gcalShown.map((event) => (
          <div key={event.id} className={`cal-item gcal ${compact ? 'tiny' : ''}`}>
            <p>{eventTimeLabel(event.inicio) ? `${eventTimeLabel(event.inicio)} · ` : ''}{event.titulo}</p>
            {!compact && <small>Google</small>}
          </div>
        ))}
        {remindersShown.map((item) => (
          <div key={`r-${item.id}`} className={`cal-item reminder ${compact ? 'tiny' : ''}`}>
            <p>{item.hora ? `${item.hora} · ` : ''}{item.text}</p>
          </div>
        ))}
        {tasksShown.map((task) => (
          <div key={task.id} className={`cal-item ${compact ? 'tiny' : ''}`}>
            <p className={task.done ? 'done' : ''}>{task.time ? `${task.time} · ` : ''}{task.text}</p>
            {!compact && (
              <button type="button" onClick={() => onDelete('agenda', { fecha: key, id: task.id })}>✕</button>
            )}
          </div>
        ))}
      </>
    )
  }

  return (
    <div className="module">
      <div className="module-head">
        <div>
          <p className="kicker">Calendario</p>
          <h2>Agenda</h2>
          <p>Semana y mes. Lo de Tommy y lo de Google, en el mismo calendario.</p>
        </div>
        <div className="head-actions">
          <div className="seg">
            <button type="button" className={mode === 'semana' ? 'on' : ''} onClick={() => setMode('semana')}>Semana</button>
            <button type="button" className={mode === 'mes' ? 'on' : ''} onClick={() => setMode('mes')}>Mes</button>
          </div>
          <button type="button" className={connected ? 'ghost ok' : 'send-text'} onClick={onConnect}>
            {connected ? 'Google on' : 'Vincular Google'}
          </button>
        </div>
      </div>

      {mode === 'mes' && (
        <div className="month-nav">
          <button type="button" className="ghost" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>‹</button>
          <strong className="month-title">{monthLabel}</strong>
          <button type="button" className="ghost" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>›</button>
        </div>
      )}

      {mode === 'semana' ? (
        <div className="week">
          {week.map((date, i) => {
            const key = isoDate(date)
            const today = isoDate(new Date()) === key
            return (
              <section key={key} className={`day ${today ? 'today' : ''}`}>
                <header>
                  <strong>{DAY_NAMES[i]}</strong>
                  <span>{date.getDate()}/{date.getMonth() + 1}</span>
                </header>
                {renderItems(key, false)}
                <form className="mini" onSubmit={(e) => { e.preventDefault(); add(key, new FormData(e.target)); e.target.reset() }}>
                  <input name="hora" type="time" />
                  <input name="texto" placeholder="Añadir…" required />
                  <button type="submit" className="add-mini" aria-label="Añadir">+</button>
                </form>
              </section>
            )
          })}
        </div>
      ) : (
        <>
          <div className="month">
            {DAY_NAMES.map((name) => <div key={name} className="month-dow">{name.slice(0, 3)}</div>)}
            {cells.map((date, i) => {
              if (!date) return <div key={`e-${i}`} className="month-cell empty" />
              const key = isoDate(date)
              const today = isoDate(new Date()) === key
              const count = itemsFor(key).tasks.length + itemsFor(key).gcal.length + itemsFor(key).reminders.length
              return (
                <button
                  type="button"
                  key={key}
                  className={`month-cell ${today ? 'today' : ''} ${picked === key ? 'picked' : ''}`}
                  onClick={() => setPicked(key)}
                >
                  <span className="num">{date.getDate()}</span>
                  {renderItems(key, true)}
                  {count > 3 && <small>+{count - 3}</small>}
                </button>
              )
            })}
          </div>
          <section className="day picked-day">
            <header>
              <strong>{picked}</strong>
              <span>Día seleccionado</span>
            </header>
            {renderItems(picked, false)}
            <form className="mini" onSubmit={(e) => { e.preventDefault(); add(picked, new FormData(e.target)); e.target.reset() }}>
              <input name="hora" type="time" />
              <input name="texto" placeholder="Añadir a este día…" required />
              <button type="submit" className="add-mini" aria-label="Añadir">+</button>
            </form>
          </section>
        </>
      )}
    </div>
  )
}
