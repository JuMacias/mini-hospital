import { hospitalItems } from './hospitalRules'
import type {
  HospitalFurniturePlacement,
  HospitalRoomId,
  HospitalState,
  PatientCareCase,
  PatientCareStatus,
} from '../types'

export const hospitalRoomWorldPositions: Record<HospitalRoomId, { x: number; y: number }> = {
  reception: { x: 200, y: 235 },
  waiting: { x: 600, y: 235 },
  consultation: { x: 1000, y: 235 },
  corridor: { x: 200, y: 560 },
  operating: { x: 600, y: 560 },
  recovery: { x: 1000, y: 560 },
}

const transitions: Record<PatientCareStatus, PatientCareStatus[]> = {
  arrived: ['waiting', 'consultation'],
  waiting: ['consultation'],
  consultation: ['preparation', 'declined', 'waiting'],
  preparation: ['consultation', 'surgery'],
  surgery: ['recovery', 'failed'],
  recovery: ['surgery', 'discharged'],
  declined: ['consultation'],
  failed: ['surgery'],
  discharged: [],
}

export function createInitialCareQueue(patientIds: string[], arrivedAt = Date.now()): PatientCareCase[] {
  return [...new Set(patientIds)].map(patientId => ({
    id: `${patientId}-case-1`,
    patientId,
    status: 'arrived',
    arrivedAt,
    updatedAt: arrivedAt,
  }))
}

export function canTransitionPatient(current: PatientCareStatus, next: PatientCareStatus): boolean {
  return transitions[current].includes(next)
}

export function transitionPatientCase(
  cases: PatientCareCase[],
  patientId: string,
  next: PatientCareStatus,
  updatedAt = Date.now(),
): PatientCareCase[] | null {
  const index = cases.findIndex(item => item.patientId === patientId)
  if (index < 0 || !canTransitionPatient(cases[index].status, next)) return null
  const updated = [...cases]
  updated[index] = { ...updated[index], status: next, updatedAt }
  return updated
}

export interface HospitalMission {
  id: string
  title: string
  description: string
  reward: number
  target: number
}

export const hospitalMissions: HospitalMission[] = [
  { id: 'attend-patient', title: 'Un primer encuentro', description: 'Recibe a un paciente en consulta.', reward: 8, target: 1 },
  { id: 'complete-surgery', title: 'Aventura completada', description: 'Termina una aventura quirúrgica.', reward: 12, target: 1 },
  { id: 'upgrade-room', title: 'Un espacio mejor', description: 'Mejora una habitación.', reward: 8, target: 1 },
  { id: 'prepare-or', title: 'Todo preparado', description: 'Prepara el quirófano para un paciente.', reward: 8, target: 1 },
  { id: 'full-team', title: 'En equipo', description: 'Organiza un equipo completo con sus roles.', reward: 6, target: 1 },
]

export interface HospitalMissionContext {
  careQueue: PatientCareCase[]
  surgeryCount: number
  roomLevels: Partial<Record<HospitalRoomId, number>>
  teamIsValid: boolean
}

export function getHospitalMissionProgress(
  missionId: string,
  context: HospitalMissionContext,
): number {
  switch (missionId) {
    case 'attend-patient':
      return context.careQueue.some(item => !['arrived', 'waiting'].includes(item.status)) ? 1 : 0
    case 'complete-surgery':
      return Math.min(context.surgeryCount, 1)
    case 'upgrade-room':
      return Object.values(context.roomLevels).some(level => (level ?? 1) > 1) ? 1 : 0
    case 'prepare-or':
      return context.careQueue.some(item =>
        ['preparation', 'surgery', 'recovery', 'failed', 'discharged'].includes(item.status),
      ) ? 1 : 0
    case 'full-team':
      return context.teamIsValid ? 1 : 0
    default:
      return 0
  }
}

const furnitureCategories = new Set(['bed', 'chair', 'table', 'plant', 'picture', 'light', 'decor'])

