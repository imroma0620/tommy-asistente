export default function Style({ profile, onChange }) {
  const set = (patch) => onChange({ ...profile, ...patch })
  const join = (value) => (Array.isArray(value) ? value.join('\n') : value || '')
  const split = (value) => value.split('\n').map((line) => line.trim()).filter(Boolean)

  return (
    <div className="style-page">
      <p className="muted">
        Esto es cómo se educa a Tommy. No es un entrenamiento de pago: es tu voz, tus reglas y cómo decides.
        También puedes decírselo en el chat: “así hablo yo…”, “nunca hagas…”, “cuando arme la semana…”.
      </p>
      <label className="field">
        <span>Cómo te llamas / cómo te dice</span>
        <input value={profile.nombre} onChange={(e) => set({ nombre: e.target.value })} placeholder="Ej. Cali" />
      </label>
      <label className="field">
        <span>Cómo hablas</span>
        <textarea
          value={profile.comoHabla}
          onChange={(e) => set({ comoHabla: e.target.value })}
          placeholder="Directo, en colombiano, corto, sin corporativo…"
        />
      </label>
      <label className="field">
        <span>Cómo piensas</span>
        <textarea
          value={profile.comoPiensa}
          onChange={(e) => set({ comoPiensa: e.target.value })}
          placeholder="Priorizo lo que vende, no me enredo, primero lo urgente de clientes…"
        />
      </label>
      <label className="field">
        <span>Cómo actúas</span>
        <textarea
          value={profile.comoActua}
          onChange={(e) => set({ comoActua: e.target.value })}
          placeholder="Si me dan una idea, la convierto en reel. Si hay reunión, la meto a calendario…"
        />
      </label>
      <label className="field">
        <span>Reglas (una por línea)</span>
        <textarea value={join(profile.reglas)} onChange={(e) => set({ reglas: split(e.target.value) })} placeholder="No agendar nada el domingo&#10;Los reels van en bloques de 3" />
      </label>
      <label className="field">
        <span>Frases que sí dirías (una por línea)</span>
        <textarea value={join(profile.ejemplos)} onChange={(e) => set({ ejemplos: split(e.target.value) })} />
      </label>
      <label className="field">
        <span>Qué evitar</span>
        <textarea value={join(profile.evitar)} onChange={(e) => set({ evitar: split(e.target.value) })} placeholder="No me hablen de usted&#10;No emojis infantiles" />
      </label>
    </div>
  )
}
