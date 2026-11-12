import { ArrowLeft, ArrowRight, Award, Coins, Heart, RotateCcw, Sparkles, Trophy, Users } from 'lucide-react'
import { staff } from '../data/staff'
import { patients } from '../data/patients'
import { getSurgeryErrorPenalty } from '../game/SurgeryEngine'
import { getTeamMemberView } from '../game/teamRules'
import { useGameStore } from '../store/gameStore'
import { Avatar } from './Avatar'
import './SurgeryResults.css'
import type { Doctor } from '../types'

interface SurgeryResultsProps {
  outcome: 'SUCCESS' | 'FAILURE'
  onRetry: () => void
  onAnotherPatient: () => void
  onHome: () => void
}

export function SurgeryResults({ outcome, onRetry, onAnotherPatient, onHome }: SurgeryResultsProps) {
  const { surgery, doctor, selectedPatient, selectedStaff, roleAssignments, staffProfiles, surgeryHistory, coins, experience } = useGameStore()
  const patient = patients.find(item => item.id === selectedPatient)
  const currentDoctor: Doctor = doctor ?? { name: 'Dra. Alex', gender: 'doctora', skin: '#bd8065', hair: '#47302c', eyes: '#536d69', uniform: '#63c9bd', accessory: 'gorra' }
  const chosen = selectedStaff.map(id => staff.find(item => item.id === id)).filter((item): item is (typeof staff)[number] => !!item).map(person => getTeamMemberView(person, staffProfiles))
  const currentResult = surgeryHistory.find(item => item.id === `${surgery.runId}-${outcome}`)
  const awardedExperience = currentResult?.experience ?? (outcome === 'SUCCESS' ? 30 + Math.round(surgery.score / 10) : 10)
  const awardedCoins = currentResult?.reward ?? (outcome === 'SUCCESS' ? 20 + Math.round(surgery.score / 20) : 5)
  const leveledUp = chosen.filter(person =>
    Math.floor(person.experiencePoints / 100) > Math.floor(Math.max(0, person.experiencePoints - awardedExperience) / 100),
  )
  const roles: Record<string, string> = { anesthesia: 'Anestesia', instrument: 'Instrumentación', circulating: 'Enfermería', assistant: 'Cirugía asistente' }
  const complicationLabels: Record<string, string> = {
    monitor: 'Monitor de fantasía',
    instruments: 'Instrumental desordenado',
    team: 'Equipo fuera de ritmo',
    bleeding: 'Alerta visual ficticia',
  }
  const recentResults = surgeryHistory.slice(0, 3)
  return <section className={`page detail-page surgery-results ${outcome === 'SUCCESS' ? 'result-success' : 'result-failure'}`}>
    <div className="result-confetti" aria-hidden="true">{outcome === 'SUCCESS' ? '✦　✿　♡　✧' : '♡　✧　♡'}</div>
    <div className="eyebrow">{outcome === 'SUCCESS' ? 'MISIÓN COMPLETADA' : 'MISIÓN DETENIDA · PUEDES INTENTAR DE NUEVO'}</div>
    <h1>{outcome === 'SUCCESS' ? `¡Lo lograron${patient ? `, ${patient.name.split(' ')[0]}` : ''}!` : 'La misión se detuvo'}</h1>
    <p className="subtitle">{outcome === 'SUCCESS' ? 'El equipo completó cada fase de esta aventura ficticia.' : 'La estabilidad del juego llegó a cero y el minijuego se detuvo. Esto no significa que hicieras mal la preparación.'}</p>
    {patient && <div className="result-patient"><Avatar color={patient.uniform} hair={patient.hair} skin={patient.skin} hairStyle={patient.hairStyle} accessory={patient.accessory} motion={outcome === 'SUCCESS' ? 'happy' : 'idle'} /><span><b>{patient.name} · {patient.age} años</b><small>{outcome === 'SUCCESS' ? 'Aventura completada' : 'Puedes volver a intentarlo'}</small></span></div>}
    {outcome === 'FAILURE' && <div className="result-explanation" role="status"><b>¿Por qué terminó?</b><p>El juego registró {surgery.errors} acciones con error y la estabilidad llegó a cero. En dificultad {surgery.difficulty === 'easy' ? 'fácil' : surgery.difficulty === 'normal' ? 'normal' : 'difícil'}, cada error resta {getSurgeryErrorPenalty(surgery.difficulty)} puntos; fallar la respuesta a una alerta resta 22 más. La preparación permite iniciar, pero no evita estas penalizaciones.</p></div>}
    {outcome === 'FAILURE' && <div className="result-flatline"><span>♡</span><i /><b>ESTABILIDAD AGOTADA · FICCIÓN</b></div>}
    {outcome === 'FAILURE' && <div className="team-reaction"><span>“Hicimos una pausa para acompañar al paciente.”</span><b>— {currentDoctor.name} y su equipo</b></div>}
    <div className="result-score-card"><div className="score-emblem">{outcome === 'SUCCESS' ? <Trophy size={25} /> : <Heart size={25} />}</div><div className="score-total"><small>PUNTUACIÓN FINAL</small><b>{surgery.score}</b></div><div className="score-metrics"><span><Users size={15} /> Rendimiento del equipo <b>{surgery.teamPerformance}%</b></span><span><Sparkles size={15} /> Estabilidad final <b>{surgery.stability}%</b></span><span><Award size={15} /> Errores <b>{surgery.errors}</b></span><span><Heart size={15} /> Eventos de fantasía <b>{surgery.complications.length}</b></span></div><div className="rewards-row"><span><Sparkles size={16} /> +{awardedExperience} EXP</span><span><Coins size={16} /> +{awardedCoins} monedas</span></div><div className="result-totals"><span>Saldo actual <b>{coins} monedas</b></span><span>Experiencia total <b>{experience} EXP</b></span></div></div>
    {surgery.complications.length > 0 && <div className="result-events"><b>Eventos de esta aventura</b><ul>{surgery.complications.map(event => <li key={event.id}><span>{complicationLabels[event.type] ?? 'Evento de fantasía'}</span><small>{!event.resolved ? 'La aventura se detuvo durante este evento' : event.resolution === 'good' ? 'Resuelto sin penalización' : event.resolution === 'miss' ? 'Resuelto con penalización de estabilidad' : 'Evento finalizado'}</small></li>)}</ul></div>}
    {leveledUp.length > 0 && <div className="result-level-up"><Sparkles size={17} /><span><b>¡Subida de nivel!</b><small>{leveledUp.map(person => `${person.name} · nivel ${person.level}`).join('  ·  ')}</small></span></div>}
    <div className="result-team"><div className="result-team-title"><b>Equipo de la aventura</b><span>{chosen.length + 1} profesionales</span></div><div className="result-team-list"><div className="result-person"><Avatar color={currentDoctor.uniform} hair={currentDoctor.hair} skin={currentDoctor.skin} eyes={currentDoctor.eyes} accessory={currentDoctor.accessory} gender={currentDoctor.gender} customization={currentDoctor} motion={outcome === 'SUCCESS' ? 'happy' : 'sad'} /><span><b>{currentDoctor.name}</b><small>{currentDoctor.gender === 'doctor' ? 'Doctor principal' : 'Doctora principal'}</small></span><i>{surgery.teamPerformance}%</i></div>{chosen.map(person => <div className="result-person" key={person.id}><Avatar color={person.uniform} hair={person.hair} skin={person.skin} gender={person.gender} accessory={person.accessory} customization={person.appearance} motion={outcome === 'SUCCESS' ? 'happy' : 'sad'} /><span><b>{person.name}</b><small>{roles[Object.entries(roleAssignments).find(([, id]) => id === person.id)?.[0] ?? ''] ?? 'Equipo médico'}</small></span><i>{surgery.teamPerformance}%</i></div>)}</div></div>
    <div className="result-history"><b>Historial reciente · {surgeryHistory.length} {surgeryHistory.length === 1 ? 'resultado' : 'resultados'}</b>{recentResults.length ? <ul>{recentResults.map(result => <li key={result.id}><span>{patients.find(item => item.id === result.patientId)?.name ?? 'Paciente'} · {result.outcome === 'SUCCESS' ? 'Éxito' : 'Fallo'}</span><small>{result.score} puntos · +{result.reward} monedas · {result.complications} {result.complications === 1 ? 'evento' : 'eventos'}</small></li>)}</ul> : <small>El resultado se guardará en este dispositivo.</small>}</div>
    <div className="result-actions"><button className="primary-btn" onClick={onRetry}><RotateCcw size={15} /> Volver a operar</button><button className="secondary-btn" onClick={onAnotherPatient}>Continuar con otro paciente <ArrowRight size={15} /></button><button className="result-home" onClick={onHome}><ArrowLeft size={14} /> Inicio</button></div>
  </section>
}
