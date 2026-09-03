import { useState } from 'react'

export default function CopyRow({ label, value }) {
  const [done, setDone] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
    } catch {
      const el = document.createElement('textarea')
      el.value = value
      el.setAttribute('readonly', '')
      el.style.position = 'fixed'
      el.style.left = '-9999px'
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      el.remove()
    }
    setDone(true)
    setTimeout(() => setDone(false), 1600)
  }

  return (
    <div className="copy-row">
      {label ? <span className="copy-label">{label}</span> : null}
      <code className="copy">{value}</code>
      <button type="button" className="ghost" onClick={copy}>{done ? 'Copiado' : 'Copiar'}</button>
    </div>
  )
}
