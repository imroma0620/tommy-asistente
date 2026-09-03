export default function Settings({ settings, onChange, onClose }) {
  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>Ajustes</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>
        <p className="muted">
          Tommy usa el plan gratis de Gemini. Entra a{' '}
          <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">
            Google AI Studio
          </a>
          , crea una clave y pégala aquí. Se guarda solo en este teléfono o computadora.
        </p>
        <p className="muted">
          No actives facturación ni agregues tarjeta. Si Google te pide pagar, cancela: con el plan Free no hay cobro. Si se acaba la cuota del día, Tommy se pausa hasta mañana, no te factura.
        </p>
        <label className="field">
          <span>Clave de Gemini</span>
          <input
            type="password"
            value={settings.apiKey}
            placeholder="AIza..."
            onChange={(e) => onChange({ apiKey: e.target.value.trim() })}
          />
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={settings.voiceReplies}
            onChange={(e) => onChange({ voiceReplies: e.target.checked })}
          />
          Leer las respuestas de Tommy en voz alta
        </label>
      </div>
    </div>
  )
}
