function withTimeout(promise, ms = 10000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ])
}

function localHost() {
  const host = window.location.hostname
  return host === 'localhost' || host === '127.0.0.1' || /^\d+\.\d+\.\d+\.\d+$/.test(host)
}

async function fetchViaProxy(target) {
  const res = await withTimeout(fetch(`/web?url=${encodeURIComponent(target)}`))
  if (!res.ok) throw new Error(`proxy ${res.status}`)
  return res
}

export async function searchWeb(query) {
  const q = String(query || '').trim()
  if (!q) return { ok: false, error: 'Falta qué buscar.' }
  const resultados = []

  try {
    const url = `https://es.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(q)}&limit=5&namespace=0&format=json&origin=*`
    const data = await (await withTimeout(fetch(url))).json()
    const titles = data[1] || []
    const snippets = data[2] || []
    const links = data[3] || []
    titles.forEach((titulo, i) => {
      resultados.push({
        titulo,
        texto: snippets[i] || '',
        url: links[i] || '',
        fuente: 'Wikipedia',
      })
    })
  } catch {
    // sigue con la web
  }

  try {
    const res = await withTimeout(fetch(`https://s.jina.ai/${encodeURIComponent(q)}`, {
      headers: { Accept: 'text/plain', 'X-Retain-Images': 'none' },
    }), 12000)
    const text = (await res.text()).trim()
    if (res.ok && text.length > 40) {
      resultados.push({
        titulo: `Búsqueda: ${q}`,
        texto: text.slice(0, 5000),
        url: `https://s.jina.ai/${encodeURIComponent(q)}`,
        fuente: 'Web',
      })
    }
  } catch {
    // Jina a veces tarda
  }

  if (localHost() && resultados.length < 2) {
    try {
      const target = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`
      const html = await (await fetchViaProxy(target)).text()
      const bits = [...html.matchAll(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g)]
        .map((m) => m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
        .filter(Boolean)
        .slice(0, 5)
      bits.forEach((texto, i) => {
        resultados.push({ titulo: `Resultado ${i + 1}`, texto, url: '', fuente: 'DuckDuckGo' })
      })
    } catch {
      // el PC no pudo proxy
    }
  }

  if (!resultados.length) {
    return { ok: false, error: 'No pude salir a internet. Revisa los datos del teléfono e inténtalo otra vez.' }
  }
  return { ok: true, consulta: q, resultados }
}

export async function readPage(url) {
  const target = String(url || '').trim()
  if (!/^https?:\/\//i.test(target)) return { ok: false, error: 'Pásame una URL que empiece por https://' }

  try {
    const res = await withTimeout(fetch(`https://r.jina.ai/${target}`, {
      headers: { Accept: 'text/plain', 'X-Retain-Images': 'none' },
    }), 15000)
    const text = (await res.text()).trim()
    if (res.ok && text.length > 40) {
      return { ok: true, url: target, texto: text.slice(0, 12000) }
    }
  } catch {
    // prueba el proxy del PC
  }

  if (localHost()) {
    try {
      const html = await (await fetchViaProxy(target)).text()
      const texto = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      if (texto.length > 40) return { ok: true, url: target, texto: texto.slice(0, 12000) }
    } catch {
      // sin proxy
    }
  }

  return { ok: false, error: `No pude leer ${target}` }
}
