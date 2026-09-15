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

/** America/Bogotá — hora 24h en storage; texto legible en UI. */
export const SEED_AGENDA_ITEMS = [
  { id: 'seed-clase-2026-09-15', fecha: '2026-09-15', hora: '18:30', texto: 'Clase 6:30–9:30 p. m.' },
  { id: 'seed-clase-2026-09-16', fecha: '2026-09-16', hora: '18:30', texto: 'Clase 6:30–9:30 p. m.' },
  { id: 'seed-clase-2026-09-17', fecha: '2026-09-17', hora: '18:30', texto: 'Clase 6:30–9:30 p. m.' },
  { id: 'seed-reunion-ivan-2026-09-17', fecha: '2026-09-17', hora: '08:30', texto: 'Reunión con Iván' },
]

export const SEED_REMINDER_ITEMS = [
  {
    id: 'seed-rem-clase-2026-09-15',
    fecha: '2026-09-15',
    hora: '17:50',
    text: 'En 40 min: clase 6:30–9:30 p. m.',
    prioridad: 'alta',
  },
  {
    id: 'seed-rem-clase-2026-09-16',
    fecha: '2026-09-16',
    hora: '17:50',
    text: 'En 40 min: clase 6:30–9:30 p. m.',
    prioridad: 'alta',
  },
  {
    id: 'seed-rem-clase-2026-09-17',
    fecha: '2026-09-17',
    hora: '17:50',
    text: 'En 40 min: clase 6:30–9:30 p. m.',
    prioridad: 'alta',
  },
]

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
  let changed = false
  for (const seed of SEED_AGENDA_ITEMS) {
    const { fecha, hora, texto, id } = seed
    const day = [...(next[fecha] || [])]
    const exists = day.some(
      (t) => t.id === id || (normName(t.text) === normName(texto) && (t.time || '') === hora),
    )
    if (exists) continue
    day.push({ id, text: texto, time: hora, done: false, seeded: true, updatedAt: Date.now() })
    next[fecha] = day
    changed = true
  }
  return { agenda: next, changed }
}

export function mergeRecordatorios(list = []) {
  const out = [...list]
  const byId = new Set(out.map((r) => String(r.id)))
  let changed = false
  for (const seed of SEED_REMINDER_ITEMS) {
    if (byId.has(seed.id)) continue
    const dup = out.some(
      (r) =>
        r.fecha === seed.fecha &&
        (r.hora || '') === seed.hora &&
        normName(r.text) === normName(seed.text),
    )
    if (dup) continue
    out.push({
      ...seed,
      nota: '',
      done: false,
      notified: false,
      seeded: true,
      updatedAt: Date.now(),
    })
    byId.add(seed.id)
    changed = true
  }
  return { recordatorios: out, changed }
}

/** Estado remoto por defecto (API sin datos aún). */
export function defaultRemoteSlice() {
  const { items: proyectos } = mergeProjects([])
  const { agenda } = mergeAgenda({})
  const { recordatorios } = mergeRecordatorios([])
  return { proyectos, agenda, recordatorios, ideas: [] }
}

export function applySeedMerge(snapshot) {
  const { items: proyectos, changed: pc } = mergeProjects(snapshot.proyectos || [])
  const { agenda, changed: ac } = mergeAgenda(snapshot.agenda || {})
  const { recordatorios, changed: rc } = mergeRecordatorios(snapshot.recordatorios || [])
  return {
    ...snapshot,
    proyectos,
    agenda,
    recordatorios,
    seedsApplied: pc || ac || rc,
  }
}
