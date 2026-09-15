import Style from './Style'
import CopyRow from './CopyRow'
import { GROK_BOT_PROFILE, GROK_BOT_ROUTINE } from '../lib/identity'
import { TOMMY_WEB } from '../lib/hosts'

export default function Settings({ settings, profile, onChange, onProfile, onClose }) {
  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>Ajustes</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>

        <h3>Para hablarle en el iPhone</h3>
        <p className="muted">
          No uses Grok ni pagues x.ai. Groq es otra cuenta, gratis, sin tarjeta.
          Entra, crea la clave y pégala aquí una sola vez en este teléfono.
        </p>
        <p className="muted">
          <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer">
            Abrir Groq y crear la clave gsk_
          </a>
        </p>
        <label className="field">
          <span>Clave de Groq (empieza por gsk_)</span>
          <input
            type="password"
            value={settings.apiKey}
            placeholder="gsk_..."
            autoComplete="off"
            onChange={(e) => onChange({ apiKey: e.target.value.trim() })}
          />
        </label>
        {String(settings.apiKey || '').startsWith('gsk_') ? (
          <p className="muted">Listo. Ya puedes hablarle a Tommy en este teléfono.</p>
        ) : null}

        <h3>Tommy en el celular</h3>
        <p className="muted">
          En Safari: Compartir → Añadir a pantalla de inicio. Después ábrelo desde el icono.
        </p>
        <CopyRow value={TOMMY_WEB} />

        <h3>Tommy autónomo (Grok Bot, en el PC)</h3>
        <p className="muted">
          Eso no se pega en el iPhone. Es la app Grok Bot del computador. Ahí Tommy trabaja solo.
          Nombre: Tommy. Oficio: Asistente de IM ROMA. Perfil:
        </p>
        <textarea className="paste" readOnly rows={10} value={GROK_BOT_PROFILE} />
        <CopyRow value={GROK_BOT_PROFILE} preview="Perfil de Tommy para Grok Bot" />
        <p className="muted">Rutina de las 8:00 (Colombia):</p>
        <textarea className="paste" readOnly rows={5} value={GROK_BOT_ROUTINE} />
        <CopyRow value={GROK_BOT_ROUTINE} preview="Rutina diaria de las 8:00" />

        <h3>Higgsfield (esta web)</h3>
        <p className="muted">
          En Grok Bot no hace falta: él abre Higgsfield en su navegador. Aquí sí, si quieres generar desde el chat del celular.
          Entra a{' '}
          <a href="https://cloud.higgsfield.ai" target="_blank" rel="noreferrer">
            cloud.higgsfield.ai
          </a>
          {' '}→ API Keys.
        </p>
        <label className="field">
          <span>Higgsfield Key ID</span>
          <input
            type="password"
            value={settings.higgsfieldKeyId || ''}
            placeholder="Key ID"
            autoComplete="off"
            onChange={(e) => onChange({ higgsfieldKeyId: e.target.value.trim() })}
          />
        </label>
        <label className="field">
          <span>Higgsfield Secret</span>
          <input
            type="password"
            value={settings.higgsfieldSecret || ''}
            placeholder="Secret"
            autoComplete="off"
            onChange={(e) => onChange({ higgsfieldSecret: e.target.value.trim() })}
          />
        </label>
        {settings.higgsfieldKeyId && settings.higgsfieldSecret ? (
          <p className="muted">Higgsfield listo en esta web.</p>
        ) : null}

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
