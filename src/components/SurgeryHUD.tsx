import { useEffect, useState } from 'react'
import { Activity, ArrowRight, Check, CirclePause, Heart, ShieldAlert, Sparkles, Users } from 'lucide-react'
import { SURGERY_PHASES } from '../game/SurgeryEngine'
import type { ComplicationType, SurgeryState } from '../types'

const checklistItems = [
  { id: 'name', label: 'Nombre del paciente' },
  { id: 'team', label: 'Equipo presente' },
  { id: 'signal', label: 'Señal del monitor' },
]
const coordinationPattern = ['Anestesia', 'Instrumentación', 'Asistencia']
const complicationCopy: Record<ComplicationType, { title: string; detail: string }> = {
  monitor: { title: 'El monitor pide atención', detail: 'Una alerta de fantasía interrumpió la misión.' },
  instruments: { title: 'La mesa se desordenó', detail: 'El equipo necesita coordinarse antes de continuar.' },
  team: { title: 'El equipo perdió el ritmo', detail: 'Tómate un momento para reagrupar a todos.' },
  bleeding: { title: 'Alerta visual de fantasía', detail: 'Un efecto visual abstracto pide atención del equipo.' },
}

interface SurgeryHUDProps {
  surgery: SurgeryState
  onAction: (quality: 'good' | 'miss') => void
  onResolve: (response: 'coordinate' | 'pause', roll: number) => void
  onContinue: () => void
}

function ChecklistChallenge({ phaseActions, onAction }: { phaseActions: number; onAction: (quality: 'good' | 'miss') => void }) {
  const [selected, setSelected] = useState<string[]>([])
  const expected = phaseActions === 0 ? ['name', 'team'] : ['team', 'signal']
  return <div className="challenge-panel"><p>Selecciona los dos elementos que el equipo debe confirmar.</p><div className="challenge-options">{checklistItems.map(item => <button key={item.id} className={selected.includes(item.id) ? 'challenge-option picked' : 'challenge-option'} onClick={() => setSelected(current => current.includes(item.id) ? current.filter(id => id !== item.id) : [...current, item.id])}>{selected.includes(item.id) ? <Check size={15} /> : <span className="option-empty" />}{item.label}</button>)}</div><button className="primary-btn challenge-submit" disabled={selected.length !== 2} onClick={() => onAction(expected.every(id => selected.includes(id)) ? 'good' : 'miss')}>Confirmar selección <ArrowRight size={14} /></button></div>
}

function CoordinationChallenge({ onAction }: { onAction: (quality: 'good' | 'miss') => void }) {
  const [step, setStep] = useState(0)
  const [error, setError] = useState(false)
  return <div className="challenge-panel"><p>Coordina la secuencia indicada por tu equipo.</p><div className="sequence-dots">{coordinationPattern.map((role, index) => <span className={index < step ? 'sequence-done' : index === step ? 'sequence-current' : ''} key={role}>{role}</span>)}</div><div className="challenge-options role-buttons">{coordinationPattern.map(role => <button key={role} className="challenge-option" onClick={() => { if (role !== coordinationPattern[step]) { setError(true); onAction('miss'); return } if (step === coordinationPattern.length - 1) { onAction('good'); return } setStep(value => value + 1) }}>{role}</button>)}</div>{error && <span className="challenge-feedback">El equipo perdió el ritmo.</span>}</div>
}

function PrecisionChallenge({ onAction }: { onAction: (quality: 'good' | 'miss') => void }) {
  const [position, setPosition] = useState(0)
  const [direction, setDirection] = useState(1)
  useEffect(() => {
    const timer = window.setInterval(() => setPosition(value => {
      const next = value + direction * 3
      if (next >= 100 || next <= 0) setDirection(current => -current)
      return Math.max(0, Math.min(100, next))
    }), 40)
    return () => window.clearInterval(timer)
  }, [direction])
  return <div className="challenge-panel"><p>Detén el indicador cuando pase por la zona brillante.</p><div className="precision-track"><i /><span style={{ left: `${position}%` }} /></div><div className="precision-labels"><span>ESPERA</span><b>ZONA DE PRECISIÓN</b><span>ESPERA</span></div><button className="primary-btn challenge-submit" onClick={() => onAction(position >= 43 && position <= 62 ? 'good' : 'miss')}>Detener indicador <Sparkles size={14} /></button></div>
}

