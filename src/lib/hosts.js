export function isLocalHost() {
  const host = window.location.hostname
  return host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local')
    || /^\d+\.\d+\.\d+\.\d+$/.test(host)
}

export function hasApiProxy() {
  const host = window.location.hostname
  return isLocalHost() || host.endsWith('.vercel.app')
}

/** URL canónica de Tommy (Vercel). GitHub Pages: https://imroma0620.github.io/tommy-asistente/ */
export const TOMMY_WEB = 'https://tommy-asistente.vercel.app/'

export const TOMMY_WEB_PAGES = 'https://imroma0620.github.io/tommy-asistente/'
