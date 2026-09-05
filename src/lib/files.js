export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function extractPdfStrings(buffer) {
  const raw = new TextDecoder('latin1').decode(buffer)
  const chunks = []
  const re = /\((?:\\[()\\]|[^()])*\)/g
  let match
  while ((match = re.exec(raw))) {
    const piece = match[0]
      .slice(1, -1)
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '')
      .replace(/\\\(/g, '(')
      .replace(/\\\)/g, ')')
      .replace(/\\\\/g, '\\')
    if (piece.trim().length > 2) chunks.push(piece)
  }
  return chunks.join(' ').replace(/\s+/g, ' ').trim()
}

export async function prepareFiles(fileList) {
  const files = Array.from(fileList || [])
  const ready = []
  for (const file of files) {
    if (file.size > 8 * 1024 * 1024) {
      throw new Error(`${file.name} pesa más de 8 MB. Usa uno más liviano.`)
    }
    if (file.type.startsWith('image/')) {
      ready.push({
        kind: 'image',
        name: file.name,
        type: file.type,
        dataUrl: await fileToDataUrl(file),
      })
      continue
    }
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      const buffer = await file.arrayBuffer()
      const extracted = extractPdfStrings(buffer)
      ready.push({
        kind: 'text',
        name: file.name,
        type: 'application/pdf',
        text: extracted || `[PDF: ${file.name}. No pude leer el texto. Pega el contenido o mándame foto de la página.]`,
      })
      continue
    }
    const text = await file.text()
    ready.push({
      kind: 'text',
      name: file.name,
      type: file.type || 'text/plain',
      text: text.slice(0, 24000),
    })
  }
  return ready
}
