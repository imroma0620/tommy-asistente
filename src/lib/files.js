export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
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
    const text = await file.text()
    const looksBinary = file.type === 'application/pdf' || text.startsWith('%PDF')
    ready.push({
      kind: 'text',
      name: file.name,
      type: file.type || 'text/plain',
      text: looksBinary
        ? `[PDF o archivo binario: ${file.name}. Si no se lee bien, mándame una foto de la página o pega el texto.]`
        : text.slice(0, 24000),
    })
  }
  return ready
}
