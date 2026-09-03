export function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = String(reader.result || '')
      const base64 = result.split(',')[1]
      if (!base64) reject(new Error('No se pudo leer el audio'))
      else resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

export function pickMimeType() {
  const options = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']
  if (!window.MediaRecorder) return ''
  return options.find((type) => MediaRecorder.isTypeSupported(type)) || ''
}

export async function startRecording() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  const mimeType = pickMimeType()
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
  const chunks = []
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data)
  }
  recorder.start()
  return {
    recorder,
    stream,
    stop: () =>
      new Promise((resolve) => {
        recorder.onstop = () => {
          stream.getTracks().forEach((track) => track.stop())
          const type = recorder.mimeType || mimeType || 'audio/webm'
          resolve(new Blob(chunks, { type }))
        }
        if (recorder.state !== 'inactive') recorder.stop()
      }),
  }
}
