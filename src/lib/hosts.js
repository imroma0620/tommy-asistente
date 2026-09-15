export function isLocalHost() {
  const host = window.location.hostname
  return host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local')
    || /^\d+\.\d+\.\d+\.\d+$/.test(host)
}

export function hasApiProxy() {
  const host = window.location.hostname
  return isLocalHost() || host.endsWith('.vercel.app')
}

export const TOMMY_WEB = 'https://imroma0620.github.io/tommy-asistente/'
