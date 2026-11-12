import { describe, expect, it } from 'vitest'
import {
  applySurgeryAction,
  canStartSurgery,
  createInitialSurgeryState,
  createSurgeryResult,
  resolveComplication,
  resumeSurgery,
  startSurgery,
} from './SurgeryEngine'
import { preparationTasks } from '../data/preparationTasks'
import { createGameStore } from '../store/gameStore'
import type { StateStorage } from 'zustand/middleware'

function finishSuccessfully() {
  let state = startSurgery(createInitialSurgeryState('luna', 'normal', 'soft', 'success-test'))
  for (let action = 0; action < 8; action += 1) state = applySurgeryAction(state, 'good', 1)
  return state
}

function memoryStorage() {
  const values = new Map<string, string>()
  return {
    values,
    storage: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    } satisfies StateStorage,
  }
}

describe('reglas de cirugía ficticia', () => {
  it('solo inicia después del consentimiento y todas las tareas preoperatorias', () => {
    const allTasks = preparationTasks.map(task => task.id)
    expect(canStartSurgery(false, allTasks, preparationTasks)).toBe(false)
    expect(canStartSurgery(true, allTasks.slice(1), preparationTasks)).toBe(false)
    expect(canStartSurgery(true, allTasks, preparationTasks)).toBe(true)
  })

  it('transiciona de READY a IN_PROGRESS y avanza cuatro fases mediante acciones', () => {
    let state = createInitialSurgeryState('luna')
    expect(state.status).toBe('READY')
    state = startSurgery(state)
    expect(state.status).toBe('IN_PROGRESS')
    state = applySurgeryAction(state, 'good', 1)
    expect(state.phase).toBe(0)
    state = applySurgeryAction(state, 'good', 1)
    expect(state.phase).toBe(1)
    expect(state.status).toBe('IN_PROGRESS')
  })

  it('ajusta estabilidad por dificultad y activa complicaciones por error', () => {
    const state = startSurgery(createInitialSurgeryState('luna', 'hard'))
    const next = applySurgeryAction(state, 'miss', 1)
    expect(next.stability).toBe(77)
    expect(next.errors).toBe(1)
    expect(next.status).toBe('COMPLICATION')
    expect(next.activeComplication).toBe('bleeding')
  })

  it('el rendimiento del equipo modifica estabilidad y riesgo de eventos', () => {
    const base = startSurgery(createInitialSurgeryState('luna', 'normal'))
    const lowPerformance = { ...base, stability: 50, teamPerformance: 0 }
    const highPerformance = { ...base, stability: 50, teamPerformance: 100 }
    expect(applySurgeryAction(lowPerformance, 'good', 0.08).status).toBe('COMPLICATION')
    expect(applySurgeryAction(highPerformance, 'good', 0.08).status).toBe('IN_PROGRESS')
    expect(applySurgeryAction(lowPerformance, 'good', 0.9).stability).toBe(51)
    expect(applySurgeryAction(highPerformance, 'good', 0.9).stability).toBe(52)
  })

  it('activa eventos aleatorios con umbral reproducible y permite estabilizar', () => {
    const state = startSurgery(createInitialSurgeryState('luna', 'normal'))
    const event = applySurgeryAction(state, 'good', 0.02)
    expect(event.status).toBe('COMPLICATION')
    expect(event.activeComplication).toBe('monitor')
    const stabilized = resolveComplication(event, 'coordinate', 0.5)
    expect(stabilized.status).toBe('STABILIZED')
    expect(stabilized.stability).toBe(100)
    expect(resumeSurgery(stabilized).status).toBe('IN_PROGRESS')
  })

  it('completa una partida con éxito solo tras las acciones de las cuatro fases', () => {
    const state = finishSuccessfully()
    expect(state.status).toBe('SUCCESS')
    expect(state.phase).toBe(3)
    expect(state.score).toBe(96)
    expect(createSurgeryResult(state, 'result-1', '2026-11-11T00:00:00.000Z')?.outcome).toBe('SUCCESS')
  })

  it('falla al agotar estabilidad y registra un resultado fallido', () => {
    let state = startSurgery(createInitialSurgeryState('luna', 'hard'))
    for (let attempt = 0; attempt < 4 && state.status !== 'FAILURE'; attempt += 1) {
      state = applySurgeryAction(state, 'miss', 1)
      if (state.status === 'COMPLICATION') state = resolveComplication(state, 'coordinate', 0.99)
    }
    expect(state.status).toBe('FAILURE')
    expect(state.stability).toBe(0)
    expect(createSurgeryResult(state, 'result-fail', '2026-11-11T00:00:00.000Z')?.outcome).toBe('FAILURE')
  })

  it('reinicia cirugía fallida conservando paciente y preferencias', () => {
    const { storage } = memoryStorage()
    const store = createGameStore(storage)
    store.setState(state => ({
      ...state,
      selectedPatient: 'tomas',
      surgery: { ...state.surgery, status: 'FAILURE', stability: 0, score: 15, errors: 4, difficulty: 'hard', bleedingIntensity: 'off', runId: 'old-run' },
    }))
    store.getState().restartSurgery()
    expect(store.getState().surgery).toMatchObject({ status: 'READY', phase: 0, stability: 100, score: 0, errors: 0, difficulty: 'hard', bleedingIntensity: 'off', patientId: 'tomas' })
    expect(store.getState().surgery.runId).not.toBe('old-run')
  })

  it('guarda resultados serializables e impide sumar dos veces el mismo ID', () => {
    const { storage, values } = memoryStorage()
    const store = createGameStore(storage)
    const result = createSurgeryResult(finishSuccessfully(), 'persistent-result', '2026-11-11T00:00:00.000Z')
    if (!result) throw new Error('El resultado de éxito debería existir.')
    store.getState().recordSurgeryResult(result)
    store.getState().recordSurgeryResult(result)
    const persisted = JSON.parse(values.get('mini-hospital-save') ?? '{}').state as {
      surgeryHistory: Array<{ id: string }>
      experience: number
      rewards: number
      staffProfiles: Record<string, { experiencePoints: number; energy: number }>
    }
    expect(persisted.surgeryHistory).toHaveLength(1)
    expect(persisted.surgeryHistory[0].id).toBe('persistent-result')
    expect(persisted.experience).toBe(result.experience)
    expect(persisted.rewards).toBe(result.reward)
    expect(persisted.staffProfiles.sofia.experiencePoints).toBe(result.experience)
    expect(persisted.staffProfiles.sofia.energy).toBe(88)
  })

  it('bloquea cambios de equipo mientras una cirugía está activa', () => {
    const { storage } = memoryStorage()
    const store = createGameStore(storage)
    store.setState(state => ({ ...state, surgery: { ...state.surgery, status: 'IN_PROGRESS' } }))
    store.getState().setSelectedStaff(['emma'])
    store.getState().setRoleAssignments({})
    expect(store.getState().selectedStaff).toEqual(['sofia', 'mateo', 'valentina', 'lucas'])
    expect(store.getState().roleAssignments).toMatchObject({ anesthesia: 'sofia', instrument: 'mateo' })
  })
})
