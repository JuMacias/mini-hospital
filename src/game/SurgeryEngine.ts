import type {
  PreparationTask,
  ComplicationType,
  SurgeryDifficulty,
  SurgeryPhase,
  SurgeryResult,
  SurgeryState,
} from '../types'

export const SURGERY_PHASES = [
  'Verificación inicial',
  'Preparación del procedimiento',
  'Minijuego de precisión',
  'Comprobación final',
] as const

export function canStartSurgery(consent: boolean, completedTasks: string[], requiredTasks: PreparationTask[]): boolean {
  return consent && requiredTasks.length > 0 && requiredTasks.every(task => completedTasks.includes(task.id))
}

const difficultyRisk: Record<SurgeryDifficulty, number> = { easy: 0.04, normal: 0.1, hard: 0.18 }
const difficultyDamage: Record<SurgeryDifficulty, number> = { easy: 9, normal: 15, hard: 23 }
const complications: ComplicationType[] = ['monitor', 'instruments', 'team', 'bleeding']

export function getSurgeryErrorPenalty(difficulty: SurgeryDifficulty): number {
  return difficultyDamage[difficulty]
}

export function createInitialSurgeryState(
  patientId: string | null,
  difficulty: SurgeryDifficulty = 'normal',
  bleedingIntensity: SurgeryState['bleedingIntensity'] = 'soft',
  runId = 'new-run',
): SurgeryState {
  return {
    runId,
    status: 'READY',
    phase: 0,
    phaseActions: 0,
    stability: 100,
    errors: 0,
    complications: [],
    activeComplication: null,
    score: 0,
    teamPerformance: 75,
    difficulty,
    bleedingIntensity,
    patientId,
  }
}

export function startSurgery(state: SurgeryState): SurgeryState {
  if (state.status !== 'READY') return state
  return { ...state, status: 'IN_PROGRESS' }
}

export function resumeSurgery(state: SurgeryState): SurgeryState {
  return state.status === 'STABILIZED' ? { ...state, status: 'IN_PROGRESS' } : state
}

export function applySurgeryAction(
  state: SurgeryState,
  quality: 'good' | 'miss',
  randomRoll = 1,
): SurgeryState {
  if (!['IN_PROGRESS', 'STABILIZED'].includes(state.status)) return state

  const goodAction = quality === 'good'
  const errors = state.errors + (goodAction ? 0 : 1)
  const teamStabilityBonus = state.teamPerformance >= 85 ? 2 : 1
  const stability = Math.max(0, Math.min(100, state.stability + (goodAction ? teamStabilityBonus : -difficultyDamage[state.difficulty])))
  const score = Math.max(0, state.score + (goodAction ? 12 : -5))
  const teamPerformance = Math.max(0, Math.min(100, state.teamPerformance + (goodAction ? 3 : -8)))
  const partial: SurgeryState = { ...state, errors, stability, score, teamPerformance, status: 'IN_PROGRESS' }

  if (stability === 0) return { ...partial, status: 'FAILURE', activeComplication: null }

  const teamRiskFactor = 1.25 - state.teamPerformance / 200
  const triggered = !goodAction || randomRoll < difficultyRisk[state.difficulty] * teamRiskFactor
  if (triggered) {
    const type = complications[Math.min(complications.length - 1, Math.floor(Math.max(0, randomRoll) * complications.length))]
    return {
      ...partial,
      status: 'COMPLICATION',
      activeComplication: type,
      complications: [...state.complications, { id: `event-${state.complications.length + 1}`, type, resolved: false }],
    }
  }

  const phaseActions = state.phaseActions + 1
  if (phaseActions < 2) return { ...partial, phaseActions }
  if (state.phase === 3) return { ...partial, status: 'SUCCESS', phaseActions: 2 }
  return { ...partial, phase: (state.phase + 1) as SurgeryPhase, phaseActions: 0 }
}

export function resolveComplication(
  state: SurgeryState,
  response: 'coordinate' | 'pause',
  randomRoll = 0,
): SurgeryState {
  if (state.status !== 'COMPLICATION' || !state.activeComplication) return state
  const resolvedWell = response === 'coordinate' ? randomRoll <= 0.72 : randomRoll <= 0.92
  const stability = Math.max(0, Math.min(100, state.stability + (resolvedWell ? (response === 'coordinate' ? 12 : 7) : -22)))
  const errors = state.errors + (resolvedWell ? 0 : 1)
  const score = Math.max(0, state.score + (resolvedWell ? 8 : -8))
  const teamPerformance = Math.max(0, Math.min(100, state.teamPerformance + (resolvedWell ? 5 : -10)))
  const updatedComplications = state.complications.map((item, index) => (
    index === state.complications.length - 1
      ? { ...item, resolved: true, resolution: resolvedWell ? 'good' as const : 'miss' as const }
      : item
  ))
  return {
    ...state,
    stability,
    errors,
    score,
    teamPerformance,
    complications: updatedComplications,
    activeComplication: null,
    status: stability === 0 ? 'FAILURE' : resolvedWell ? 'STABILIZED' : 'IN_PROGRESS',
  }
}

export function createSurgeryResult(state: SurgeryState, id: string, completedAt: string): SurgeryResult | null {
  if ((state.status !== 'SUCCESS' && state.status !== 'FAILURE') || !state.patientId) return null
  const success = state.status === 'SUCCESS'
  return {
    id,
    patientId: state.patientId,
    outcome: state.status,
    score: state.score,
    teamPerformance: state.teamPerformance,
    experience: success ? 30 + Math.round(state.score / 10) : 10,
    reward: success ? 20 + Math.round(state.score / 20) : 5,
    complications: state.complications.length,
    completedAt,
  }
}
