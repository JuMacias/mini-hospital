import type { HospitalItemCategory, HospitalRoomId, HospitalState } from '../types'

export interface HospitalRoomDefinition {
  id: HospitalRoomId
  name: string
  description: string
  levelRequired: number
  experienceRequired: number
  surgeriesRequired: number
  unlockPrice: number
}

export interface HospitalItemDefinition {
  id: string
  name: string
  category: HospitalItemCategory
  value: string
  price: number
  levelRequired: number
  description: string
}

export const hospitalRooms: HospitalRoomDefinition[] = [
  { id: 'reception', name: 'Recepción', description: 'El primer saludo para cada paciente.', levelRequired: 1, experienceRequired: 0, surgeriesRequired: 0, unlockPrice: 0 },
  { id: 'waiting', name: 'Sala de espera', description: 'Un lugar amable para esperar acompañado.', levelRequired: 1, experienceRequired: 0, surgeriesRequired: 0, unlockPrice: 0 },
  { id: 'consultation', name: 'Consultorio', description: 'Un espacio tranquilo para conversar.', levelRequired: 2, experienceRequired: 80, surgeriesRequired: 1, unlockPrice: 35 },
  { id: 'corridor', name: 'Pasillos', description: 'Conectan las áreas de tu hospital.', levelRequired: 1, experienceRequired: 0, surgeriesRequired: 0, unlockPrice: 0 },
  { id: 'operating', name: 'Quirófano', description: 'Prepara la siguiente aventura ficticia.', levelRequired: 3, experienceRequired: 180, surgeriesRequired: 2, unlockPrice: 80 },
  { id: 'recovery', name: 'Sala de recuperación', description: 'Un espacio para descansar después de la aventura.', levelRequired: 4, experienceRequired: 300, surgeriesRequired: 4, unlockPrice: 60 },
]

export const hospitalItems: HospitalItemDefinition[] = [
  { id: 'wall-sky', name: 'Pintura cielo', category: 'wall', value: '#d8edf4', price: 12, levelRequired: 1, description: 'Azul claro y luminoso.' },
  { id: 'wall-lilac', name: 'Pintura lila', category: 'wall', value: '#e5dcf2', price: 12, levelRequired: 1, description: 'Un tono lila suave.' },
  { id: 'wall-rose', name: 'Pintura rosa', category: 'wall', value: '#f2dce5', price: 16, levelRequired: 2, description: 'Rosa pastel para un ambiente cálido.' },
  { id: 'floor-oak', name: 'Suelo de madera', category: 'floor', value: 'oak', price: 18, levelRequired: 1, description: 'Tablas claras con acabado mate.' },
  { id: 'floor-checker', name: 'Suelo mosaico', category: 'floor', value: 'checker', price: 20, levelRequired: 2, description: 'Mosaico geométrico de dos tonos.' },
  { id: 'bed-cloud', name: 'Camilla nube', category: 'bed', value: 'cloud', price: 28, levelRequired: 2, description: 'Camilla acolchada con detalles celestes.' },
  { id: 'bed-star', name: 'Camilla estrella', category: 'bed', value: 'star', price: 45, levelRequired: 3, description: 'Una camilla de fantasía con acentos dorados.' },
  { id: 'chair-cloud', name: 'Silla nube', category: 'chair', value: 'cloud', price: 18, levelRequired: 1, description: 'Asiento redondeado y cómodo.' },
  { id: 'chair-lilac', name: 'Silla lila', category: 'chair', value: 'lilac', price: 16, levelRequired: 1, description: 'Una silla tapizada en lila.' },
  { id: 'table-round', name: 'Mesa redonda', category: 'table', value: 'round', price: 16, levelRequired: 1, description: 'Mesa auxiliar de bordes suaves.' },
  { id: 'table-mint', name: 'Mesa menta', category: 'table', value: 'mint', price: 20, levelRequired: 2, description: 'Mesa auxiliar en tonos verdes.' },
  { id: 'plant-tall', name: 'Planta alta', category: 'plant', value: 'tall', price: 12, levelRequired: 1, description: 'Una planta decorativa para dar color.' },
  { id: 'plant-flower', name: 'Planta florecida', category: 'plant', value: 'flower', price: 18, levelRequired: 2, description: 'Flores pastel para el rincón.' },
  { id: 'picture-garden', name: 'Cuadro jardín', category: 'picture', value: 'garden', price: 12, levelRequired: 1, description: 'Una ilustración de hojas y flores.' },
  { id: 'picture-space', name: 'Cuadro estelar', category: 'picture', value: 'space', price: 22, levelRequired: 2, description: 'Un cielo de fantasía enmarcado.' },
  { id: 'light-warm', name: 'Luz cálida', category: 'light', value: 'warm', price: 18, levelRequired: 1, description: 'Iluminación dorada y tenue.' },
  { id: 'light-crystal', name: 'Lámpara cristal', category: 'light', value: 'crystal', price: 35, levelRequired: 3, description: 'Una lámpara decorativa con reflejos suaves.' },
  { id: 'decor-mobile', name: 'Móvil de estrellas', category: 'decor', value: 'mobile', price: 16, levelRequired: 1, description: 'Decoración colgante para mirar y sonreír.' },
  { id: 'decor-clock', name: 'Reloj de flores', category: 'decor', value: 'clock', price: 20, levelRequired: 2, description: 'Un reloj de pared con forma floral.' },
]

