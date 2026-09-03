import {
  getAgenda,
  saveAgenda,
  getReminders,
  saveReminders,
  getProjects,
  saveProjects,
  getIdeas,
  saveIdeas,
  weekDates,
  isoDate,
  DAY_NAMES,
  getProfile,
  saveProfile,
} from './storage'

export const TOOL_DECLARATIONS = [
  {
    name: 'planificar_semana',
    description: 'Crea o reemplaza varias tareas de la agenda en una sola acción. Úsala cuando el usuario quiera armar o reorganizar la semana.',
    parameters: {
      type: 'OBJECT',
      properties: {
        tareas: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              fecha: { type: 'STRING', description: 'YYYY-MM-DD' },
              texto: { type: 'STRING' },
              hora: { type: 'STRING', description: 'HH:MM, opcional' },
            },
            required: ['fecha', 'texto'],
          },
        },
      },
      required: ['tareas'],
    },
  },
  {
    name: 'crear_tarea_agenda',
    description: 'Agrega una tarea o evento a un día concreto de la agenda.',
    parameters: {
      type: 'OBJECT',
      properties: {
        fecha: { type: 'STRING', description: 'YYYY-MM-DD' },
        texto: { type: 'STRING' },
        hora: { type: 'STRING' },
      },
      required: ['fecha', 'texto'],
    },
  },
  {
    name: 'listar_agenda',
    description: 'Lee la agenda. offset 0 es esta semana, -1 la anterior, 1 la siguiente.',
    parameters: {
      type: 'OBJECT',
      properties: {
        offset: { type: 'NUMBER' },
      },
    },
  },
  {
    name: 'completar_tarea_agenda',
    description: 'Marca una tarea de la agenda como hecha o no hecha.',
    parameters: {
      type: 'OBJECT',
      properties: {
        fecha: { type: 'STRING' },
        id: { type: 'NUMBER' },
        hecha: { type: 'BOOLEAN' },
      },
      required: ['fecha', 'id'],
    },
  },
  {
    name: 'borrar_tarea_agenda',
    description: 'Elimina una tarea de la agenda.',
    parameters: {
      type: 'OBJECT',
      properties: {
        fecha: { type: 'STRING' },
        id: { type: 'NUMBER' },
      },
      required: ['fecha', 'id'],
    },
  },
  {
    name: 'crear_recordatorio',
    description: 'Crea un recordatorio con fecha, hora y prioridad.',
    parameters: {
      type: 'OBJECT',
      properties: {
        texto: { type: 'STRING' },
        fecha: { type: 'STRING', description: 'YYYY-MM-DD' },
        hora: { type: 'STRING', description: 'HH:MM' },
        prioridad: { type: 'STRING', enum: ['alta', 'media', 'baja'] },
        nota: { type: 'STRING' },
      },
      required: ['texto'],
    },
  },
  {
    name: 'listar_recordatorios',
    description: 'Lista recordatorios. filtro: todos, pendientes o completados.',
    parameters: {
      type: 'OBJECT',
      properties: {
        filtro: { type: 'STRING', enum: ['todos', 'pendientes', 'completados'] },
      },
    },
  },
  {
    name: 'completar_recordatorio',
    description: 'Marca un recordatorio como hecho.',
    parameters: {
      type: 'OBJECT',
      properties: {
        id: { type: 'NUMBER' },
      },
      required: ['id'],
    },
  },
  {
    name: 'borrar_recordatorio',
    description: 'Elimina un recordatorio.',
    parameters: {
      type: 'OBJECT',
      properties: {
        id: { type: 'NUMBER' },
      },
      required: ['id'],
    },
  },
  {
    name: 'crear_proyecto',
    description: 'Crea un proyecto para organizar trabajo.',
    parameters: {
      type: 'OBJECT',
      properties: {
        nombre: { type: 'STRING' },
        descripcion: { type: 'STRING' },
      },
      required: ['nombre'],
    },
  },
  {
    name: 'agregar_tarea_proyecto',
    description: 'Agrega una tarea a un proyecto existente. columna: pendiente, en_progreso, revision, completado.',
    parameters: {
      type: 'OBJECT',
      properties: {
        proyecto: { type: 'STRING', description: 'Nombre o parte del nombre del proyecto' },
        texto: { type: 'STRING' },
        columna: { type: 'STRING', enum: ['pendiente', 'en_progreso', 'revision', 'completado'] },
        prioridad: { type: 'STRING', enum: ['alta', 'media', 'baja'] },
      },
      required: ['proyecto', 'texto'],
    },
  },
  {
    name: 'mover_tarea_proyecto',
    description: 'Cambia de columna una tarea de un proyecto.',
    parameters: {
      type: 'OBJECT',
      properties: {
        proyecto: { type: 'STRING' },
        tarea: { type: 'STRING' },
        columna: { type: 'STRING', enum: ['pendiente', 'en_progreso', 'revision', 'completado'] },
      },
      required: ['proyecto', 'tarea', 'columna'],
    },
  },
  {
    name: 'listar_proyectos',
    description: 'Lista proyectos y sus tareas.',
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
  },
  {
    name: 'guardar_idea',
    description: 'Guarda y estructura una idea de contenido.',
    parameters: {
      type: 'OBJECT',
      properties: {
        titulo: { type: 'STRING' },
        descripcion: { type: 'STRING' },
        tipo: { type: 'STRING', description: 'Reel, Post, Story, Video largo, Blog, Podcast, Email, Otro' },
        tags: { type: 'ARRAY', items: { type: 'STRING' } },
        estado: { type: 'STRING', enum: ['idea', 'desarrollo', 'listo', 'publicado'] },
      },
      required: ['titulo'],
    },
  },
  {
    name: 'actualizar_idea',
    description: 'Cambia el estado o datos de una idea de contenido.',
    parameters: {
      type: 'OBJECT',
      properties: {
        titulo: { type: 'STRING' },
        estado: { type: 'STRING', enum: ['idea', 'desarrollo', 'listo', 'publicado'] },
        descripcion: { type: 'STRING' },
      },
      required: ['titulo'],
    },
  },
  {
    name: 'listar_ideas',
    description: 'Lista ideas de contenido guardadas.',
    parameters: {
      type: 'OBJECT',
      properties: {
        estado: { type: 'STRING' },
        tipo: { type: 'STRING' },
      },
    },
  },
  {
    name: 'actualizar_estilo',
    description: 'Guarda cómo habla, piensa y actúa el usuario para que Tommy lo imite.',
    parameters: {
      type: 'OBJECT',
      properties: {
        nombre: { type: 'STRING' },
        comoHabla: { type: 'STRING' },
        comoPiensa: { type: 'STRING' },
        comoActua: { type: 'STRING' },
        reglas: { type: 'ARRAY', items: { type: 'STRING' } },
        ejemplos: { type: 'ARRAY', items: { type: 'STRING' } },
        evitar: { type: 'ARRAY', items: { type: 'STRING' } },
      },
    },
  },
  {
    name: 'recordar_preferencia',
    description: 'Guarda un hecho o preferencia permanente sobre el usuario.',
    parameters: {
      type: 'OBJECT',
      properties: {
        hecho: { type: 'STRING' },
      },
      required: ['hecho'],
    },
  },
  {
    name: 'listar_calendario',
    description: 'Lee los próximos eventos del Google Calendar conectado.',
    parameters: { type: 'OBJECT', properties: {} },
  },
  {
    name: 'crear_evento_calendario',
    description: 'Crea un evento en Google Calendar. fecha YYYY-MM-DD, hora HH:MM.',
    parameters: {
      type: 'OBJECT',
      properties: {
        titulo: { type: 'STRING' },
        fecha: { type: 'STRING' },
        hora: { type: 'STRING' },
        duracionMin: { type: 'NUMBER' },
        nota: { type: 'STRING' },
      },
      required: ['titulo', 'fecha'],
    },
  },
]

