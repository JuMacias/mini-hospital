import { describe, expect, it } from 'vitest'
import { createInitialHospitalState } from './hospitalRules'
import {
  canPlaceHospitalFurniture,
  createInitialCareQueue,
  getHospitalMissionProgress,
  transitionPatientCase,
  upsertHospitalFurniture,
} from './hospitalOperations'

describe('flujo vivo del hospital', () => {
  it('mantiene transiciones de atención válidas y bloquea un alta tras un fallo', () => {
    let queue = createInitialCareQueue(['luna'], 100)
    queue = transitionPatientCase(queue, 'luna', 'waiting', 110)!
    queue = transitionPatientCase(queue, 'luna', 'consultation', 120)!
    queue = transitionPatientCase(queue, 'luna', 'preparation', 130)!
    queue = transitionPatientCase(queue, 'luna', 'surgery', 140)!
    queue = transitionPatientCase(queue, 'luna', 'failed', 150)!
    expect(queue[0].status).toBe('failed')
    expect(transitionPatientCase(queue, 'luna', 'discharged', 160)).toBeNull()
    expect(transitionPatientCase(queue, 'luna', 'recovery', 160)).toBeNull()
    const retry = transitionPatientCase(queue, 'luna', 'surgery', 160)
    expect(retry?.[0].status).toBe('surgery')
  })

  it('solo cuenta una vez al mismo paciente y permite rechazar y volver a consulta', () => {
    const queue = createInitialCareQueue(['tomas', 'tomas'], 100)
    expect(queue).toHaveLength(1)
    const waiting = transitionPatientCase(queue, 'tomas', 'waiting', 110)!
    const consult = transitionPatientCase(waiting, 'tomas', 'consultation', 120)!
    const declined = transitionPatientCase(consult, 'tomas', 'declined', 130)!
    const resumed = transitionPatientCase(declined, 'tomas', 'consultation', 140)!
    expect(resumed).toHaveLength(1)
    expect(resumed[0].status).toBe('consultation')
    expect(resumed[0].arrivedAt).toBe(100)
    expect(transitionPatientCase(resumed, 'missing', 'waiting')).toBeNull()
  })

  it('desbloquea misiones a partir del estado real y no de progreso aleatorio', () => {
    const hospital = createInitialHospitalState()
    const queue = createInitialCareQueue(['alma'])
    expect(getHospitalMissionProgress('attend-patient', { careQueue: queue, surgeryCount: 0, roomLevels: hospital.roomLevels, teamIsValid: false })).toBe(0)
    const attended = transitionPatientCase(queue, 'alma', 'consultation')!
    expect(getHospitalMissionProgress('attend-patient', { careQueue: attended, surgeryCount: 0, roomLevels: hospital.roomLevels, teamIsValid: false })).toBe(1)
    expect(getHospitalMissionProgress('complete-surgery', { careQueue: attended, surgeryCount: 0, roomLevels: hospital.roomLevels, teamIsValid: false })).toBe(0)
    expect(getHospitalMissionProgress('full-team', { careQueue: attended, surgeryCount: 0, roomLevels: hospital.roomLevels, teamIsValid: true })).toBe(1)
  })

  it('rechaza colocar muebles fuera del piso, sobre puertas o encima de otros muebles', () => {
    const base = createInitialHospitalState()
    const owned = { ...base, unlockedItems: ['chair-cloud'] }
    expect(canPlaceHospitalFurniture(owned, 'waiting', 'chair-cloud', 600, 200)).toBe(true)
    expect(canPlaceHospitalFurniture(owned, 'waiting', 'chair-cloud', 900, 235)).toBe(false)
    expect(canPlaceHospitalFurniture(owned, 'waiting', 'chair-cloud', 600, 285)).toBe(false)
    const placed = upsertHospitalFurniture(owned, {
      id: 'chair-1', roomId: 'waiting', itemId: 'chair-cloud', x: 600, y: 200, rotation: 0,
    })!
    expect(canPlaceHospitalFurniture(placed, 'waiting', 'chair-cloud', 551, 236)).toBe(false)
    expect(placed.furniture).toHaveLength(1)
  })
})
