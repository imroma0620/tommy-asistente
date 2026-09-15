export const SEED_PROJECTS = [
  { key: 'arts-digital', nombre: 'Arts Digital Institute', descripcion: 'Cliente', etiqueta: 'cliente' },
  { key: 'nutriq-baby', nombre: 'NutriQ Baby', descripcion: 'Cliente', etiqueta: 'cliente' },
  { key: 'gran-chuleta', nombre: 'La Gran Chuleta', descripcion: 'Cliente / producto', etiqueta: 'cliente/producto' },
  { key: 'marcas-raiz', nombre: 'Marcas desde la raíz', descripcion: 'Mentoría / insignia', etiqueta: 'mentoría' },
  { key: 'partner-media', nombre: 'Clases Partner Media', descripcion: 'Formación', etiqueta: 'formación' },
  { key: 'bootcamp', nombre: 'Bootcamp', descripcion: 'Formación', etiqueta: 'formación' },
  { key: 'redes-diana', nombre: 'Redes sociales — Diana / IM ROMA', descripcion: 'Propio', etiqueta: 'propio' },
]

function normName(s) {
  return String(s || '').trim().toLowerCase().replace(/\s+/g, ' ')
}

export function mergeProjects(list = []) {
  const out = [...list]
  const byName = new Map(out.map((p) => [normName(p.nombre), p]))
  for (const seed of SEED_PROJECTS) {
    if (byName.has(normName(seed.nombre))) continue
    out.push({
      id: `seed-proj-${seed.key}`,
      nombre: seed.nombre,
      descripcion: seed.descripcion,
      etiqueta: seed.etiqueta,
      tareas: [],
      seeded: true,
      updatedAt: Date.now(),
    })
  }
  return { items: out }
}

export function mergeAgenda(agenda = {}) {
  const next = { ...agenda }
  const fecha = '2026-09-17'
  const hora = '08:30'
  const texto = 'Reunión con Iván'
  const id = 'seed-reunion-ivan-2026-09-17'
  const day = [...(next[fecha] || [])]
  const exists = day.some(
    (t) => t.id === id || (normName(t.text) === normName(texto) && (t.time || '') === hora),
  )
  if (!exists) {
    day.push({ id, text: texto, time: hora, done: false, seeded: true, updatedAt: Date.now() })
    next[fecha] = day
  }
  return { agenda: next }
}

export function defaultRemoteSlice() {
  const { items: proyectos } = mergeProjects([])
  const { agenda } = mergeAgenda({})
  return { proyectos, agenda, recordatorios: [], ideas: [] }
}
