import { useEffect, useMemo, useRef, useState } from 'react'
import { Activity, Check, ChevronDown, Heart, LockKeyhole, Save, ShieldCheck, Sparkles, Star, Users, X } from 'lucide-react'
import { staff } from '../data/staff'
import { optionsByCategory, type AppearanceOption } from '../game/CharacterOptions'
import { resolveCharacterAppearance } from '../game/characterRules'
import { assignAvailableRoles, calculateTeamFactors, getTeamMemberView, isValidTeam, recoverStaffEnergy, staffAccessoryUnlockLevel, teamRoles } from '../game/teamRules'
import { useGameStore } from '../store/gameStore'
import type { CharacterAppearance, MedicalProfessional, Role, StaffProfile } from '../types'
import { Avatar } from './Avatar'
import { CharacterRenderer } from './CharacterRenderer'
import './TeamPage.css'
import './TeamPageMotion.css'

const roleLabels: Record<Role, string> = {
  anesthesia: 'Anestesia',
  instrument: 'Instrumentación',
  circulating: 'Enfermería circulante',
  assistant: 'Cirugía asistente',
}
const statLabels = [
  ['precision', 'Precisión'],
  ['speed', 'Velocidad'],
  ['calm', 'Calma'],
  ['teamwork', 'Trabajo en equipo'],
] as const
type EditField = 'uniform' | 'uniformStyle' | 'hatStyle' | 'hatColor' | 'glassesStyle' | 'glassesColor' | 'mask' | 'stethoscope' | 'shoeColor'
type TeamFilter = 'all' | Role

function isActiveRun(status: string) {
  return ['IN_PROGRESS', 'COMPLICATION', 'STABILIZED'].includes(status)
}

function memberRole(id: string, assignments: Partial<Record<Role, string>>) {
  return teamRoles.find(role => assignments[role] === id)
}

function statValue(person: MedicalProfessional, key: 'precision' | 'speed' | 'calm' | 'teamwork') {
  return person.stats[key]
}

function profileFromView(
  view: ReturnType<typeof getTeamMemberView>,
  old: StaffProfile | undefined,
  changes: { name?: string; appearance?: Partial<CharacterAppearance> },
): StaffProfile {
  return {
    name: changes.name ?? view.name,
    experiencePoints: view.experiencePoints,
    energy: view.energy,
    appearance: resolveCharacterAppearance({ ...view.appearance, ...changes.appearance }),
    affinities: old?.affinities ?? {},
  }
}

