import { describe, expect, it } from 'vitest'
import { staff } from '../data/staff'
import { patients } from '../data/patients'
import { createGameStore } from '../store/gameStore'
import { normalizeAudioPreferences } from './AudioManager'
import { assetManifest, findAsset, isFinalSpriteAvailable } from './assets/assetManifest'
import { animationForSurgeryStatus, createCharacterLayers, disposeCharacters, isPatientAppearance, movementOffset } from './characterVisuals'

describe('sistema visual, recursos y audio', () => {
  it('resuelve capas de apariencia personalizadas y alias de accesorios', () => {
    expect(createCharacterLayers({
      skin: '#bd8065', hair: '#49332d', hairStyle: 'curly',
      uniform: '#63c9bd', accessory: 'gorra', gender: 'doctor',
    })).toMatchObject({
      skin: '#bd8065', hair: '#49332d', hairStyle: 'curly',
      uniform: '#63c9bd', accessory: 'surgical-cap', gender: 'doctor',
    })
    expect(createCharacterLayers({
      skin: '#f2c6a5', hair: '#47302c', uniform: '#83c8ba', accessory: 'glasses',
    }).accessory).toBe('glasses')
  })

  it('provee apariencia variada para los diez profesionales y cinco pacientes', () => {
    expect(staff).toHaveLength(10)
    expect(staff.every(person => person.skin && person.hair && person.uniform && person.hairStyle)).toBe(true)
    expect(patients).toHaveLength(5)
    expect(patients.every(isPatientAppearance)).toBe(true)
    expect(patients.some(patient => patient.accessory === 'glasses')).toBe(true)
  })

  it('mapea estados de cirugía a las poses visuales correspondientes', () => {
    expect(animationForSurgeryStatus('READY')).toBe('idle')
    expect(animationForSurgeryStatus('IN_PROGRESS')).toBe('work')
    expect(animationForSurgeryStatus('COMPLICATION')).toBe('alert')
    expect(animationForSurgeryStatus('STABILIZED')).toBe('talk')
    expect(animationForSurgeryStatus('SUCCESS')).toBe('happy')
    expect(animationForSurgeryStatus('FAILURE')).toBe('sad')
  })

  it('mantiene los desplazamientos por rol cortos y los alterna por fase', () => {
    for (const role of ['anesthesia', 'instrument', 'circulating', 'assistant', 'lead']) {
      const first = movementOffset(role, 0)
      const second = movementOffset(role, 1)
      expect(Math.abs(first.x)).toBeLessThanOrEqual(8)
      expect(Math.abs(first.y)).toBeLessThanOrEqual(5)
      expect(second).toEqual({ x: -first.x, y: -first.y })
    }
  })

  it('limpia personajes y referencias de escena al desmontar', () => {
    const calls: string[] = []
    const characters = [
      { destroy: () => calls.push('first') },
      { destroy: () => calls.push('second') },
    ]
    disposeCharacters(characters)
    expect(calls).toEqual(['first', 'second'])
    expect(characters).toHaveLength(0)
  })

  it('identifica recursos finales pendientes sin anunciarlos como sprites disponibles', () => {
    expect(findAsset('final-character-sprite-atlas')?.status).toBe('pending')
    expect(isFinalSpriteAvailable('final-character-sprite-atlas')).toBe(false)
    expect(assetManifest.filter(asset => asset.status === 'pending')).toHaveLength(3)
    expect(isFinalSpriteAvailable('layered-character-generator')).toBe(false)
  })

  it('normaliza volúmenes y persiste las preferencias sin guardar instancias de audio', async () => {
    expect(normalizeAudioPreferences({ musicVolume: 1.4, effectsVolume: -0.2 })).toEqual({ musicVolume: 1, effectsVolume: 0 })
    const values = new Map<string, string>()
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    }
    const store = createGameStore(storage)
    store.getState().setAudioPreferences({ musicVolume: 0.62, effectsVolume: 0.28 })
    const serialized = values.get('mini-hospital-save') ?? ''
    expect(serialized).toContain('"audioPreferences":{"musicVolume":0.62,"effectsVolume":0.28}')
    expect(serialized).not.toContain('AudioContext')
    const restored = createGameStore(storage)
    await restored.persist.rehydrate()
    expect(restored.getState().audioPreferences).toEqual({ musicVolume: 0.62, effectsVolume: 0.28 })
  })
})
