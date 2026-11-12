import { useEffect, useMemo, useRef, useState } from 'react'
import Phaser from 'phaser'
import { Activity, ArrowLeft, ArrowRight, Heart, Maximize2, Minimize2, ShieldAlert, Sparkles, Users } from 'lucide-react'
import { staff } from '../data/staff'
import { patients } from '../data/patients'
import { preparationTasks } from '../data/preparationTasks'
import { canStartSurgery, createSurgeryResult } from '../game/SurgeryEngine'
import { SurgeryScene } from '../game/SurgeryScene'
import { audioManager } from '../game/AudioManager'
import { patientSurgeryNarrative } from '../game/preopRules'
import { getTeamMemberView, isValidTeam } from '../game/teamRules'
import { useGameStore } from '../store/gameStore'
import { SurgeryAlert, SurgeryHUD } from './SurgeryHUD'
import { SurgeryResults } from './SurgeryResults'
import type { Doctor, SurgeryDifficulty, BleedingIntensity } from '../types'
import './SurgeryPage.css'
import './SurgeryPageResponsive.css'
import './SurgeryNarrative.css'

const defaultDoctor: Doctor = { name: 'Dra. Alex', gender: 'doctora', skin: '#bd8065', hair: '#47302c', eyes: '#536d69', uniform: '#63c9bd', accessory: 'gorra' }
const difficultyLabels: Record<SurgeryDifficulty, string> = { easy: 'Fácil', normal: 'Normal', hard: 'Difícil' }
const bleedingLabels: Record<BleedingIntensity, string> = { off: 'Desactivado', soft: 'Suave', moderate: 'Moderado' }

