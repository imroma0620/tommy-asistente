/** Datos IM ROMA (Diana, Cali) — se fusionan sin borrar lo que ya tengas. */

export const SEED_PROJECTS = [
  { key: 'arts-digital', nombre: 'Arts Digital Institute', descripcion: 'Cliente', etiqueta: 'cliente' },
  { key: 'nutriq-baby', nombre: 'NutriQ Baby', descripcion: 'Cliente', etiqueta: 'cliente' },
  { key: 'gran-chuleta', nombre: 'La Gran Chuleta', descripcion: 'Cliente / producto', etiqueta: 'cliente/producto' },
  { key: 'marcas-raiz', nombre: 'Marcas desde la raíz', descripcion: 'Mentoría / insignia', etiqueta: 'mentoría' },
  { key: 'partner-media', nombre: 'Clases Partner Media', descripcion: 'Formación', etiqueta: 'formación' },
  { key: 'bootcamp', nombre: 'Bootcamp', descripcion: 'Formación', etiqueta: 'formación' },
  { key: 'redes-diana', nombre: 'Redes sociales — Diana / IM ROMA', descripcion: 'Propio', etiqueta: 'propio' },
]

export const SEED_AGENDA = {
  fecha: '2026-09-17',
  hora: '08:30',
  texto: 'Reunión con Iván',
  id: 'seed-reunion-ivan-2026-09-17',
}

function normName(s) {
  return String(s || '').trim().toLowerCase().replace(/\s+/g, ' ')
}

export function mergeProjects(list = []) {
  const out = [...list]
  const byName = new Map(out.map((p) => [normName(p.nombre), p]))
  let changed = false
  for (const seed of SEED_PROJECTS) {
    if (byName.has(normName(seed.nombre))) continue
    const item = {
      id: `seed-proj-${seed.key}`,
      nombre: seed.nombre,
      descripcion: seed.descripcion,
      etiqueta: seed.etiqueta,
      tareas: [],
      seeded: true,
      updatedAt: Date.now(),
    }
    out.push(item)
    byName.set(normName(seed.nombre), item)
    changed = true
  }
  return { items: out, changed }
}

export function mergeAgenda(agenda = {}) {
  const next = { ...agenda }
  const { fecha, hora, texto, id } = SEED_AGENDA
  const day = [...(next[fecha] || [])]
  const exists = day.some(
    (t) => t.id === id || (normName(t.text) === normName(texto) && (t.time || '') === hora),
  )
  if (exists) return { agenda: next, changed: false }
  day.push({ id, text: texto, time: hora, done: false, seeded: true, updatedAt: Date.now() })
  next[fecha] = day
  return { agenda: next, changed: true }
}

/** Estado remoto por defecto (API sin datos aún). */
export function defaultRemoteSlice() {
  const { items: proyectos } = mergeProjects([])
  const { agenda } = mergeAgenda({})
  return { proyectos, agenda, recordatorios: [], ideas: [] }
}

export function applySeedMerge(snapshot) {
  const { items: proyectos, changed: pc } = mergeProjects(snapshot.proyectos || [])
  const { agenda, changed: ac } = mergeAgenda(snapshot.agenda || {})
  return {
    ...snapshot,
    proyectos,
    agenda,
    seedsApplied: pc || ac,
  }
}
