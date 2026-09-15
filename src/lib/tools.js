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
  rememberSource,
  rememberFacts,
} from './storage'
import { searchWeb, readPage } from './web'
import { createDocument, createPresentation, createScript } from './exports'
import { generateHiggsfieldImage, generateHiggsfieldVideo } from './higgsfield'

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
    name: 'buscar_internet',
    description: 'Busca en internet información actual. Úsala SIEMPRE que pida investigar, buscar, referencias, tendencias o datos que no estén en su memoria.',
    parameters: {
      type: 'OBJECT',
      properties: {
        consulta: { type: 'STRING', description: 'Qué hay que buscar' },
      },
      required: ['consulta'],
    },
  },
  {
    name: 'leer_pagina',
    description: 'Lee el contenido de una URL para usarlo en un guion, PDF o respuesta.',
    parameters: {
      type: 'OBJECT',
      properties: {
        url: { type: 'STRING' },
      },
      required: ['url'],
    },
  },
  {
    name: 'crear_pdf',
    description: 'Crea un documento IM ROMA descargable (HTML listo para abrir, compartir o imprimir como PDF). No describas el PDF: créalo.',
    parameters: {
      type: 'OBJECT',
      properties: {
        titulo: { type: 'STRING' },
        cuerpo: { type: 'STRING', description: 'Texto completo del documento, con su voz' },
        kicker: { type: 'STRING', description: 'Etiqueta corta: Brief, Mentoria, Propuesta...' },
      },
      required: ['titulo', 'cuerpo'],
    },
  },
  {
    name: 'crear_presentacion',
    description: 'Crea una presentación IM ROMA descargable, diapositiva por diapositiva.',
    parameters: {
      type: 'OBJECT',
      properties: {
        titulo: { type: 'STRING' },
        slides: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              titulo: { type: 'STRING' },
              cuerpo: { type: 'STRING' },
              nota: { type: 'STRING' },
            },
            required: ['titulo', 'cuerpo'],
          },
        },
      },
      required: ['titulo', 'slides'],
    },
  },
  {
    name: 'crear_guion',
    description: 'Crea un guion descargable: reel, mentoría, evento o pieza. Con locución y visual.',
    parameters: {
      type: 'OBJECT',
      properties: {
        titulo: { type: 'STRING' },
        tipo: { type: 'STRING', description: 'reel, mentoria, evento, post, otro' },
        cuerpo: { type: 'STRING' },
        escenas: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              titulo: { type: 'STRING' },
              tiempo: { type: 'STRING' },
              locucion: { type: 'STRING' },
              visual: { type: 'STRING' },
            },
          },
        },
      },
      required: ['titulo'],
    },
  },
  {
    name: 'aprender_de_documento',
    description: 'Guarda de forma permanente lo que ella te enseñó en un documento, bio, brief o formato. Úsala cada vez que adjunte material sobre ella, su marca o un cliente.',
    parameters: {
      type: 'OBJECT',
      properties: {
        nombre: { type: 'STRING' },
        resumen: { type: 'STRING' },
        hechos: { type: 'ARRAY', items: { type: 'STRING' } },
      },
      required: ['nombre', 'resumen'],
    },
  },
  {
    name: 'generar_imagen_higgsfield',
    description: 'Genera una imagen con Higgsfield Soul. Úsala cuando pida imagen, still, visual, Soul o un frame. No describas la imagen: génela.',
    parameters: {
      type: 'OBJECT',
      properties: {
        prompt: { type: 'STRING', description: 'Prompt visual completo, en inglés o español, con luz, encuadre y estilo' },
        formato: { type: 'STRING', enum: ['9:16', '16:9', '1:1', '4:5', '4:3', '3:4', '3:2', '2:3', '21:9'] },
        cantidad: { type: 'NUMBER', description: '1 a 4' },
        resolucion: { type: 'STRING', enum: ['2K', '4K'] },
      },
      required: ['prompt'],
    },
  },
  {
    name: 'generar_video_higgsfield',
    description: 'Genera un video con Higgsfield. Si hay imagen adjunta o image_url, usa DoP. Si solo hay texto, texto a video. No describas el video: génelo.',
    parameters: {
      type: 'OBJECT',
      properties: {
        prompt: { type: 'STRING', description: 'Movimiento, cámara y escena' },
        image_url: { type: 'STRING', description: 'URL pública de la imagen inicial, si ya la tiene' },
        formato: { type: 'STRING', enum: ['9:16', '16:9', '1:1', '4:3', '3:4'] },
        duracion: { type: 'NUMBER', description: 'Segundos, 2 a 12' },
      },
      required: ['prompt'],
    },
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

export async function executeTool(name, args = {}, context = {}) {
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
      const hechos = [...(current.hechos || []), args.hecho].slice(-80)
      saveProfile({ ...current, hechos })
      return { ok: true }
    }
    case 'buscar_internet':
      return searchWeb(args.consulta)
    case 'leer_pagina':
      return readPage(args.url)
    case 'crear_pdf':
      return createDocument({ titulo: args.titulo, cuerpo: args.cuerpo, kicker: args.kicker })
    case 'crear_presentacion':
      return createPresentation({ titulo: args.titulo, slides: args.slides })
    case 'crear_guion':
      return createScript({ titulo: args.titulo, tipo: args.tipo, escenas: args.escenas, cuerpo: args.cuerpo })
    case 'aprender_de_documento': {
      rememberSource(args.nombre, args.resumen)
      rememberFacts(args.hechos || [])
      return { ok: true, guardado: args.nombre }
    }
    case 'generar_imagen_higgsfield':
      return generateHiggsfieldImage(args)
    case 'generar_video_higgsfield':
      return generateHiggsfieldVideo(args, context)
    default:
      return { ok: false, error: `Herramienta desconocida: ${name}` }
  }
}
