import { describe, expect, it } from 'vitest'
import { defaultRoleAssignments, defaultSelectedStaff, staff } from '../data/staff'
import { applySurgeryProgress, calculateTeamFactors, getTeamMemberView, isValidTeam, recoverStaffEnergy, staffAccessoryUnlockLevel } from './teamRules'
import { createGameStore } from '../store/gameStore'
import type { SurgeryResult } from '../types'
import type { StateStorage } from 'zustand/middleware'

const result = (outcome: SurgeryResult['outcome'] = 'SUCCESS'): SurgeryResult => ({
  id: 'run-1',
  patientId: 'patient-1',
  outcome,
  score: 80,
  teamPerformance: 80,
  experience: 30,
  reward: 20,
  complications: 0,
  completedAt: '2026-11-11T00:00:00.000Z',
})

describe('reglas del equipo quirúrgico', () => {
  it('requiere cuatro profesionales distintos con un rol compatible cada uno', () => {
    expect(isValidTeam(defaultSelectedStaff, defaultRoleAssignments)).toBe(true)
    expect(isValidTeam(defaultSelectedStaff.slice(1), defaultRoleAssignments)).toBe(false)
    expect(isValidTeam([...defaultSelectedStaff.slice(1), defaultSelectedStaff[1]], defaultRoleAssignments)).toBe(false)
    expect(isValidTeam(defaultSelectedStaff, { ...defaultRoleAssignments, anesthesia: 'mateo' })).toBe(false)
  })

  it('calcula compatibilidad con trabajo en equipo, personalidad, experiencia, energía y afinidad deterministas', () => {
    const factors = calculateTeamFactors(defaultSelectedStaff, {})
    expect(factors.compatibility).toBeGreaterThan(0)
    expect(factors.compatibility).toBeLessThanOrEqual(100)
    expect(factors.teamwork).toBe(92)
    expect(factors.affinity).toBe(50)
    expect(calculateTeamFactors(defaultSelectedStaff, {})).toEqual(factors)
  })

  it('acumula experiencia, sube de nivel, reduce energía y aumenta afinidad', () => {
    const first = staff.find(person => person.id === defaultSelectedStaff[0])
    if (!first) throw new Error('No se encontró el primer integrante del equipo.')
    const base = getTeamMemberView(first, {})
    const seeded = { [first.id]: { name: first.name, experiencePoints: 80, energy: 100, appearance: base.appearance, affinities: {} } }
    expect(getTeamMemberView(first, seeded).level).toBe(1)
    const progressed = applySurgeryProgress(seeded, defaultSelectedStaff, result())
    const after = getTeamMemberView(first, progressed)
    expect(after.experiencePoints).toBe(110)
    expect(after.energy).toBe(88)
    expect(after.level).toBe(2)
    expect(after.stats.precision).toBe(first.stats.precision + 1)
    expect(progressed.sofia?.affinities.mateo).toBe(55)
  })

  it('al personalizar un perfil conserva el resto de la apariencia', () => {
    const person = staff[0]
    const base = getTeamMemberView(person, {})
    const personalized = getTeamMemberView(person, {
      [person.id]: { name: 'Sofi', experiencePoints: 0, energy: 100, appearance: { ...base.appearance, uniform: '#e7a3b6' }, affinities: {} },
    })
    expect(personalized.name).toBe('Sofi')
    expect(personalized.appearance.uniform).toBe('#e7a3b6')
    expect(personalized.appearance.hairStyle).toBe(base.appearance.hairStyle)
  })

  it('conserva energía y experiencia con recompensas menores tras un fracaso', () => {
    const progressed = applySurgeryProgress({}, defaultSelectedStaff, result('FAILURE'))
    expect(progressed.sofia?.experiencePoints).toBe(30)
    expect(progressed.sofia?.energy).toBe(80)
  })

  it('recupera energía con tope y desbloquea accesorios por nivel', () => {
    const person = staff[0]
    const profile = { appearance: getTeamMemberView(person, {}).appearance, name: person.name, experiencePoints: 0, energy: 82, affinities: {} }
    expect(recoverStaffEnergy(profile).energy).toBe(100)
    expect(recoverStaffEnergy({ ...profile, energy: 100 }).energy).toBe(100)
    expect(staffAccessoryUnlockLevel('hatStyle', 'headband')).toBe(2)
    expect(staffAccessoryUnlockLevel('glassesStyle', 'aviator')).toBe(3)
    expect(staffAccessoryUnlockLevel('uniform', '#e7a3b6')).toBeNull()
  })

  it('guarda y recupera una formación favorita en el estado persistido', () => {
    const values = new Map<string, string>()
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    } satisfies StateStorage
    const store = createGameStore(storage)
    store.getState().saveFavoriteTeam()
    store.getState().setSelectedStaff(['emma'])
    store.getState().loadFavoriteTeam()
    expect(store.getState().selectedStaff).toEqual(defaultSelectedStaff)
    expect(store.getState().roleAssignments).toEqual(defaultRoleAssignments)
    expect(JSON.parse(values.get('mini-hospital-save') ?? '{}').state.favoriteTeam).toEqual(defaultSelectedStaff)
  })

  it('persiste nombre y apariencia individual del profesional', () => {
    const values = new Map<string, string>()
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    } satisfies StateStorage
    const store = createGameStore(storage)
    const base = getTeamMemberView(staff[0], {})
    store.getState().setStaffProfile(staff[0].id, {
      name: 'Sofía',
      experiencePoints: 45,
      energy: 70,
      appearance: { ...base.appearance, uniform: '#e7a3b6' },
      affinities: {},
    })
    const persisted = JSON.parse(values.get('mini-hospital-save') ?? '{}').state.staffProfiles.sofia
    expect(persisted).toMatchObject({ name: 'Sofía', experiencePoints: 45, energy: 70 })
    expect(persisted.appearance.uniform).toBe('#e7a3b6')
  })
})
