import type { Doctor } from '../types'
import { optionsByCategory, type AppearanceOption } from './CharacterOptions'
import type { CharacterAppearance } from './characterTypes'

export const defaultCharacterAppearance: CharacterAppearance = {
  skin: '#bd8065',
  eyes: '#536d69',
  faceShape: 'round',
  eyeStyle: 'round',
  eyebrowStyle: 'soft',
  expression: 'smile',
  noseStyle: 'dot',
  mouthStyle: 'smile',
  hair: '#47302c',
  hairStyle: 'long',
  hatStyle: 'surgical',
  hatColor: '#ffffff',
  hatPattern: 'crosses',
  glassesStyle: 'none',
  glassesColor: '#574136',
  beardStyle: 'none',
  beardColor: '#382a24',
  uniformStyle: 'coat',
  uniform: '#63c9bd',
  shoeColor: '#ffffff',
  mask: false,
  stethoscope: true,
}

const valuesFor = (field: keyof CharacterAppearance) => optionsByCategory.hair
  .concat(optionsByCategory.face, optionsByCategory.skin, optionsByCategory.hat, optionsByCategory.glasses, optionsByCategory.beard, optionsByCategory.uniform)
  .filter(option => option.field === field)
  .map(option => option.value)

export function resolveCharacterAppearance(doctor: Partial<Doctor> | null | undefined): CharacterAppearance {
  const saved = doctor ?? {}
  const legacyHat: CharacterAppearance['hatStyle'] = saved.accessory === 'gorra' || saved.accessory === 'surgical-cap'
    ? 'surgical'
    : saved.accessory === 'headband' ? 'headband' : 'none'
  const mappedGlasses: CharacterAppearance['glassesStyle'] = saved.accessory === 'glasses' ? 'round' : 'none'
  const candidate: CharacterAppearance = {
    ...defaultCharacterAppearance,
    ...saved,
    hatStyle: saved.hatStyle ?? legacyHat ?? defaultCharacterAppearance.hatStyle,
    glassesStyle: saved.glassesStyle ?? mappedGlasses,
  }
  const normalized = { ...candidate }
  for (const field of Object.keys(defaultCharacterAppearance) as (keyof CharacterAppearance)[]) {
    const choices = valuesFor(field)
    if (choices.length && !choices.includes(candidate[field])) {
      ;(normalized as Record<keyof CharacterAppearance, unknown>)[field] = defaultCharacterAppearance[field]
    }
  }
  normalized.mask = typeof saved.mask === 'boolean' ? saved.mask : defaultCharacterAppearance.mask
  normalized.stethoscope = typeof saved.stethoscope === 'boolean' ? saved.stethoscope : defaultCharacterAppearance.stethoscope
  return normalized
}

export function migrateDoctorAppearance(doctor: Doctor | null): (Doctor & CharacterAppearance) | null {
  if (!doctor) return null
  const appearance = resolveCharacterAppearance(doctor)
  return { ...doctor, ...appearance, accessory: legacyAccessoryFor(appearance) }
}

export function legacyAccessoryFor(appearance: CharacterAppearance): string {
  if (appearance.hatStyle === 'headband') return 'headband'
  if (appearance.hatStyle !== 'none') return 'gorra'
  return appearance.glassesStyle === 'none' ? 'none' : 'glasses'
}

export function applyCharacterOption(appearance: CharacterAppearance, option: AppearanceOption): CharacterAppearance {
  return { ...appearance, [option.field]: option.value }
}

export function randomizeCharacter(doctor: Doctor, random: () => number = Math.random): Doctor & CharacterAppearance {
  const appearance = resolveCharacterAppearance(doctor)
  const result = { ...appearance }
  for (const category of Object.values(optionsByCategory)) {
    for (const option of category) {
      if (['hatColor', 'hatPattern', 'glassesColor', 'beardColor', 'shoeColor', 'uniform', 'mask', 'stethoscope'].includes(option.field)) continue
      const fieldOptions = category.filter(item => item.field === option.field)
      if (fieldOptions[0] !== option) continue
      const picked = fieldOptions[Math.min(fieldOptions.length - 1, Math.floor(random() * fieldOptions.length))]
      ;(result as Record<keyof CharacterAppearance, unknown>)[picked.field] = picked.value
    }
  }
  const randomizeField = (field: keyof CharacterAppearance, options: AppearanceOption[]) => {
    const choices = options.filter(option => option.field === field)
    if (choices.length) (result as Record<keyof CharacterAppearance, unknown>)[field] = choices[Math.min(choices.length - 1, Math.floor(random() * choices.length))].value
  }
  for (const field of ['skin', 'hair', 'eyes', 'uniform'] as const) {
    const found = Object.values(optionsByCategory).flat().filter(option => option.field === field)
    randomizeField(field, found)
  }
  randomizeField('hatColor', optionsByCategory.hat)
  randomizeField('hatPattern', optionsByCategory.hat)
  randomizeField('glassesColor', optionsByCategory.glasses)
  randomizeField('beardColor', optionsByCategory.beard)
  randomizeField('shoeColor', optionsByCategory.uniform)
  randomizeField('uniform', optionsByCategory.uniform)
  randomizeField('mask', optionsByCategory.uniform)
  randomizeField('stethoscope', optionsByCategory.uniform)
  return { ...doctor, ...result, accessory: legacyAccessoryFor(result) }
}