function findProject(nombre) {
  const q = String(nombre || '').toLowerCase()
  return getProjects().find((p) => p.nombre.toLowerCase().includes(q))
}

function findIdea(titulo) {
  const q = String(titulo || '').toLowerCase()
  return getIdeas().find((i) => i.titulo.toLowerCase().includes(q))
}

export function executeTool(name, args = {}) {
  switch (name) {
    case 'planificar_semana': {
      const agenda = getAgenda()
      const created = []
      for (const t of args.tareas || []) {
        if (!t.fecha || !t.texto) continue
        const task = { id: Date.now() + created.length, text: t.texto, time: t.hora || '', done: false }
        agenda[t.fecha] = [...(agenda[t.fecha] || []), task]
        created.push({ fecha: t.fecha, ...task })
      }
      saveAgenda(agenda)
      return { ok: true, creadas: created.length, tareas: created }
    }
    case 'crear_tarea_agenda': {
      const agenda = getAgenda()
      const task = { id: Date.now(), text: args.texto, time: args.hora || '', done: false }
      agenda[args.fecha] = [...(agenda[args.fecha] || []), task]
      saveAgenda(agenda)
      return { ok: true, tarea: { fecha: args.fecha, ...task } }
    }
    case 'listar_agenda': {
      const offset = Number(args.offset || 0)
      const dates = weekDates(offset)
      const agenda = getAgenda()
      return {
        semana: dates.map((d, i) => {
          const key = isoDate(d)
          return { dia: DAY_NAMES[i], fecha: key, tareas: agenda[key] || [] }
        }),
      }
    }
    case 'completar_tarea_agenda': {
      const agenda = getAgenda()
      const list = agenda[args.fecha] || []
      agenda[args.fecha] = list.map((t) => (t.id === args.id ? { ...t, done: args.hecha !== false } : t))
      saveAgenda(agenda)
      return { ok: true }
    }
    case 'borrar_tarea_agenda': {
      const agenda = getAgenda()
      agenda[args.fecha] = (agenda[args.fecha] || []).filter((t) => t.id !== args.id)
      saveAgenda(agenda)
      return { ok: true }
    }
    case 'crear_recordatorio': {
      const items = getReminders()
      const item = {
        id: Date.now(),
        text: args.texto,
        fecha: args.fecha || '',
        hora: args.hora || '',
        prioridad: args.prioridad || 'media',
        nota: args.nota || '',
        done: false,
        notified: false,
      }
      saveReminders([item, ...items])
      return { ok: true, recordatorio: item }
    }
    case 'listar_recordatorios': {
      const items = getReminders()
      const filtro = args.filtro || 'todos'
      return {
        recordatorios: items.filter((i) => {
          if (filtro === 'pendientes') return !i.done
          if (filtro === 'completados') return i.done
          return true
        }),
      }
    }
    case 'completar_recordatorio': {
      saveReminders(getReminders().map((i) => (i.id === args.id ? { ...i, done: true } : i)))
      return { ok: true }
    }
    case 'borrar_recordatorio': {
      saveReminders(getReminders().filter((i) => i.id !== args.id))
      return { ok: true }
    }
    case 'crear_proyecto': {
      const items = getProjects()
      const proyecto = {
        id: Date.now(),
        nombre: args.nombre,
        descripcion: args.descripcion || '',
        tareas: [],
      }
      saveProjects([...items, proyecto])
      return { ok: true, proyecto }
    }
    case 'agregar_tarea_proyecto': {
      const proyecto = findProject(args.proyecto)
      if (!proyecto) return { ok: false, error: 'No encontré ese proyecto' }
      const tarea = {
        id: Date.now(),
        texto: args.texto,
        columna: args.columna || 'pendiente',
        prioridad: args.prioridad || 'media',
      }
      saveProjects(
        getProjects().map((p) => (p.id === proyecto.id ? { ...p, tareas: [...p.tareas, tarea] } : p)),
      )
      return { ok: true, proyecto: proyecto.nombre, tarea }
    }
    case 'mover_tarea_proyecto': {
      const proyecto = findProject(args.proyecto)
      if (!proyecto) return { ok: false, error: 'No encontré ese proyecto' }
      const q = String(args.tarea || '').toLowerCase()
      let found = false
      saveProjects(
        getProjects().map((p) => {
          if (p.id !== proyecto.id) return p
          return {
            ...p,
            tareas: p.tareas.map((t) => {
              if (t.texto.toLowerCase().includes(q)) {
                found = true
                return { ...t, columna: args.columna }
              }
              return t
            }),
          }
        }),
      )
      return found ? { ok: true } : { ok: false, error: 'No encontré esa tarea' }
    }
    case 'listar_proyectos':
      return { proyectos: getProjects() }
    case 'guardar_idea': {
      const idea = {
        id: Date.now(),
        titulo: args.titulo,
        descripcion: args.descripcion || '',
        tipo: args.tipo || 'Otro',
        tags: args.tags || [],
        estado: args.estado || 'idea',
        destacada: false,
      }
      saveIdeas([idea, ...getIdeas()])
      return { ok: true, idea }
    }
    case 'actualizar_idea': {
      const idea = findIdea(args.titulo)
      if (!idea) return { ok: false, error: 'No encontré esa idea' }
      saveIdeas(
        getIdeas().map((i) =>
          i.id === idea.id
            ? { ...i, estado: args.estado || i.estado, descripcion: args.descripcion || i.descripcion }
            : i,
        ),
      )
      return { ok: true }
    }
    case 'listar_ideas': {
      return {
        ideas: getIdeas().filter((i) => {
          if (args.estado && i.estado !== args.estado) return false
          if (args.tipo && i.tipo !== args.tipo) return false
          return true
        }),
      }
    }
    case 'actualizar_estilo': {
      const current = getProfile()
      saveProfile({
        ...current,
        ...Object.fromEntries(Object.entries(args).filter(([, value]) => value !== undefined && value !== '')),
        reglas: args.reglas || current.reglas,
        ejemplos: args.ejemplos || current.ejemplos,
        evitar: args.evitar || current.evitar,
      })
      return { ok: true, perfil: getProfile() }
    }
    case 'recordar_preferencia': {
      const current = getProfile()
      const hechos = [...(current.hechos || []), args.hecho].slice(-40)
      saveProfile({ ...current, hechos })
      return { ok: true }
    }
    default:
      return { ok: false, error: `Herramienta desconocida: ${name}` }
  }
}