function FinalCheckChallenge({ phaseActions, onAction }: { phaseActions: number; onAction: (quality: 'good' | 'miss') => void }) {
  const [confirmed, setConfirmed] = useState<string[]>([])
  const items = [{ id: 'team', label: 'Equipo coordinado' }, { id: 'patient', label: 'Paciente acompañado' }, { id: 'room', label: 'Sala en calma' }]
  const expected = phaseActions === 0 ? ['team', 'patient'] : ['patient', 'room']
  return <div className="challenge-panel"><p>Haz las dos comprobaciones finales de la misión.</p><div className="challenge-options">{items.map(item => <button key={item.id} className={confirmed.includes(item.id) ? 'challenge-option picked' : 'challenge-option'} onClick={() => setConfirmed(current => current.includes(item.id) ? current.filter(id => id !== item.id) : [...current, item.id])}>{confirmed.includes(item.id) ? <Check size={15} /> : <span className="option-empty" />}{item.label}</button>)}</div><button className="primary-btn challenge-submit" disabled={confirmed.length !== 2} onClick={() => onAction(expected.every(id => confirmed.includes(id)) ? 'good' : 'miss')}>Comprobar <ArrowRight size={14} /></button></div>
}

function ComplicationChallenge({ type, onResolve }: { type: ComplicationType; onResolve: (response: 'coordinate' | 'pause', roll: number) => void }) {
  const [position, setPosition] = useState(0)
  const [direction, setDirection] = useState(1)
  useEffect(() => {
    const timer = window.setInterval(() => setPosition(value => {
      const next = value + direction * 4
      if (next >= 100 || next <= 0) setDirection(current => -current)
      return Math.max(0, Math.min(100, next))
    }), 40)
    return () => window.clearInterval(timer)
  }, [direction])
  const respond = (response: 'coordinate' | 'pause') => {
    const centered = position >= 38 && position <= 65
    onResolve(response, centered ? 0.3 : 0.98)
  }
  const copy = complicationCopy[type]
  return <div className="complication-overlay"><div className="complication-card"><div className="complication-icon"><ShieldAlert size={25} /></div><span className="eyebrow">EVENTO DE FANTASÍA</span><h2>{copy.title}</h2><p>{copy.detail} Responde cuando el indicador esté en la zona segura.</p><div className="reaction-track"><i /><span style={{ left: `${position}%` }} /></div><div className="reaction-labels"><span>MUY PRONTO</span><b>ZONA SEGURA</b><span>MUY TARDE</span></div><div className="complication-actions"><button className="primary-btn" onClick={() => respond('coordinate')}><Users size={15} /> Coordinar equipo</button><button className="secondary-btn" onClick={() => respond('pause')}><CirclePause size={15} /> Pausar y revisar</button></div><small>La resolución es un minijuego abstracto, sin instrucciones médicas.</small></div></div>
}

export function SurgeryHUD({ surgery, onAction, onResolve, onContinue }: SurgeryHUDProps) {
  if (surgery.status === 'COMPLICATION' && surgery.activeComplication) return <ComplicationChallenge type={surgery.activeComplication} onResolve={onResolve} />
  if (surgery.status === 'STABILIZED') return <div className="stabilized-banner"><Heart size={17} /> Estabilidad recuperada. El equipo está listo cuando tú lo estés.<button className="primary-btn" onClick={onContinue}>Continuar misión <ArrowRight size={14} /></button></div>
  if (surgery.status !== 'IN_PROGRESS') return null
  const phase = surgery.phase
  return <div className="surgery-hud"><div className="surgery-phase-heading"><div><span className="eyebrow">FASE {phase + 1} DE 4</span><h2>{SURGERY_PHASES[phase]}</h2></div><span className="phase-counter">{surgery.phaseActions}/2 acciones</span></div>
    <div className="phase-track">{SURGERY_PHASES.map((label, index) => <div className={index < phase ? 'phase-step finished' : index === phase ? 'phase-step current' : 'phase-step'} key={label}><i>{index < phase ? <Check size={12} /> : index + 1}</i><span>{label}</span></div>)}</div>
    {phase === 0 && <ChecklistChallenge key={`check-${phase}-${surgery.phaseActions}`} phaseActions={surgery.phaseActions} onAction={onAction} />}
    {phase === 1 && <CoordinationChallenge key={`team-${surgery.phaseActions}`} onAction={onAction} />}
    {phase === 2 && <PrecisionChallenge key={`precision-${surgery.phaseActions}`} onAction={onAction} />}
    {phase === 3 && <FinalCheckChallenge key={`final-${surgery.phaseActions}`} phaseActions={surgery.phaseActions} onAction={onAction} />}
    <div className="surgery-stats"><span><Activity size={14} /> Estabilidad <b>{surgery.stability}%</b></span><span><Sparkles size={14} /> Puntuación <b>{surgery.score}</b></span><span><Users size={14} /> Equipo <b>{surgery.teamPerformance}%</b></span></div>
  </div>
}

export function SurgeryAlert({ status }: { status: SurgeryState['status'] }) {
  if (status !== 'FAILURE') return null
  return <div className="flatline-alert"><Activity size={15} /> Estabilidad agotada. El monitor ha entrado en línea plana.</div>
}
