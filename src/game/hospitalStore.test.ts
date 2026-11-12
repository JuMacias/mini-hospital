import { describe, expect, it } from 'vitest'
import { createGameStore } from '../store/gameStore'
import type { StateStorage } from 'zustand/middleware'
import type { SurgeryResult } from '../types'

function memoryStorage() {
  const values = new Map<string, string>()
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  } satisfies StateStorage
  return { storage, values }
}

const successfulResult: SurgeryResult = {
  id: 'hospital-reward-1',
  patientId: 'luna',
  outcome: 'SUCCESS',
  score: 200,
  teamPerformance: 90,
  experience: 200,
  reward: 150,
  complications: 0,
  completedAt: '2026-01-01T00:00:00.000Z',
}

describe('persistencia y economía del hospital', () => {
  it('mantiene aislado el intento de compra sin saldo y no altera el estado persistido', () => {
    const { storage, values } = memoryStorage()
    const store = createGameStore(storage)
    const before = store.getState().hospital

    expect(store.getState().purchaseHospitalItem('reception', 'wall-sky')).toBe(false)
    expect(store.getState().coins).toBe(0)
    expect(store.getState().hospital).toBe(before)
    expect(store.getState().hospital.unlockedItems).not.toContain('wall-sky')
    expect(values.get('mini-hospital-save') ?? '').not.toContain('wall-sky')
  })

  it('cobra una compra confirmada una sola vez y permite reinstalar el artículo adquirido', async () => {
    const { storage } = memoryStorage()
    const store = createGameStore(storage)
    store.getState().recordSurgeryResult(successfulResult)
    expect(store.getState().coins).toBe(150)

    expect(store.getState().purchaseHospitalItem('reception', 'wall-sky')).toBe(true)
    expect(store.getState().coins).toBe(138)
    expect(store.getState().purchaseHospitalItem('reception', 'wall-sky')).toBe(false)
    expect(store.getState().coins).toBe(138)
    expect(store.getState().installHospitalItem('waiting', 'wall-sky')).toBe(true)
    expect(store.getState().hospital.decorations.waiting?.wall).toBe('wall-sky')
    expect(store.getState().hospital.coinsSpent).toBe(12)

    const restored = createGameStore(storage)
    await restored.persist.rehydrate()
    expect(restored.getState().coins).toBe(138)
    expect(restored.getState().hospital.unlockedItems).toEqual(['wall-sky'])
    expect(restored.getState().hospital.decorations.waiting?.wall).toBe('wall-sky')
  })

  it('bloquea habitaciones por requisitos y aplica apertura y mejora con saldo exacto', () => {
    const store = createGameStore()
    store.getState().recordSurgeryResult(successfulResult)
    expect(store.getState().hospital.level).toBe(3)
    expect(store.getState().purchaseHospitalRoom('consultation')).toBe(true)
    expect(store.getState().coins).toBe(115)
    expect(store.getState().hospital.unlockedRooms).toContain('consultation')
    expect(store.getState().purchaseHospitalRoom('consultation')).toBe(false)
    expect(store.getState().coins).toBe(115)

    expect(store.getState().upgradeHospitalRoom('consultation')).toBe(true)
    expect(store.getState().hospital.roomLevels.consultation).toBe(2)
    expect(store.getState().coins).toBe(75)
  })

  it('no duplica monedas ni experiencia al registrar dos veces el mismo resultado', () => {
    const store = createGameStore()
    store.getState().recordSurgeryResult(successfulResult)
    store.getState().recordSurgeryResult(successfulResult)
    expect(store.getState().coins).toBe(150)
    expect(store.getState().experience).toBe(200)
    expect(store.getState().surgeryHistory).toHaveLength(1)
  })

  it('traslada solo pacientes en espera a sala de revisión y conserva su ubicación', async () => {
    const { storage } = memoryStorage()
    const store = createGameStore(storage)
    expect(store.getState().hospital.unlockedRooms).toContain('review')
    expect(store.getState().movePatientToRoom('luna', 'review')).toBe(false)
    expect(store.getState().setPatientCareStatus('luna', 'waiting')).toBe(true)
    expect(store.getState().movePatientToRoom('luna', 'review')).toBe(true)
    expect(store.getState().hospital.patientLocations.luna).toBe('review')

    const restored = createGameStore(storage)
    await restored.persist.rehydrate()
    expect(restored.getState().hospital.patientLocations.luna).toBe('review')
    expect(restored.getState().setPatientCareStatus('luna', 'consultation')).toBe(true)
    expect(restored.getState().hospital.patientLocations.luna).toBeUndefined()
  })

  it('migra las recompensas v4 al saldo y crea el hospital inicial sin perder progresión', async () => {
    const { storage, values } = memoryStorage()
    values.set('mini-hospital-save', JSON.stringify({
      state: { experience: 180, rewards: 47, surgeryHistory: [] },
      version: 4,
    }))
    const store = createGameStore(storage)
    await store.persist.rehydrate()
    expect(store.getState().coins).toBe(47)
    expect(store.getState().experience).toBe(180)
    expect(store.getState().hospital.level).toBe(2)
    expect(store.getState().hospital.unlockedRooms).toEqual(['reception', 'waiting', 'review', 'corridor'])
    expect(JSON.parse(values.get('mini-hospital-save') ?? '{}').version).toBe(8)
  })

  it('migra partidas v5 conservando habitaciones y añade cola y muebles por defecto', async () => {
    const { storage, values } = memoryStorage()
    values.set('mini-hospital-save', JSON.stringify({
      state: {
        experience: 80,
        rewards: 20,
        hospital: {
          level: 1, unlockedRooms: ['reception', 'waiting', 'corridor'], unlockedItems: [],
          purchases: [], roomLevels: { reception: 2, waiting: 1, corridor: 1 },
          decorations: {}, selectedRoom: 'waiting', coinsSpent: 0,
        },
      },
      version: 5,
    }))
    const store = createGameStore(storage)
    await store.persist.rehydrate()
    expect(store.getState().hospital.selectedRoom).toBe('waiting')
    expect(store.getState().hospital.roomLevels.reception).toBe(2)
    expect(store.getState().hospital.careQueue).toHaveLength(5)
    expect(store.getState().hospital.furniture).toEqual([])
    expect(store.getState().hospital.claimedMissionIds).toEqual([])
    expect(JSON.parse(values.get('mini-hospital-save') ?? '{}').version).toBe(8)
  })

  it('migra partidas v6 conservando los turnos y aplicando preferencias compatibles', async () => {
    const { storage, values } = memoryStorage()
    values.set('mini-hospital-save', JSON.stringify({
      state: {
        experience: 80,
        hospital: {
          level: 1, unlockedRooms: ['reception', 'waiting', 'corridor'], unlockedItems: [],
          purchases: [], roomLevels: { reception: 1, waiting: 1, corridor: 1 },
          decorations: {}, selectedRoom: 'waiting', coinsSpent: 0,
          careQueue: [{ id: 'alma-case-1', patientId: 'alma', status: 'arrived', arrivedAt: 1, updatedAt: 1 }],
        },
      },
      version: 6,
    }))
    const store = createGameStore(storage)
    await store.persist.rehydrate()
    expect(store.getState().nightMode).toBe(false)
    expect(store.getState().hospital.careQueue[0]).toMatchObject({ patientId: 'alma', priority: 'immediate' })
    expect(store.getState().hospital.unlockedRooms).toContain('review')
    expect(store.getState().hospital.patientLocations).toEqual({})
    expect(JSON.parse(values.get('mini-hospital-save') ?? '{}').version).toBe(8)
  })

  it('migra partidas v7 y agrega la sala de revisión sin borrar el hospital', async () => {
    const { storage, values } = memoryStorage()
    values.set('mini-hospital-save', JSON.stringify({
      state: {
        experience: 80,
        hospital: {
          level: 1, unlockedRooms: ['reception', 'waiting', 'corridor'], unlockedItems: [],
          purchases: [], roomLevels: { reception: 1, waiting: 1, corridor: 1 },
          decorations: {}, selectedRoom: 'waiting', coinsSpent: 0,
          careQueue: [{ id: 'alma-case-1', patientId: 'alma', status: 'waiting', arrivedAt: 1, updatedAt: 1 }],
        },
      },
      version: 7,
    }))
    const store = createGameStore(storage)
    await store.persist.rehydrate()
    expect(store.getState().hospital.unlockedRooms).toContain('review')
    expect(store.getState().hospital.roomLevels.review).toBe(1)
    expect(store.getState().hospital.patientLocations).toEqual({})
    expect(JSON.parse(values.get('mini-hospital-save') ?? '{}').version).toBe(8)
  })

  it('transiciona del turno a consulta y recuperación y bloquea el alta tras un fallo', () => {
    const store = createGameStore()
    expect(store.getState().setPatientCareStatus('luna', 'waiting')).toBe(true)
    expect(store.getState().setPatientCareStatus('luna', 'consultation')).toBe(true)
    expect(store.getState().setPatientCareStatus('luna', 'preparation')).toBe(true)
    expect(store.getState().setPatientCareStatus('luna', 'surgery')).toBe(true)
    store.getState().recordSurgeryResult(successfulResult)
    expect(store.getState().hospital.careQueue.find(item => item.patientId === 'luna')?.status).toBe('recovery')
    expect(store.getState().setPatientCareStatus('luna', 'discharged')).toBe(true)
    expect(store.getState().hospital.careQueue.find(item => item.patientId === 'luna')?.status).toBe('discharged')

    expect(store.getState().setPatientCareStatus('tomas', 'discharged')).toBe(false)
    expect(store.getState().setPatientCareStatus('tomas', 'waiting')).toBe(true)
    expect(store.getState().setPatientCareStatus('tomas', 'consultation')).toBe(true)
    expect(store.getState().setPatientCareStatus('tomas', 'preparation')).toBe(true)
    expect(store.getState().setPatientCareStatus('tomas', 'surgery')).toBe(true)
    store.getState().recordSurgeryResult({ ...successfulResult, id: 'hospital-failure-1', patientId: 'tomas', outcome: 'FAILURE' })
    expect(store.getState().hospital.careQueue.find(item => item.patientId === 'tomas')?.status).toBe('failed')
    expect(store.getState().setPatientCareStatus('tomas', 'discharged')).toBe(false)
  })

  it('otorga una misión solo una vez y persiste la colocación y rotación de muebles', async () => {
    const { storage } = memoryStorage()
    const store = createGameStore(storage)
    expect(store.getState().claimHospitalMission('full-team')).toBe(true)
    expect(store.getState().coins).toBe(6)
    expect(store.getState().claimHospitalMission('full-team')).toBe(false)
    expect(store.getState().coins).toBe(6)

    store.getState().recordSurgeryResult(successfulResult)
    expect(store.getState().purchaseHospitalItem('waiting', 'chair-cloud')).toBe(true)
    expect(store.getState().placeHospitalFurniture({
      id: 'waiting-chair-1', roomId: 'waiting', itemId: 'chair-cloud', x: 600, y: 200, rotation: 0,
    })).toBe(true)
    expect(store.getState().rotateHospitalFurniture('waiting-chair-1')).toBe(true)
    expect(store.getState().hospital.furniture[0].rotation).toBe(45)

    const restored = createGameStore(storage)
    await restored.persist.rehydrate()
    expect(restored.getState().hospital.claimedMissionIds).toContain('full-team')
    expect(restored.getState().hospital.furniture[0].rotation).toBe(45)
    expect(restored.getState().removeHospitalFurniture('waiting-chair-1')).toBe(true)
    expect(restored.getState().hospital.furniture).toHaveLength(0)
    expect(restored.getState().installHospitalItem('waiting', 'chair-cloud')).toBe(true)
    expect(restored.getState().uninstallHospitalItem('waiting', 'chair-cloud')).toBe(true)
    expect(restored.getState().hospital.decorations.waiting?.chair).toBe('chair-basic')
  })
})