export function SurgeryPage({ onHome, onAnotherPatient }: { onHome: () => void; onAnotherPatient: () => void }) {
  const pageHost = useRef<HTMLElement>(null)
  const sceneHost = useRef<HTMLDivElement>(null)
  const gameRef = useRef<Phaser.Game | null>(null)
  const resultRecorded = useRef<string | null>(null)
  const [sceneStatus, setSceneStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [sceneError, setSceneError] = useState('')
  const [sceneRetry, setSceneRetry] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isLandscapeMobile, setIsLandscapeMobile] = useState(false)
  const [fullscreenError, setFullscreenError] = useState('')
  const {
    doctor, selectedPatient, selectedStaff, roleAssignments, staffProfiles, consent, completedTasks, patientEmotion, trust,
    surgery, surgeryHistory, configureSurgery, beginSurgery, actInSurgery,
    resolveSurgeryEvent, continueSurgery, restartSurgery, recordSurgeryResult,
  } = useGameStore()
  const patient = patients.find(item => item.id === selectedPatient)
  const mainDoctor = doctor ?? defaultDoctor
  const team = useMemo(() => selectedStaff
    .map(id => staff.find(person => person.id === id))
    .filter((person): person is (typeof staff)[number] => !!person)
    .map(person => ({
      person: getTeamMemberView(person, staffProfiles),
      role: Object.entries(roleAssignments).find(([, id]) => id === person.id)?.[0] ?? 'team',
    })), [selectedStaff, roleAssignments, staffProfiles])
  const scenePeople = useMemo(() => patient ? ({ doctor: mainDoctor, patient, team }) : null, [mainDoctor, patient, team])
  const terminal = surgery.status === 'SUCCESS' || surgery.status === 'FAILURE'
  const teamReady = isValidTeam(selectedStaff, roleAssignments)
  const mayStart = canStartSurgery(consent, completedTasks, preparationTasks) && teamReady

  useEffect(() => {
    const landscapeQuery = window.matchMedia('(max-width: 760px) and (orientation: landscape)')
    const updateDisplayState = () => {
      setIsFullscreen(document.fullscreenElement === pageHost.current)
      setIsLandscapeMobile(landscapeQuery.matches)
    }
    updateDisplayState()
    document.addEventListener('fullscreenchange', updateDisplayState)
    landscapeQuery.addEventListener('change', updateDisplayState)
    return () => {
      document.removeEventListener('fullscreenchange', updateDisplayState)
      landscapeQuery.removeEventListener('change', updateDisplayState)
    }
  }, [])

  const toggleFullscreen = async () => {
    setFullscreenError('')
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
        return
      }
      if (!pageHost.current?.requestFullscreen) {
        setFullscreenError('Este navegador no permite pantalla completa. Puedes jugar en horizontal igualmente.')
        return
      }
      await pageHost.current.requestFullscreen()
    } catch {
      setFullscreenError('No se pudo activar pantalla completa. Toca el botón de nuevo o usa el navegador en horizontal.')
    }
  }

  useEffect(() => {
    if (!sceneHost.current || !scenePeople) return
    let cancelled = false
    let sceneReady = false
    let game: Phaser.Game | null = null
    const loadingTimeout = window.setTimeout(() => {
      if (cancelled || sceneReady) return
      setSceneStatus('error')
      setSceneError('El escenario tardó demasiado en responder. Puedes volver a intentarlo.')
    }, 12000)
    try {
      const scene = new SurgeryScene(scenePeople, () => {
        sceneReady = true
        window.clearTimeout(loadingTimeout)
        if (cancelled) return
        setSceneStatus('ready')
        gameRef.current?.events.emit('surgery:state', { status: useGameStore.getState().surgery.status, phase: useGameStore.getState().surgery.phase })
      }, message => {
        window.clearTimeout(loadingTimeout)
        if (cancelled) return
        setSceneStatus('error')
        setSceneError(message)
      })
      game = new Phaser.Game({
        type: Phaser.CANVAS,
        width: 1000,
        height: 560,
        parent: sceneHost.current,
        backgroundColor: '#f3a34d',
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
        render: { antialias: true, pixelArt: false, transparent: false },
        scene: [scene],
      })
      gameRef.current = game
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido al iniciar Phaser.'
      window.clearTimeout(loadingTimeout)
      queueMicrotask(() => {
        if (cancelled) return
        setSceneStatus('error')
        setSceneError(`No se pudo iniciar el escenario Phaser: ${message}`)
      })
    }
    return () => {
      cancelled = true
      window.clearTimeout(loadingTimeout)
      if (gameRef.current === game) gameRef.current = null
      game?.destroy(true)
    }
  }, [scenePeople, sceneRetry])

  useEffect(() => {
    gameRef.current?.events.emit('surgery:state', { status: surgery.status, phase: surgery.phase })
  }, [surgery.status, surgery.phase])

  useEffect(() => {
    if (surgery.status === 'COMPLICATION') audioManager.play('alarm')
    if (surgery.status === 'STABILIZED') audioManager.play('notification')
    if (surgery.status === 'SUCCESS') audioManager.play('success')
    if (surgery.status === 'FAILURE') audioManager.play('failure')
  }, [surgery.status, surgery.runId])

  useEffect(() => {
    if (!terminal || !patient || resultRecorded.current === `${surgery.runId}-${surgery.status}`) return
    const result = createSurgeryResult(surgery, `${surgery.runId}-${surgery.status}`, new Date().toISOString())
    if (!result) return
    resultRecorded.current = result.id
    recordSurgeryResult(result)
  }, [terminal, patient, surgery, recordSurgeryResult])

  const makeAction = (quality: 'good' | 'miss') => { audioManager.play('button'); actInSurgery(quality, Math.random()) }
  const resolveEvent = (response: 'coordinate' | 'pause', randomRoll?: number) => { audioManager.play('monitor'); resolveSurgeryEvent(response, randomRoll) }
  const retry = () => {
    resultRecorded.current = null
    restartSurgery()
    beginSurgery()
  }
  const retryScene = () => {
    setSceneStatus('loading')
    setSceneError('')
    setSceneRetry(attempt => attempt + 1)
  }

  return <section className="page detail-page surgery-page" ref={pageHost}>
    <button className="back-link" onClick={onHome}><ArrowLeft size={16} /> Volver al hospital</button>
    <div className="surgery-page-heading"><div><div className="eyebrow">AVENTURA FICTICIA · JUEGO ABSTRACTO</div><h1>Quirófano</h1><p className="subtitle">{patient ? `${patient.name} · ${patient.procedure}` : 'Paciente pendiente de seleccionar'}</p></div><div className="surgery-heading-stats"><span><Sparkles size={15} /> {surgery.score} puntos</span><span><Activity size={15} /> {surgery.errors} errores</span></div></div>
    <div className={`surgery-workspace ${terminal ? 'surgery-workspace-terminal' : ''}`}>
      <div className={`surgery-visual intensity-${surgery.bleedingIntensity} ${surgery.activeComplication === 'bleeding' ? 'show-fictional-bleed' : ''}`}>
        <div className="surgery-scene-host" ref={sceneHost} />
        <div className="surgery-display-controls">
          <button type="button" className="surgery-fullscreen-button" aria-label={isFullscreen ? 'Salir de pantalla completa' : 'Activar pantalla completa'} aria-pressed={isFullscreen} onClick={toggleFullscreen}>
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            {isFullscreen ? 'Salir' : isLandscapeMobile ? 'Pantalla completa' : 'Ampliar'}
          </button>
          {fullscreenError && <span role="alert">{fullscreenError}</span>}
        </div>
        {sceneStatus === 'loading' && <div className="scene-loading" role="status"><span className="scene-loading-spinner" /> Preparando el quirófano…</div>}
        {sceneStatus === 'error' && <div className="scene-load-error" role="alert"><b>No pudimos cargar el escenario</b><span>{sceneError}</span><button className="primary-btn" onClick={retryScene}>Reintentar carga</button></div>}
        {surgery.activeComplication === 'bleeding' && surgery.bleedingIntensity !== 'off' && <div className="abstract-visual-effect" aria-hidden="true"><i /><i /><i /></div>}
        <SurgeryAlert status={surgery.status} />
        <div className="portrait-orientation"><span>↻</span><b>Gira tu dispositivo</b><small>En horizontal, toca «Pantalla completa».</small></div>
      </div>
      <aside className="surgery-control-panel">
        {surgery.status === 'READY' && <div className="surgery-learning-intro"><span>APRENDE JUGANDO</span><h2>OPERAR</h2><ul><li>Preparación</li><li>Coordinación</li><li>Precisión</li><li>Cierre</li></ul><p>Una aventura de fantasía con minijuegos abstractos y cuidado en equipo.</p></div>}
        {patient && <div className={`patient-narrative-note patient-narrative-${patientEmotion}`} aria-live="polite"><Heart size={15} /><span><b>Cómo se siente {patient.name.split(' ')[0]}</b>{patientSurgeryNarrative(patientEmotion, trust)}</span></div>}
        {surgery.status === 'READY' && <div className="surgery-setup"><div className="setup-icon peach"><Heart /></div><div className="eyebrow">{teamReady ? 'EL EQUIPO ESTÁ LISTO' : 'FALTA COMPLETAR EL EQUIPO'}</div><h2>¿Comenzamos la aventura?</h2><p>Una simulación totalmente ficticia con minijuegos abstractos. No contiene técnicas médicas.</p><label className="field-label" htmlFor="surgery-difficulty">DIFICULTAD</label><select id="surgery-difficulty" className="text-input" value={surgery.difficulty} onChange={event => configureSurgery(event.target.value as SurgeryDifficulty, surgery.bleedingIntensity)}>{(Object.keys(difficultyLabels) as SurgeryDifficulty[]).map(key => <option value={key} key={key}>{difficultyLabels[key]}</option>)}</select><label className="field-label" htmlFor="blood-intensity">INTENSIDAD VISUAL DEL SANGRADO FICTICIO</label><select id="blood-intensity" className="text-input" value={surgery.bleedingIntensity} onChange={event => configureSurgery(surgery.difficulty, event.target.value as BleedingIntensity)}>{(Object.keys(bleedingLabels) as BleedingIntensity[]).map(key => <option value={key} key={key}>{bleedingLabels[key]}</option>)}</select><div className="surgery-checklist"><span><Users size={14} /> {team.length + 1} personajes preparados</span><span><ShieldAlert size={14} /> {completedTasks.length}/{preparationTasks.length} tareas preoperatorias</span></div><button className="primary-btn surgery-start" disabled={!patient || !mayStart} onClick={beginSurgery}>Comenzar cirugía ficticia <ArrowRight size={15} /></button>{!teamReady ? <small className="start-requirement">Completa un profesional en cada rol desde Equipo médico.</small> : !mayStart && <small className="start-requirement">Completa la conversación, el consentimiento y las seis tareas preoperatorias antes de entrar.</small>}</div>}
        {surgery.status === 'IN_PROGRESS' && <SurgeryHUD key={`hud-${surgery.phase}-${surgery.phaseActions}`} surgery={surgery} onAction={makeAction} onResolve={resolveEvent} onContinue={continueSurgery} />}
        {surgery.status === 'COMPLICATION' && <SurgeryHUD surgery={surgery} onAction={makeAction} onResolve={resolveEvent} onContinue={continueSurgery} />}
        {surgery.status === 'STABILIZED' && <SurgeryHUD surgery={surgery} onAction={makeAction} onResolve={resolveEvent} onContinue={continueSurgery} />}
        {terminal && <SurgeryResults outcome={surgery.status as 'SUCCESS' | 'FAILURE'} onRetry={retry} onAnotherPatient={onAnotherPatient} onHome={onHome} />}
      </aside>
    </div>
    <div className="surgery-safety"><ShieldAlert size={15} /> Todos los eventos y procedimientos son inventados para el juego. No son instrucciones ni consejos médicos.</div>
    <div className="difficulty-footnote">Dificultad actual: {difficultyLabels[surgery.difficulty]} · Efecto visual: {bleedingLabels[surgery.bleedingIntensity]} · Resultados guardados: {surgeryHistory.length}</div>
  </section>
}
