import { staff } from '../data/staff'
import { resolveCharacterAppearance } from './characterRules'
import type { MedicalProfessional, Role, StaffProfile, SurgeryResult } from '../types'

export const teamRoles: Role[] = ['anesthesia', 'instrument', 'circulating', 'assistant']

export interface TeamMemberView extends MedicalProfessional {
  appearance: NonNullable<StaffProfile['appearance']>
  experiencePoints: number
  level: number
  energy: number
}

export interface TeamFactors {
  compatibility: number
  performance: number
  teamwork: number
  experience: number
  energy: number
  personality: number
  affinity: number
}

const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value))

export function recoverStaffEnergy(profile: StaffProfile, amount = 25): StaffProfile {
  return { ...profile, energy: clamp(profile.energy + Math.max(0, amount)) }
}

export function staffAccessoryUnlockLevel(field: string, value: unknown): number | null {
  if ((field === 'hatStyle' && value === 'headband') || (field === 'mask' && value === true)) return 2
  if (field === 'glassesStyle' && value === 'aviator') return 3
  return null
}

export function createStaffProfile(person: MedicalProfessional): StaffProfile {
  return {
    name: person.name,
    experiencePoints: 0,
    energy: 100,
    appearance: resolveCharacterAppearance({
      ...person,
      name: person.name,
      gender: person.gender ?? 'doctora',
      eyes: '#536d69',
      accessory: person.accessory ?? 'none',
    }),
    affinities: {},
  }
}

export function getTeamMemberView(
  person: MedicalProfessional,
  profiles: Record<string, StaffProfile>,
): TeamMemberView {
  const saved = profiles[person.id]
  const base = createStaffProfile(person)
  const profile: StaffProfile = {
    ...base,
    ...saved,
    name: saved?.name?.trim() || person.name,
    energy: clamp(saved?.energy ?? base.energy),
    experiencePoints: Math.max(0, saved?.experiencePoints ?? 0),
    appearance: resolveCharacterAppearance({ ...base.appearance, ...saved?.appearance }),
    affinities: saved?.affinities ?? {},
  }
  const level = 1 + Math.floor(profile.experiencePoints / 100)
  const skillBonus = Math.max(0, level - 1)
  return {
    ...person,
    ...profile.appearance,
    stats: {
      ...person.stats,
      precision: clamp(person.stats.precision + skillBonus),
      speed: clamp(person.stats.speed + skillBonus),
      calm: clamp(person.stats.calm + skillBonus),
      teamwork: clamp(person.stats.teamwork + skillBonus),
    },
    name: profile.name,
    gender: person.gender ?? 'doctora',
    appearance: profile.appearance,
    experiencePoints: profile.experiencePoints,
    level,
    energy: profile.energy,
  }
}

export function isValidTeam(
  selectedIds: string[],
  assignments: Partial<Record<Role, string>>,
  roster: MedicalProfessional[] = staff,
): boolean {
  if (selectedIds.length !== teamRoles.length || new Set(selectedIds).size !== teamRoles.length) return false
  if (!selectedIds.every(id => roster.some(person => person.id === id))) return false
  const assignedIds = teamRoles.map(role => assignments[role])
  if (assignedIds.some(id => !id) || new Set(assignedIds).size !== teamRoles.length) return false
  return teamRoles.every(role => {
    const id = assignments[role]
    const person = roster.find(item => item.id === id)
    return !!id && selectedIds.includes(id) && !!person?.roles.includes(role)
  })
}

export function assignAvailableRoles(ids: string[], roster: MedicalProfessional[] = staff): Partial<Record<Role, string>> {
  const remaining = new Set(ids)
  const assignments: Partial<Record<Role, string>> = {}
  for (const role of teamRoles) {
    const person = roster.find(item => remaining.has(item.id) && item.roles.includes(role))
    if (person) {
      assignments[role] = person.id
      remaining.delete(person.id)
    }
  }
  return assignments
}

const personalityPairScore = (a: MedicalProfessional['personality'], b: MedicalProfessional['personality']) => {
  if (a === b) return 74
  const pair = [a, b].sort().join(':')
  const scores: Record<string, number> = {
    'calm:empathetic': 92,
    'calm:energetic': 78,
    'calm:methodical': 90,
    'empathetic:energetic': 88,
    'empathetic:methodical': 82,
    'energetic:methodical': 76,
  }
  return scores[pair] ?? 70
}

export function calculateTeamFactors(
  ids: string[],
  profiles: Record<string, StaffProfile>,
  roster: MedicalProfessional[] = staff,
): TeamFactors {
  const members = ids.map(id => roster.find(person => person.id === id)).filter((person): person is MedicalProfessional => !!person)
    .map(person => getTeamMemberView(person, profiles))
  if (!members.length) return { compatibility: 0, performance: 0, teamwork: 0, experience: 0, energy: 0, personality: 0, affinity: 0 }

  const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length
  const teamwork = mean(members.map(person => person.stats.teamwork))
  const experience = mean(members.map(person => clamp(person.stats.experience + person.level * 2)))
  const energy = mean(members.map(person => person.energy))
  const pairs = members.flatMap((person, i) => members.slice(i + 1).map(other => ({ person, other })))
  const personality = pairs.length ? mean(pairs.map(({ person, other }) => personalityPairScore(person.personality, other.personality))) : 0
  const affinity = pairs.length ? mean(pairs.map(({ person, other }) => {
    const a = profiles[person.id]?.affinities[other.id] ?? 50
    const b = profiles[other.id]?.affinities[person.id] ?? 50
    return (a + b) / 2
  })) : 0
  const compatibility = Math.round(teamwork * .3 + experience * .2 + energy * .2 + personality * .15 + affinity * .15)
  const performance = Math.round(mean(members.map(person =>
    person.stats.precision * .3 + person.stats.speed * .2 + person.stats.calm * .2 +
    person.stats.teamwork * .2 + clamp(person.stats.experience + person.level * 2) * .1,
  )) * (.75 + energy / 400))
  return {
    compatibility: clamp(compatibility),
    performance: clamp(performance),
    teamwork: Math.round(teamwork),
    experience: Math.round(experience),
    energy: Math.round(energy),
    personality: Math.round(personality),
    affinity: Math.round(affinity),
  }
}

export function applySurgeryProgress(
  profiles: Record<string, StaffProfile>,
  ids: string[],
  result: SurgeryResult,
  roster: MedicalProfessional[] = staff,
): Record<string, StaffProfile> {
  const next = { ...profiles }
  const members = ids.map(id => roster.find(person => person.id === id)).filter((person): person is MedicalProfessional => !!person)
  const earned = Math.max(0, result.experience)
  for (const person of members) {
    const profile = getTeamMemberView(person, profiles)
    next[person.id] = {
      name: profile.name,
      experiencePoints: profile.experiencePoints + earned,
      energy: clamp(profile.energy - (result.outcome === 'SUCCESS' ? 12 : 20)),
      appearance: profile.appearance,
      affinities: { ...(profiles[person.id]?.affinities ?? {}) },
    }
  }
  const affinityGain = result.outcome === 'SUCCESS' ? 5 : 1
  for (let i = 0; i < members.length; i += 1) {
    for (let j = i + 1; j < members.length; j += 1) {
      const a = members[i].id
      const b = members[j].id
      next[a].affinities[b] = clamp((profiles[a]?.affinities[b] ?? 50) + affinityGain)
      next[b].affinities[a] = clamp((profiles[b]?.affinities[a] ?? 50) + affinityGain)
    }
  }
  return next
}
