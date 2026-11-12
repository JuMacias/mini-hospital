import { describe, expect, it } from 'vitest'
import { createGameStore } from '../store/gameStore'
import { staff } from '../data/staff'
import { assetManifest } from './assets/assetManifest'
import { hairColorOptions, hairStyleOptions, skinOptions, optionsByCategory } from './CharacterOptions'
import { createCharacterLayers } from './characterVisuals'
import { defaultCharacterAppearance, randomizeCharacter, resolveCharacterAppearance } from './characterRules'
import type { Doctor } from '../types'

function memoryStorage() {
  const values = new Map<string, string>()
  return {
    values,
    storage: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    },
  }
}

const legacyDoctor: Doctor = {
  name: 'Dra. Luna',
  gender: 'doctora',
  skin: '#bd8065',
  hair: '#382a24',
  eyes: '#536d69',
  uniform: '#63c9bd',
  accessory: 'glasses',
  hairStyle: 'short',
}

describe('editor visual de personajes', () => {
  it('ofrece ocho tonos de piel, doce peinados y diez colores de cabello', () => {
    expect(skinOptions).toHaveLength(8)
    expect(hairStyleOptions).toHaveLength(12)
    expect(hairColorOptions.length).toBeGreaterThanOrEqual(10)
  })

  it('normaliza apariencias antiguas y conserva los rasgos guardados', () => {
    const appearance = resolveCharacterAppearance(legacyDoctor)
    expect(appearance).toMatchObject({
      skin: '#bd8065',
      hair: '#382a24',
      eyes: '#536d69',
      uniform: '#63c9bd',
      hatStyle: 'none',
      glassesStyle: 'round',
      faceShape: 'round',
    })
    expect(createCharacterLayers({ ...appearance, gender: legacyDoctor.gender })).toMatchObject({
      hair: '#382a24',
      glassesStyle: 'round',
      accessory: 'glasses',
    })
  })

  it('genera combinaciones aleatorias dentro del catálogo y conserva nombre e identidad', () => {
    const randomized = randomizeCharacter(legacyDoctor, () => 0.99999)
    expect(randomized.name).toBe(legacyDoctor.name)
    expect(randomized.gender).toBe('doctora')
    expect(skinOptions.some(option => option.value === randomized.skin)).toBe(true)
    expect(hairStyleOptions.some(option => option.value === randomized.hairStyle)).toBe(true)
    expect(hairColorOptions.some(option => option.value === randomized.hair)).toBe(true)
    expect(optionsByCategory.uniform.some(option => option.field === 'uniform' && option.value === randomized.uniform)).toBe(true)
    expect(randomized.accessory).toBe('gorra')
  })

  it('mantiene opciones expandidas compatibles con los modelos y personajes existentes', () => {
    expect(staff).toHaveLength(10)
    expect(defaultCharacterAppearance.hairStyle).toBe('long')
    expect(optionsByCategory.face.length).toBeGreaterThan(20)
    expect(optionsByCategory.hat.some(option => option.value === 'patterned')).toBe(true)
    expect(optionsByCategory.glasses.some(option => option.value === 'cat-eye')).toBe(true)
    expect(optionsByCategory.beard.some(option => option.value === 'mustache')).toBe(true)
    expect(optionsByCategory.uniform.some(option => option.value === 'scrubs')).toBe(true)
    expect(assetManifest.some(asset => asset.id === 'layered-character-generator')).toBe(true)
  })

  it('migra la partida guardada al esquema versionado y mantiene la apariencia legacy', async () => {
    const { storage, values } = memoryStorage()
    values.set('mini-hospital-save', JSON.stringify({
      state: { doctor: legacyDoctor },
      version: 0,
    }))
    const store = createGameStore(storage)
    await store.persist.rehydrate()
    expect(store.getState().doctor).toMatchObject({
      name: 'Dra. Luna',
      skin: '#bd8065',
      hair: '#382a24',
      accessory: 'glasses',
      glassesStyle: 'round',
      hatStyle: 'none',
    })
    expect(JSON.parse(values.get('mini-hospital-save') ?? '{}').version).toBe(6)
  })

  it('migra a perfiles de personal sin sobrescribir equipo ni asignaciones antiguas', async () => {
    const { storage, values } = memoryStorage()
    const selectedStaff = ['emma', 'mateo', 'ines', 'lucas']
    const roleAssignments = { anesthesia: 'emma', instrument: 'mateo', circulating: 'ines', assistant: 'lucas' }
    values.set('mini-hospital-save', JSON.stringify({
      state: { doctor: legacyDoctor, selectedStaff, roleAssignments },
      version: 2,
    }))
    const store = createGameStore(storage)
    await store.persist.rehydrate()
    expect(store.getState().selectedStaff).toEqual(selectedStaff)
    expect(store.getState().roleAssignments).toEqual(roleAssignments)
    expect(store.getState().staffProfiles).toEqual({})
    expect(store.getState().favoriteTeam).toEqual([])
    expect(JSON.parse(values.get('mini-hospital-save') ?? '{}').version).toBe(6)
  })

  it('guarda y vuelve a cargar la identidad, las capas y el género seleccionados', async () => {
    const { storage } = memoryStorage()
    const store = createGameStore(storage)
    store.getState().setDoctor({
      ...legacyDoctor,
      ...defaultCharacterAppearance,
      name: legacyDoctor.name,
      gender: 'doctor',
      hairStyle: 'afro',
      hatStyle: 'patterned',
      hatPattern: 'stars',
      glassesStyle: 'cat-eye',
      beardStyle: 'mustache',
      uniformStyle: 'scrubs',
      mask: true,
      accessory: 'gorra',
    })
    const reloaded = createGameStore(storage)
    await reloaded.persist.rehydrate()
    expect(reloaded.getState().doctor).toMatchObject({
      gender: 'doctor',
      hairStyle: 'afro',
      hatStyle: 'patterned',
      hatPattern: 'stars',
      glassesStyle: 'cat-eye',
      beardStyle: 'mustache',
      uniformStyle: 'scrubs',
      mask: true,
    })
  })
})
