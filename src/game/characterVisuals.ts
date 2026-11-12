import type { CharacterAccessory, CharacterAnimation, CharacterAppearance, Patient, SurgeryStatus } from '../types'
import { resolveCharacterAppearance } from './characterRules'

export interface LayeredAppearance extends Partial<CharacterAppearance> {
  skin: string
  hair: string
  uniform: string
  accessory?: string
  gender?: 'doctor' | 'doctora'
}

export interface CharacterLayers extends CharacterAppearance {
  accessory: CharacterAccessory
  gender: 'doctor' | 'doctora'
}

export function createCharacterLayers(appearance: LayeredAppearance): CharacterLayers {
  const resolved = resolveCharacterAppearance(appearance)
  const accessories: Record<string, CharacterAccessory> = {
    '': 'none',
    none: 'none',
    gorra: 'surgical-cap',
    'surgical-cap': 'surgical-cap',
    glasses: 'glasses',
    headband: 'headband',
  }
  const accessory = resolved.hatStyle === 'headband'
    ? 'headband'
    : resolved.hatStyle !== 'none'
      ? 'surgical-cap'
      : resolved.glassesStyle !== 'none'
        ? 'glasses'
        : accessories[appearance.accessory ?? 'none'] ?? 'none'
  return { ...resolved, accessory, gender: appearance.gender ?? 'doctora' }
}

export function animationForSurgeryStatus(status: SurgeryStatus): CharacterAnimation {
  switch (status) {
    case 'IN_PROGRESS': return 'work'
    case 'COMPLICATION': return 'alert'
    case 'STABILIZED': return 'talk'
    case 'SUCCESS': return 'happy'
    case 'FAILURE': return 'sad'
    case 'READY': return 'idle'
  }
}

export function isPatientAppearance(patient: Patient): boolean {
  return Boolean(patient.skin && patient.hair && patient.uniform)
}

export function disposeCharacters(characters: Array<{ destroy: () => void }>) {
  characters.forEach(character => character.destroy())
  characters.length = 0
}

export function movementOffset(role: string, phase: number): { x: number; y: number } {
  const directions: Record<string, { x: number; y: number }> = {
    anesthesia: { x: 8, y: -3 },
    instrument: { x: -8, y: -3 },
    circulating: { x: 7, y: 3 },
    assistant: { x: -7, y: 3 },
    lead: { x: 0, y: -5 },
  }
  const direction = directions[role] ?? { x: 0, y: 0 }
  const phaseScale = phase % 2 === 0 ? 1 : -1
  return { x: direction.x * phaseScale, y: direction.y * phaseScale }
}
