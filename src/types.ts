import type { CharacterAppearance, HairStyle } from './game/characterTypes'
export type {
  BeardStyle, BrowStyle, CharacterAppearance, EyeStyle, ExpressionStyle, FaceShape,
  GlassesStyle, HatStyle, HairStyle, MouthStyle, NoseStyle, UniformStyle,
} from './game/characterTypes'

export type Role = 'anesthesia' | 'instrument' | 'circulating' | 'assistant'
export type CharacterAccessory = 'none' | 'gorra' | 'surgical-cap' | 'glasses' | 'headband'
export type CharacterAnimation = 'idle' | 'walk' | 'rest' | 'work' | 'talk' | 'alert' | 'happy' | 'sad'
export type StaffPersonality = 'calm' | 'methodical' | 'empathetic' | 'energetic'

export interface AudioPreferences {
  musicVolume: number
  effectsVolume: number
}

export interface Doctor extends Partial<CharacterAppearance> {
  name: string
  gender: 'doctora' | 'doctor'
  skin: string
  hair: string
  eyes: string
  uniform: string
  accessory: string
  hairStyle?: HairStyle
}

export interface MedicalProfessional extends Partial<CharacterAppearance> {
  id: string
  name: string
  specialty: string
  roles: Role[]
  personality: StaffPersonality
  uniform: string
  hair: string
  skin: string
  hairStyle?: HairStyle
  accessory?: string
  gender?: 'doctor' | 'doctora'
  stats: { precision: number; speed: number; calm: number; experience: number; teamwork: number }
}

export interface StaffProfile {
  name: string
  experiencePoints: number
  energy: number
  appearance: CharacterAppearance
  affinities: Record<string, number>
}

export type Difficulty = 'Fácil' | 'Normal' | 'Desafiante'
export type PatientEmotion = 'nervioso' | 'tranquilo' | 'animado' | 'preocupado'

export interface Patient {
  id: string
  name: string
  age: number
  personality: string
  reason: string
  procedure: string
  difficulty: Difficulty
  emotion: PatientEmotion
  skin: string
  hair: string
  uniform: string
  expression: string
  hairStyle?: HairStyle
  accessory?: string
}

export type ConversationEmotion = 'neutral' | 'happy' | 'nervous' | 'confused' | 'worried' | 'calm'
export type ConversationQuality = 'empathetic' | 'incomplete' | 'inappropriate'
export type ConversationTopic = 'introduction' | 'procedure' | 'benefits' | 'risks' | 'recovery' | 'questions'

export interface DialogueOption {
  id: string
  text: string
  trust: number
  calm: number
  quality: ConversationQuality
  comprehension: number
  feedback: string
  concepts?: ConversationTopic[]
}

export interface ConversationEntry {
  id?: string
  questionId: string
  response: string
  trustDelta: number
  calmDelta: number
  source: 'preset' | 'free'
  comprehensionDelta?: number
  quality?: ConversationQuality
  feedback?: string
  concepts?: ConversationTopic[]
  emotionAfter?: ConversationEmotion
  createdAt?: number
}

export type HospitalRoomId = 'reception' | 'waiting' | 'review' | 'consultation' | 'corridor' | 'operating' | 'recovery'
export type HospitalItemCategory = 'wall' | 'floor' | 'bed' | 'chair' | 'table' | 'plant' | 'picture' | 'light' | 'decor'
export type PatientCareStatus = 'arrived' | 'waiting' | 'consultation' | 'preparation' | 'surgery' | 'recovery' | 'discharged' | 'declined' | 'failed'

export interface PatientCareCase {
  id: string
  patientId: string
  status: PatientCareStatus
  priority?: 'immediate'
  arrivedAt: number
  updatedAt: number
}

export interface HospitalFurniturePlacement {
  id: string
  roomId: HospitalRoomId
  itemId: string
  x: number
  y: number
  rotation: number
}

export interface HospitalState {
  level: number
  unlockedRooms: HospitalRoomId[]
  unlockedItems: string[]
  purchases: string[]
  roomLevels: Partial<Record<HospitalRoomId, number>>
  decorations: Partial<Record<HospitalRoomId, Partial<Record<HospitalItemCategory, string>>>>
  selectedRoom: HospitalRoomId
  coinsSpent: number
  careQueue: PatientCareCase[]
  patientLocations: Record<string, HospitalRoomId>
  claimedMissionIds: string[]
  furniture: HospitalFurniturePlacement[]
}

export interface PreparationTask {
  id: string
  title: string
  description: string
  icon: string
}

export type SurgeryStatus = 'READY' | 'IN_PROGRESS' | 'COMPLICATION' | 'STABILIZED' | 'SUCCESS' | 'FAILURE'
export type SurgeryDifficulty = 'easy' | 'normal' | 'hard'
export type BleedingIntensity = 'off' | 'soft' | 'moderate'
export type ComplicationType = 'monitor' | 'instruments' | 'team' | 'bleeding'
export type SurgeryPhase = 0 | 1 | 2 | 3

export interface SurgeryComplication {
  id: string
  type: ComplicationType
  resolved: boolean
  resolution?: 'good' | 'miss'
}

export interface SurgeryState {
  runId: string
  status: SurgeryStatus
  phase: SurgeryPhase
  phaseActions: number
  stability: number
  errors: number
  complications: SurgeryComplication[]
  activeComplication: ComplicationType | null
  score: number
  teamPerformance: number
  difficulty: SurgeryDifficulty
  bleedingIntensity: BleedingIntensity
  patientId: string | null
}

export interface SurgeryResult {
  id: string
  patientId: string
  outcome: 'SUCCESS' | 'FAILURE'
  score: number
  teamPerformance: number
  experience: number
  reward: number
  complications: number
  completedAt: string
}