export const hospitalCategoryLabels: Record<HospitalItemCategory, string> = {
  wall: 'Paredes',
  floor: 'Suelos',
  bed: 'Camillas',
  chair: 'Sillas',
  table: 'Mesas',
  plant: 'Plantas',
  picture: 'Cuadros',
  light: 'Iluminación',
  decor: 'Decoración',
}

const initialRooms: HospitalRoomId[] = ['reception', 'waiting', 'corridor']
const roomIds: HospitalRoomId[] = ['reception', 'waiting', 'consultation', 'corridor', 'operating', 'recovery']

export function hospitalLevelForExperience(experience: number): number {
  return Math.min(5, 1 + Math.floor(Math.max(0, experience) / 100))
}

export function createInitialHospitalState(experience = 0): HospitalState {
  const decorations = Object.fromEntries(roomIds.map(id => [id, {
    wall: 'wall-mint',
    floor: 'floor-mint',
    bed: 'bed-basic',
    chair: 'chair-basic',
    table: 'table-basic',
    plant: 'plant-basic',
    picture: 'picture-basic',
    light: 'light-soft',
    decor: 'decor-none',
  }])) as HospitalState['decorations']
  return {
    level: hospitalLevelForExperience(experience),
    unlockedRooms: [...initialRooms],
    unlockedItems: [],
    purchases: [],
    roomLevels: Object.fromEntries(initialRooms.map(id => [id, 1])),
    decorations,
    selectedRoom: 'reception',
    coinsSpent: 0,
    careQueue: [],
    claimedMissionIds: [],
    furniture: [],
  }
}

export function successfulSurgeryCount(results: Array<{ outcome: 'SUCCESS' | 'FAILURE' }>): number {
  return results.filter(result => result.outcome === 'SUCCESS').length
}

export function canUnlockHospitalRoom(
  roomId: HospitalRoomId,
  hospital: HospitalState,
  experience: number,
  successfulSurgeries: number,
  coins: number,
): boolean {
  const room = hospitalRooms.find(item => item.id === roomId)
  return Boolean(room && !hospital.unlockedRooms.includes(roomId)
    && hospital.level >= room.levelRequired
    && experience >= room.experienceRequired
    && successfulSurgeries >= room.surgeriesRequired
    && coins >= room.unlockPrice)
}

export function getRoomUpgradeCost(level: number): number {
  return Math.max(1, level) * 40
}

export function canUpgradeHospitalRoom(roomId: HospitalRoomId, hospital: HospitalState, coins: number): boolean {
  if (!hospital.unlockedRooms.includes(roomId)) return false
  const level = hospital.roomLevels[roomId] ?? 1
  return level < 3 && coins >= getRoomUpgradeCost(level)
}

export function canBuyHospitalItem(
  itemId: string,
  roomId: HospitalRoomId,
  hospital: HospitalState,
  coins: number,
): boolean {
  const item = hospitalItems.find(candidate => candidate.id === itemId)
  return Boolean(item && hospital.unlockedRooms.includes(roomId)
    && hospital.level >= item.levelRequired
    && !hospital.unlockedItems.includes(itemId)
    && coins >= item.price)
}

export function hospitalComfortScore(hospital: HospitalState): number {
  const unlocked = hospital.unlockedRooms
  if (!unlocked.length) return 0
  const levels = unlocked.reduce((sum, id) => sum + (hospital.roomLevels[id] ?? 1), 0)
  const decorations = unlocked.reduce((sum, id) => sum + Object.keys(hospital.decorations[id] ?? {}).filter(category => {
    const value = hospital.decorations[id]?.[category as HospitalItemCategory]
    return value !== undefined && !value.endsWith('-basic') && value !== 'decor-none' && value !== 'light-soft' && value !== 'wall-mint' && value !== 'floor-mint'
  }).length, 0)
  return Math.min(100, Math.round(30 + levels * 8 + decorations * 3))
}