function OptionButton({
  option,
  active,
  locked,
  disabled,
  onClick,
}: {
  option: AppearanceOption
  active: boolean
  locked?: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return <button
    type="button"
    className={`team-style-option ${active ? 'is-active' : ''} ${locked ? 'is-locked' : ''} ${disabled ? 'is-disabled' : ''}`}
    aria-label={`${option.label}${locked ? ' (bloqueado)' : ''}`}
    aria-pressed={active}
    disabled={locked || disabled}
    onClick={onClick}
    title={locked ? 'Se desbloquea al subir de nivel' : disabled ? 'La personalización se habilita al terminar la cirugía' : option.label}
  >
    {option.color ? <i style={{ backgroundColor: option.color }} /> : <span>{option.label}</span>}
    {active && <Check size={13} />}
    {locked && <LockKeyhole size={12} />}
  </button>
}

export function TeamPage({ onBack, onNotify }: { onBack: () => void; onNotify: (message: string) => void }) {
  const {
    selectedStaff, setSelectedStaff, roleAssignments, setRoleAssignments,
    staffProfiles, setStaffProfile, favoriteTeam, saveFavoriteTeam, loadFavoriteTeam,
    saved, save, surgery,
  } = useGameStore()
  const [filter, setFilter] = useState<TeamFilter>('all')
  const [sort, setSort] = useState<'performance' | 'experience'>('performance')
  const [activeId, setActiveId] = useState(selectedStaff[0] ?? staff[0].id)
  const [editor, setEditor] = useState<EditField>('uniform')
  const [greeting, setGreeting] = useState(false)
  const [levelUp, setLevelUp] = useState(false)
  const [departedId, setDepartedId] = useState('')
  const previousLevel = useRef<string>('')
  const locked = isActiveRun(surgery.status)
  const selectedViews = selectedStaff
    .map(id => staff.find(person => person.id === id))
    .filter((person): person is MedicalProfessional => !!person)
    .map(person => getTeamMemberView(person, staffProfiles))
  const factors = calculateTeamFactors(selectedStaff, staffProfiles)
  const validTeam = isValidTeam(selectedStaff, roleAssignments)
  const activePerson = staff.find(person => person.id === activeId) ?? staff[0]
  const activeView = getTeamMemberView(activePerson, staffProfiles)
  const activeRole = memberRole(activePerson.id, roleAssignments)
  const reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const catalog = useMemo(() => staff
    .filter(person => filter === 'all' || person.roles.includes(filter))
    .map(person => getTeamMemberView(person, staffProfiles))
    .sort((a, b) => sort === 'performance'
      ? (b.stats.precision + b.stats.speed + b.stats.calm + b.stats.teamwork) - (a.stats.precision + a.stats.speed + a.stats.calm + a.stats.teamwork)
      : (b.stats.experience + b.experiencePoints) - (a.stats.experience + a.experiencePoints)),
  [filter, sort, staffProfiles])

  useEffect(() => {
    const levelKey = `${activeId}:${activeView.level}`
    if (previousLevel.current && previousLevel.current !== levelKey && previousLevel.current.startsWith(`${activeId}:`) && !reducedMotion) {
      setLevelUp(true)
      const timer = window.setTimeout(() => setLevelUp(false), 1500)
      previousLevel.current = levelKey
      return () => window.clearTimeout(timer)
    }
    previousLevel.current = levelKey
  }, [activeId, activeView.level, reducedMotion])

  const showGreeting = () => {
    if (reducedMotion) return
    setGreeting(true)
    window.setTimeout(() => setGreeting(false), 900)
  }

  const togglePerson = (id: string) => {
    if (locked) return
    if (selectedStaff.includes(id)) {
      const next = selectedStaff.filter(item => item !== id)
      const assignments = { ...roleAssignments }
      for (const role of teamRoles) if (assignments[role] === id) delete assignments[role]
      if (!reducedMotion) {
        setDepartedId(id)
        window.setTimeout(() => setDepartedId(''), 400)
      }
      setSelectedStaff(next)
      setRoleAssignments(assignments)
      if (activeId === id && next[0]) setActiveId(next[0])
      onNotify(`${staff.find(person => person.id === id)?.name ?? 'Profesional'} salió del equipo.`)
      return
    }
    if (selectedStaff.length >= 4) {
      onNotify('El equipo admite exactamente 4 acompañantes. Retira a alguien para cambiarlo.')
      return
    }
    setSelectedStaff([...selectedStaff, id])
    const person = staff.find(member => member.id === id)
    if (person) {
      const assignments = { ...roleAssignments }
      for (const role of person.roles) {
        if (!assignments[role] || !selectedStaff.includes(assignments[role]!)) {
          assignments[role] = id
          break
        }
      }
      setRoleAssignments(assignments)
    }
    setActiveId(id)
    showGreeting()
  }

  const changeRole = (role: Role, id: string) => {
    if (locked) return
    const assignments = { ...roleAssignments }
    for (const otherRole of teamRoles) if (otherRole !== role && assignments[otherRole] === id) delete assignments[otherRole]
    if (id) assignments[role] = id
    else delete assignments[role]
    setRoleAssignments(assignments)
  }

  const saveProfile = (changes: { name?: string; appearance?: Partial<CharacterAppearance> }) => {
    if (locked) return
    setStaffProfile(activePerson.id, profileFromView(activeView, staffProfiles[activePerson.id], changes))
  }

  const selectOption = (option: AppearanceOption) => {
    if (locked) return
    saveProfile({ appearance: { [option.field]: option.value } })
  }

  const recoverEnergy = () => {
    if (locked || activeView.energy >= 100) return
    const profile = profileFromView(activeView, staffProfiles[activePerson.id], {})
    setStaffProfile(activePerson.id, recoverStaffEnergy(profile))
    onNotify(`${activeView.name} recuperó energía.`)
  }

  const saveFavorite = () => {
    if (!validTeam || locked) return
    saveFavoriteTeam()
    save('team')
    onNotify('¡Equipo guardado como favorito!')
  }

  const loadFavorite = () => {
    if (locked || !isValidTeam(favoriteTeam, assignAvailableRoles(favoriteTeam))) return
    loadFavoriteTeam()
    setActiveId(favoriteTeam[0])
    onNotify('Se cargó tu equipo favorito.')
  }

  const roleMembers = (role: Role) => selectedViews.filter(person =>
    person.roles.includes(role) &&
    (!Object.entries(roleAssignments).some(([assignedRole, id]) => id === person.id && assignedRole !== role) || roleAssignments[role] === person.id),
  )

  const visibleOptions = Object.values(optionsByCategory).flat().filter(option => option.field === editor)

  return <section className="page detail-page advanced-team-page">
    <button className="back-link" onClick={onBack}><ChevronDown size={16} className="team-back-icon" /> Volver al inicio</button>
    <header className="advanced-team-heading">
      <div><div className="eyebrow">JUNTOS SOMOS MEJORES</div><h1>Tu equipo quirúrgico</h1><p className="subtitle">Elige 4 profesionales, asigna los roles y preparen su próxima aventura.</p></div>
      <div className={`team-counter ${validTeam ? 'complete' : ''}`}><Users size={17} /><b>{selectedStaff.length}<span> / 4</span></b><small>SELECCIONADOS</small></div>
    </header>
    {locked && <div className="team-lock-banner"><ShieldCheck size={17} /> El equipo está bloqueado mientras la cirugía está en curso.</div>}
    <div className="advanced-team-grid">
      <aside className="team-roster-panel">
        <div className="team-panel-heading"><div><span className="team-kicker">FORMACIÓN</span><h2>Equipo seleccionado</h2></div><span className="team-count-pill">{selectedViews.length}/4</span></div>
        <div className="team-roster-list">
          {teamRoles.map((role, index) => {
            const assignedId = roleAssignments[role]
            const person = selectedViews.find(member => member.id === assignedId)
            return <div key={role} className={`team-roster-slot ${person ? 'slot-filled' : ''}`}>
              <span className="team-slot-number">0{index + 1}</span>
              {person ? <Avatar className="team-slot-avatar" color={person.uniform} hair={person.hair} skin={person.skin} accessory={person.accessory} gender={person.gender} customization={person.appearance} motion="idle" /> : <span className="team-slot-empty"><Users size={16} /></span>}
              <div className="team-slot-copy"><b>{person?.name ?? 'Rol por asignar'}</b><label><select aria-label={`Asignar ${roleLabels[role]}`} value={assignedId ?? ''} disabled={locked || roleMembers(role).length === 0} onChange={event => changeRole(role, event.target.value)}><option value="">Elegir · {roleLabels[role]}</option>{roleMembers(role).map(member => <option key={member.id} value={member.id}>{member.id === assignedId ? roleLabels[role] : member.name}</option>)}</select></label></div>
              {person && <button type="button" className="team-remove-button" disabled={locked} aria-label={`Retirar a ${person.name}`} onClick={() => togglePerson(person.id)}><X size={14} /></button>}
              {person && <button type="button" className="team-slot-select" aria-label={`Ver ficha de ${person.name}`} onClick={() => setActiveId(person.id)} />}
            </div>
          })}
        </div>
        <div className={`team-completion-note ${validTeam ? 'is-valid' : ''}`}>{validTeam ? <><Check size={15} /><span><b>¡Formación completa!</b><small>Un profesional para cada rol.</small></span></> : <><Activity size={15} /><span><b>Falta completar roles</b><small>Elige profesionales para cubrir los 4 puestos.</small></span></>}</div>
        <div className="team-performance-block">
          <div className="team-metric-head"><span>Rendimiento del equipo</span><b>{factors.performance}%</b></div><div className="team-meter"><i style={{ width: `${factors.performance}%` }} /></div>
          <div className="team-metric-head"><span>Compatibilidad</span><b>{factors.compatibility}%</b></div><div className="team-meter compatibility-meter"><i style={{ width: `${factors.compatibility}%` }} /></div>
          <div className="team-factor-chips"><span>Trabajo {factors.teamwork}</span><span>Experiencia {factors.experience}</span><span>Energía {factors.energy}</span><span>Personalidad {factors.personality}</span><span>Afinidad {factors.affinity}</span></div>
        </div>
        <div className="team-favorite-actions"><button type="button" disabled={!validTeam || locked} onClick={saveFavorite}><Save size={14} /> Guardar favorito</button><button type="button" disabled={favoriteTeam.length !== 4 || locked} onClick={loadFavorite}><Star size={14} /> Cargar favorito</button></div>
        {saved.team && validTeam && <p className="team-saved-caption"><Check size={12} /> Equipo guardado en este dispositivo</p>}
      </aside>

      <section className="team-catalog-panel">
        <div className="team-panel-heading"><div><span className="team-kicker">CATÁLOGO</span><h2>Profesionales</h2></div><span className="team-count-pill">10 disponibles</span></div>
        <div className="team-catalog-controls">
          <label>Rol<select value={filter} onChange={event => setFilter(event.target.value as TeamFilter)}><option value="all">Todos</option>{teamRoles.map(role => <option key={role} value={role}>{roleLabels[role]}</option>)}</select></label>
          <label>Ordenar<select value={sort} onChange={event => setSort(event.target.value as 'performance' | 'experience')}><option value="performance">Rendimiento</option><option value="experience">Experiencia</option></select></label>
        </div>
        <div className="team-professional-grid">
          {catalog.map(person => {
            const selected = selectedStaff.includes(person.id)
            const primary = Math.round((person.stats.precision + person.stats.speed + person.stats.calm + person.stats.teamwork) / 4)
            return <button type="button" key={person.id} className={`team-professional-card ${selected ? 'is-selected' : ''} ${activeId === person.id ? 'is-focused' : ''} ${departedId === person.id ? 'is-departing' : ''}`} disabled={locked} onClick={() => { setActiveId(person.id); showGreeting(); if (!selected) togglePerson(person.id) }}>
              <span className="team-card-check">{selected ? <Check size={13} /> : <span>+</span>}</span>
              <Avatar className="team-card-avatar" color={person.uniform} hair={person.hair} skin={person.skin} accessory={person.accessory} gender={person.gender} customization={person.appearance} motion={activeId === person.id ? 'happy' : 'idle'} />
              <b className="team-card-name">{person.name}</b><span className="team-card-specialty">{person.specialty}</span>
              <span className="team-card-meta"><i>Nv. {person.level}</i><i>★ {primary}</i></span>
            </button>
          })}
        </div>
      </section>

      <aside className={`team-profile-panel ${levelUp ? 'is-leveling-up' : ''}`}>
        <div className="team-profile-topline"><span className="team-kicker">FICHA PROFESIONAL</span><span className="team-level-badge"><Sparkles size={13} /> NIVEL {activeView.level}</span></div>
        <div className={`team-character-stage ${greeting ? 'is-greeting' : ''}`}><div className="team-character-glow" /><CharacterRenderer appearance={activeView.appearance} gender={activeView.gender} variant="full" animation={greeting ? 'happy' : 'idle'} /><span className="team-character-caption">{activeView.specialty}</span></div>
        <label className="team-name-field">Nombre profesional<input aria-label="Nombre del profesional" maxLength={24} value={activeView.name} disabled={locked} onChange={event => saveProfile({ name: event.target.value })} /></label>
        <div className="team-profile-identity"><span>{activeRole ? roleLabels[activeRole] : activeView.roles.map(role => roleLabels[role]).join(' · ')}</span><small>{activeView.specialty} · {activeView.personality === 'calm' ? 'serena' : activeView.personality === 'methodical' ? 'metódica' : activeView.personality === 'empathetic' ? 'empática' : 'enérgica'}</small></div>
        <div className="team-xp-row"><span>Experiencia profesional</span><b>{activeView.experiencePoints} XP</b></div><div className="team-xp-track"><i style={{ width: `${activeView.experiencePoints % 100}%` }} /></div>
        <div className="team-stat-list">
          {statLabels.map(([key, label]) => <div className="team-stat-row" key={key}><span>{label}</span><b>{statValue(activeView, key)}</b><i><em style={{ width: `${statValue(activeView, key)}%` }} /></i></div>)}
          <div className="team-stat-row"><span>Energía</span><b>{activeView.energy}</b><i><em className="energy-meter-fill" style={{ width: `${activeView.energy}%` }} /></i></div>
        </div>
        <button type="button" className="team-rest-button" disabled={locked || activeView.energy >= 100} onClick={recoverEnergy}><Heart size={14} /> Recuperar energía <small>+25</small></button>
        {activeView.level >= 2 && <div className="team-unlock-note"><Sparkles size={13} /> Nivel 2: mascarillas y vinchas desbloqueadas</div>}
        {activeView.level >= 3 && <div className="team-unlock-note"><Star size={13} /> Nivel 3: gafas especiales desbloqueadas</div>}
        <div className="team-customization">
          <div className="team-customization-heading"><span>PERSONALIZAR</span><small>Se guarda en este dispositivo</small></div>
          <div className="team-editor-tabs" role="tablist" aria-label="Personalización del profesional">
            {([
              ['uniform', 'Uniforme'], ['uniformStyle', 'Corte'], ['hatStyle', 'Gorro'], ['hatColor', 'Color gorro'], ['glassesStyle', 'Gafas'], ['glassesColor', 'Color gafas'], ['mask', 'Mascarilla'], ['stethoscope', 'Accesorios'], ['shoeColor', 'Zapatos'],
            ] as const).map(([field, label]) => <button type="button" key={field} role="tab" aria-selected={editor === field} className={editor === field ? 'is-active' : ''} onClick={() => setEditor(field)}>{label}</button>)}
          </div>
          <div className="team-style-options">
            {visibleOptions.map(option => {
              const requiredLevel = staffAccessoryUnlockLevel(option.field, option.value)
              const lockedOption = requiredLevel !== null && activeView.level < requiredLevel && activeView.appearance[option.field] !== option.value
              return <OptionButton key={option.id} option={option} active={activeView.appearance[option.field] === option.value} locked={lockedOption} disabled={locked} onClick={() => selectOption(option)} />
            })}
          </div>
        </div>
      </aside>
    </div>
  </section>
}
