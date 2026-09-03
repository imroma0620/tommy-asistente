import Style from './Style'

export default function Settings({ settings, profile, onChange, onProfile, onClose }) {
  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>Ajustes</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>

        <label className="field">
          <span>Clave de Groq</span>
          <input
            type="password"
            value={settings.apiKey}
            placeholder="gsk_..."
            autoComplete="off"
            onChange={(e) => onChange({ apiKey: e.target.value.trim() })}
          />
        </label>
        <p className="muted">Gratis, sin tarjeta. Empieza por gsk_. En el iPhone pégala una vez: esa copia es del teléfono y no necesita el PC.</p>

        <label className="check">
          <input
            type="checkbox"
            checked={settings.voiceReplies}
            onChange={(e) => onChange({ voiceReplies: e.target.checked })}
          />
          Leer las respuestas de Tommy en voz alta
        </label>

        <h3>Cómo quieres que hable y decida</h3>
        {profile && onProfile && <Style profile={profile} onChange={onProfile} />}
      </div>
    </div>
  )
}
