import { describe, expect, it } from 'vitest'
import { canBuyHospitalItem, canUnlockHospitalRoom, canUpgradeHospitalRoom, createInitialHospitalState, getRoomUpgradeCost, hospitalComfortScore, hospitalLevelForExperience, successfulSurgeryCount } from './hospitalRules'
import type { HospitalState } from '../types'

describe('reglas del hospital personalizable', () => {
  it('inicia con áreas esenciales y escala el nivel con experiencia', () => {
    const hospital = createInitialHospitalState(140)
    expect(hospital.level).toBe(2)
    expect(hospital.unlockedRooms).toEqual(['reception', 'waiting', 'corridor'])
    expect(hospital.selectedRoom).toBe('reception')
    expect(hospitalLevelForExperience(0)).toBe(1)
    expect(hospitalLevelForExperience(1000)).toBe(5)
  })

  it('exige nivel, experiencia, cirugías y monedas para abrir habitaciones', () => {
    const hospital = createInitialHospitalState(200)
    expect(canUnlockHospitalRoom('consultation', hospital, 200, 1, 35)).toBe(true)
    expect(canUnlockHospitalRoom('consultation', hospital, 79, 1, 35)).toBe(false)
    expect(canUnlockHospitalRoom('consultation', hospital, 200, 0, 35)).toBe(false)
    expect(canUnlockHospitalRoom('consultation', hospital, 200, 1, 34)).toBe(false)
    const levelTooLow = { ...hospital, level: 1 }
    expect(canUnlockHospitalRoom('consultation', levelTooLow, 200, 1, 35)).toBe(false)
  })

  it('comprueba propiedad, categoría y saldo antes de comprar o instalar mejoras', () => {
    const hospital = createInitialHospitalState(100)
    expect(canBuyHospitalItem('wall-sky', 'reception', hospital, 12)).toBe(true)
    expect(canBuyHospitalItem('wall-sky', 'reception', hospital, 11)).toBe(false)
    expect(canBuyHospitalItem('bed-star', 'reception', hospital, 100)).toBe(false)
    const owned: HospitalState = { ...hospital, unlockedItems: ['wall-sky'] }
    expect(canBuyHospitalItem('wall-sky', 'reception', owned, 100)).toBe(false)
  })

  it('limita mejoras de habitación y calcula el costo por nivel', () => {
    const hospital = createInitialHospitalState()
    expect(getRoomUpgradeCost(1)).toBe(40)
    expect(canUpgradeHospitalRoom('reception', hospital, 40)).toBe(true)
    expect(canUpgradeHospitalRoom('reception', hospital, 39)).toBe(false)
    expect(canUpgradeHospitalRoom('consultation', hospital, 100)).toBe(false)
    expect(canUpgradeHospitalRoom('reception', { ...hospital, roomLevels: { ...hospital.roomLevels, reception: 3 } }, 500)).toBe(false)
  })

  it('calcula cirugías exitosas y comodidad sin asociar decoración a resultados quirúrgicos', () => {
    const results = [{ outcome: 'SUCCESS' as const }, { outcome: 'FAILURE' as const }, { outcome: 'SUCCESS' as const }]
    expect(successfulSurgeryCount(results)).toBe(2)
    const base = createInitialHospitalState()
    const decorated = {
      ...base,
      roomLevels: { ...base.roomLevels, reception: 2 },
      decorations: { ...base.decorations, reception: { ...base.decorations.reception, wall: 'wall-sky', plant: 'plant-flower' } },
    }
    expect(hospitalComfortScore(decorated)).toBeGreaterThan(hospitalComfortScore(base))
  })
})