export function canPlaceHospitalFurniture(
  hospital: HospitalState,
  roomId: HospitalRoomId,
  itemId: string,
  x: number,
  y: number,
  placementId?: string,
): boolean {
  const item = hospitalItems.find(candidate => candidate.id === itemId)
  const center = hospitalRoomWorldPositions[roomId]
  if (!item || !furnitureCategories.has(item.category)
    || !hospital.unlockedRooms.includes(roomId)
    || !hospital.unlockedItems.includes(itemId)
    || !Number.isFinite(x) || !Number.isFinite(y)) return false
  if ((item.category === 'bed' && !['consultation', 'operating', 'recovery'].includes(roomId))
    || (item.category === 'chair' && roomId === 'corridor')
    || (item.category === 'table' && roomId === 'recovery')) return false
  if (hospital.furniture.some(placement =>
    placement.id !== placementId && placement.roomId === roomId && placement.itemId === itemId,
  )) return false
  const dx = x - center.x
  const dy = y - center.y
  if (Math.abs(dx) / 118 + Math.abs(dy) / 58 > 1) return false
  if (dy > 32 && Math.abs(dx) < 70) return false
  const fixedObjects: Array<{ category: string; x: number; y: number; radius: number }> = []
  if (['consultation', 'operating', 'recovery'].includes(roomId)) fixedObjects.push({ category: 'bed', x: -4, y: 5, radius: 48 })
  if (['reception', 'waiting', 'consultation'].includes(roomId)) fixedObjects.push({ category: 'table', x: -100, y: 12, radius: 34 })
  if (['operating', 'consultation', 'corridor'].includes(roomId)) fixedObjects.push({ category: 'table', x: 100, y: 4, radius: 34 })
  if (['reception', 'waiting', 'recovery'].includes(roomId)) {
    fixedObjects.push({ category: 'chair', x: 79, y: 13, radius: 24 }, { category: 'chair', x: 113, y: 2, radius: 24 })
  } else fixedObjects.push({ category: 'chair', x: 86, y: 12, radius: 24 })
  if (roomId === 'reception' || roomId === 'waiting') fixedObjects.push({ category: 'plant', x: -124, y: 25, radius: 24 })
  if (fixedObjects.some(object => object.category !== item.category
    && Math.hypot(dx - object.x, dy - object.y) < object.radius + 22)) return false
  return !hospital.furniture.some(placement =>
    placement.id !== placementId
    && placement.roomId === roomId
    && Math.hypot(placement.x - x, placement.y - y) < 42,
  )
}

export function upsertHospitalFurniture(
  hospital: HospitalState,
  placement: HospitalFurniturePlacement,
): HospitalState | null {
  if (!canPlaceHospitalFurniture(hospital, placement.roomId, placement.itemId, placement.x, placement.y, placement.id)) return null
  const definition = hospitalItems.find(item => item.id === placement.itemId)
  if (!definition) return null
  const exists = hospital.furniture.some(item => item.id === placement.id)
  return {
    ...hospital,
    furniture: exists
      ? hospital.furniture.map(item => item.id === placement.id ? placement : item)
      : [...hospital.furniture, placement],
    decorations: {
      ...hospital.decorations,
      [placement.roomId]: {
        ...hospital.decorations[placement.roomId],
          [definition.category]: placement.itemId,
      },
    },
  }
}

export function removeHospitalFurniture(hospital: HospitalState, placementId: string): HospitalState | null {
  const placement = hospital.furniture.find(item => item.id === placementId)
  if (!placement) return null
  const category = hospitalItems.find(item => item.id === placement.itemId)?.category
  const defaults: Partial<Record<string, string>> = {
    bed: 'bed-basic', chair: 'chair-basic', table: 'table-basic', plant: 'plant-basic',
    picture: 'picture-basic', light: 'light-soft', decor: 'decor-none',
  }
  const roomDecorations = hospital.decorations[placement.roomId] ?? {}
  return {
    ...hospital,
    furniture: hospital.furniture.filter(item => item.id !== placementId),
    decorations: category && roomDecorations[category] === placement.itemId
      ? {
        ...hospital.decorations,
        [placement.roomId]: { ...roomDecorations, [category]: defaults[category] },
      }
      : hospital.decorations,
  }
}
