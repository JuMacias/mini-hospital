import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'
import { defaultRoleAssignments, defaultSelectedStaff } from '../data/staff'
import { preparationTasks } from '../data/preparationTasks'
import { patients } from '../data/patients'
import { applySurgeryAction, canStartSurgery, createInitialSurgeryState, resolveComplication, resumeSurgery, startSurgery } from '../game/SurgeryEngine'
import { migrateDoctorAppearance } from '../game/characterRules'
import { applySurgeryProgress, assignAvailableRoles, calculateTeamFactors, isValidTeam } from '../game/teamRules'
import { staff } from '../data/staff'
import { canGiveConsent, emotionAfterResponse, initialPatientEmotion } from '../game/preopRules'
import {
  canBuyHospitalItem,
  canUnlockHospitalRoom,
  canUpgradeHospitalRoom,
  createInitialHospitalState,
  getRoomUpgradeCost,
  hospitalItems,
  hospitalLevelForExperience,
  hospitalRooms,
  successfulSurgeryCount,
} from '../game/hospitalRules'
import {
  createInitialCareQueue,
  getHospitalMissionProgress,
  hospitalMissions,
  removeHospitalFurniture as removeFurniture,
  transitionPatientCase,
  upsertHospitalFurniture,
} from '../game/hospitalOperations'
import type { AudioPreferences, BleedingIntensity, ConversationEmotion, ConversationEntry, Doctor, HospitalFurniturePlacement, HospitalRoomId, PatientCareStatus, Role, StaffProfile, SurgeryDifficulty, SurgeryResult, SurgeryState } from '../types'

interface GameStore {
  doctor: Doctor | null
  selectedStaff: string[]
  roleAssignments: Partial<Record<Role, string>>
  staffProfiles: Record<string, StaffProfile>
  favoriteTeam: string[]
  saved: { doctor: boolean; team: boolean }
  selectedPatient: string | null
  conversation: ConversationEntry[]
  trust: number
  calm: number
  understanding: number
  patientEmotion: ConversationEmotion
  consent: boolean
  consentDecision: 'pending' | 'accepted' | 'declined'
  completedTasks: string[]
  surgery: SurgeryState
  surgeryHistory: SurgeryResult[]
  experience: number
  rewards: number
  coins: number
  hospital: import('../types').HospitalState
  audioPreferences: AudioPreferences
  setDoctor: (doctor: Doctor) => void
  setSelectedStaff: (ids: string[]) => void
  setRoleAssignments: (assignments: Partial<Record<Role, string>>) => void
  setStaffProfile: (id: string, profile: StaffProfile) => void
  saveFavoriteTeam: () => void
  loadFavoriteTeam: () => void
  save: (section: 'doctor' | 'team') => void
  beginPreop: (patientId: string) => void
  clearPatientSelection: () => void
  respondToPatient: (entry: ConversationEntry) => void
  setConsent: (consent: boolean) => void
  setConsentDecision: (decision: 'pending' | 'accepted' | 'declined') => void
  togglePreparationTask: (taskId: string) => void
  configureSurgery: (difficulty: SurgeryDifficulty, bleedingIntensity: BleedingIntensity) => void
  beginSurgery: () => void
  actInSurgery: (quality: 'good' | 'miss', randomRoll?: number) => void
  resolveSurgeryEvent: (response: 'coordinate' | 'pause', randomRoll?: number) => void
  continueSurgery: () => void
  restartSurgery: () => void
  recordSurgeryResult: (result: SurgeryResult) => void
  setAudioPreferences: (preferences: AudioPreferences) => void
  selectHospitalRoom: (roomId: HospitalRoomId) => void
  purchaseHospitalRoom: (roomId: HospitalRoomId) => boolean
  purchaseHospitalItem: (roomId: HospitalRoomId, itemId: string) => boolean
  installHospitalItem: (roomId: HospitalRoomId, itemId: string) => boolean
  uninstallHospitalItem: (roomId: HospitalRoomId, itemId: string) => boolean
  upgradeHospitalRoom: (roomId: HospitalRoomId) => boolean
  setPatientCareStatus: (patientId: string, status: PatientCareStatus) => boolean
  claimHospitalMission: (missionId: string) => boolean
  placeHospitalFurniture: (placement: HospitalFurniturePlacement) => boolean
  rotateHospitalFurniture: (placementId: string) => boolean
  removeHospitalFurniture: (placementId: string) => boolean
}

const createRunId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
const createInitialPlayerHospital = (experience = 0) => ({
  ...createInitialHospitalState(experience),
  careQueue: createInitialCareQueue(patients.map(patient => patient.id)),
})

function migratedHospital(
  hospital: Partial<import('../types').HospitalState> | undefined,
  experience: number,
): import('../types').HospitalState {
  return {
    ...createInitialPlayerHospital(experience),
    ...hospital,
    careQueue: hospital?.careQueue ?? createInitialCareQueue(patients.map(patient => patient.id)),
    claimedMissionIds: hospital?.claimedMissionIds ?? [],
    furniture: hospital?.furniture ?? [],
  }
}

export function createGameStore(storage: StateStorage | undefined = typeof window === 'undefined' ? undefined : window.localStorage) {
  const persistedStorage = storage ? createJSONStorage(() => storage) : undefined
  return create<GameStore>()(persist((set) => ({
  doctor: null,
  selectedStaff: defaultSelectedStaff,
  roleAssignments: defaultRoleAssignments,
  staffProfiles: {},
  favoriteTeam: [],
  saved: { doctor: false, team: false },
  selectedPatient: null,
  conversation: [],
  trust: 45,
  calm: 45,
  understanding: 0,
  patientEmotion: 'neutral',
  consent: false,
  consentDecision: 'pending',
  completedTasks: [],
  surgery: createInitialSurgeryState(null, 'normal', 'soft', 'initial'),
  surgeryHistory: [],
  experience: 0,
  rewards: 0,
  coins: 0,
  hospital: createInitialPlayerHospital(),
  audioPreferences: { musicVolume: 0.2, effectsVolume: 0.35 },
  setDoctor: (doctor) => set({ doctor, saved: { doctor: false, team: false } }),
  setSelectedStaff: (selectedStaff) => set(state => ['IN_PROGRESS', 'COMPLICATION', 'STABILIZED'].includes(state.surgery.status)
    ? state
    : { selectedStaff, saved: { ...state.saved, team: false } }),
  setRoleAssignments: (roleAssignments) => set(state => ['IN_PROGRESS', 'COMPLICATION', 'STABILIZED'].includes(state.surgery.status)
    ? state
    : { roleAssignments, saved: { ...state.saved, team: false } }),
  setStaffProfile: (id, profile) => set(state => ['IN_PROGRESS', 'COMPLICATION', 'STABILIZED'].includes(state.surgery.status)
    ? state
    : { staffProfiles: { ...state.staffProfiles, [id]: profile }, saved: { ...state.saved, team: false } }),
  saveFavoriteTeam: () => set(state => !['IN_PROGRESS', 'COMPLICATION', 'STABILIZED'].includes(state.surgery.status) && isValidTeam(state.selectedStaff, state.roleAssignments)
    ? { favoriteTeam: [...state.selectedStaff] }
    : state),
  loadFavoriteTeam: () => set(state => ['IN_PROGRESS', 'COMPLICATION', 'STABILIZED'].includes(state.surgery.status) || !isValidTeam(state.favoriteTeam, assignAvailableRoles(state.favoriteTeam))
    ? state
    : {
      selectedStaff: [...state.favoriteTeam],
      roleAssignments: assignAvailableRoles(state.favoriteTeam),
      saved: { ...state.saved, team: false },
    }),
  save: (section) => set(state => ({ saved: { ...state.saved, [section]: true } })),
  beginPreop: (patientId) => set(state => {
    const careQueue = transitionPatientCase(state.hospital.careQueue, patientId, 'consultation') ?? state.hospital.careQueue
    return {
      selectedPatient: patientId,
      conversation: [],
      trust: 45,
      calm: 45,
      understanding: 0,
      patientEmotion: initialPatientEmotion(patients.find(patient => patient.id === patientId)?.emotion ?? 'nervioso'),
      consent: false,
      consentDecision: 'pending',
      completedTasks: [],
      surgery: createInitialSurgeryState(patientId, state.surgery.difficulty, state.surgery.bleedingIntensity, createRunId()),
      hospital: careQueue === state.hospital.careQueue ? state.hospital : { ...state.hospital, careQueue },
    }
  }),
  clearPatientSelection: () => set({
    selectedPatient: null,
    conversation: [],
    trust: 45,
    calm: 45,
    understanding: 0,
    patientEmotion: 'neutral',
    consent: false,
    consentDecision: 'pending',
    completedTasks: [],
  }),
  respondToPatient: (entry) => set(state => {
    const quality = entry.quality ?? (entry.trustDelta < 0 ? 'inappropriate' : entry.trustDelta > 4 ? 'empathetic' : 'incomplete')
    const response = {
      ...entry,
      id: entry.id ?? `${state.selectedPatient ?? 'patient'}-${state.conversation.length + 1}-${entry.questionId}`,
      quality,
      createdAt: entry.createdAt ?? Date.now(),
    }
    return {
      conversation: [...state.conversation, response],
      trust: Math.max(0, Math.min(100, state.trust + entry.trustDelta)),
      calm: Math.max(0, Math.min(100, state.calm + entry.calmDelta)),
      understanding: Math.max(0, Math.min(100, state.understanding + (entry.comprehensionDelta ?? 0))),
      patientEmotion: entry.emotionAfter ?? emotionAfterResponse(state.patientEmotion, quality, entry.questionId),
      consent: false,
      consentDecision: 'pending',
    }
  }),
  setConsent: (consent) => set(state => consent && !canGiveConsent(state.conversation, state.understanding)
    ? state
    : { consent, consentDecision: consent ? 'accepted' : 'declined' }),
  setConsentDecision: (decision) => set(state => {
    if (decision === 'pending') {
      const careQueue = state.selectedPatient
        ? transitionPatientCase(state.hospital.careQueue, state.selectedPatient, 'consultation') ?? state.hospital.careQueue
        : state.hospital.careQueue
      return {
        consent: false,
        consentDecision: decision,
        hospital: careQueue === state.hospital.careQueue ? state.hospital : { ...state.hospital, careQueue },
      }
    }
    if (decision === 'declined') {
      const careQueue = state.selectedPatient
        ? transitionPatientCase(state.hospital.careQueue, state.selectedPatient, 'declined') ?? state.hospital.careQueue
        : state.hospital.careQueue
      return {
        consent: false,
        consentDecision: decision,
        hospital: careQueue === state.hospital.careQueue ? state.hospital : { ...state.hospital, careQueue },
      }
    }
    if (!canGiveConsent(state.conversation, state.understanding)) return state
    return { consent: true, consentDecision: decision }
  }),
  togglePreparationTask: (taskId) => set(state => ({
    completedTasks: state.completedTasks.includes(taskId)
      ? state.completedTasks.filter(id => id !== taskId)
      : [...state.completedTasks, taskId],
  })),
  configureSurgery: (difficulty, bleedingIntensity) => set(state => state.surgery.status === 'READY'
    ? { surgery: { ...state.surgery, difficulty, bleedingIntensity } }
    : state),
  beginSurgery: () => set(state => state.surgery.status === 'READY' && canStartSurgery(state.consent, state.completedTasks, preparationTasks) && isValidTeam(state.selectedStaff, state.roleAssignments)
    ? {
      surgery: {
        ...startSurgery(createInitialSurgeryState(state.selectedPatient, state.surgery.difficulty, state.surgery.bleedingIntensity, createRunId())),
        teamPerformance: calculateTeamFactors(state.selectedStaff, state.staffProfiles, staff).performance,
      },
      hospital: state.selectedPatient
        ? {
          ...state.hospital,
          careQueue: transitionPatientCase(state.hospital.careQueue, state.selectedPatient, 'surgery') ?? state.hospital.careQueue,
        }
        : state.hospital,
    }
    : state),
  actInSurgery: (quality, randomRoll) => set(state => ({ surgery: applySurgeryAction(state.surgery, quality, randomRoll) })),
  resolveSurgeryEvent: (response, randomRoll) => set(state => ({ surgery: resolveComplication(state.surgery, response, randomRoll) })),
  continueSurgery: () => set(state => ({ surgery: resumeSurgery(state.surgery) })),
  restartSurgery: () => set(state => ({
    surgery: createInitialSurgeryState(state.selectedPatient, state.surgery.difficulty, state.surgery.bleedingIntensity, createRunId()),
  })),
  recordSurgeryResult: (result) => set(state => {
    if (state.surgeryHistory.some(item => item.id === result.id)) return state
    const experience = state.experience + result.experience
    return {
      surgeryHistory: [result, ...state.surgeryHistory],
      experience,
      rewards: state.rewards + result.reward,
      coins: state.coins + result.reward,
      hospital: {
        ...state.hospital,
        level: hospitalLevelForExperience(experience),
        careQueue: transitionPatientCase(
          state.hospital.careQueue,
          result.patientId,
          result.outcome === 'SUCCESS' ? 'recovery' : 'failed',
        ) ?? state.hospital.careQueue,
      },
      staffProfiles: applySurgeryProgress(state.staffProfiles, state.selectedStaff, result),
    }
  }),
  setAudioPreferences: (audioPreferences) => set({ audioPreferences }),
  selectHospitalRoom: (selectedRoom) => set(state => ({ hospital: { ...state.hospital, selectedRoom } })),
  purchaseHospitalRoom: (roomId) => {
    let purchased = false
    set(state => {
      const room = hospitalRooms.find(item => item.id === roomId)
      if (!room || ['IN_PROGRESS', 'COMPLICATION', 'STABILIZED'].includes(state.surgery.status)
        || !canUnlockHospitalRoom(roomId, state.hospital, state.experience, successfulSurgeryCount(state.surgeryHistory), state.coins)) return state
      purchased = true
      const defaults = createInitialHospitalState(state.experience)
      return {
        coins: state.coins - room.unlockPrice,
        hospital: {
          ...state.hospital,
          unlockedRooms: [...state.hospital.unlockedRooms, roomId],
          roomLevels: { ...state.hospital.roomLevels, [roomId]: 1 },
          decorations: { ...state.hospital.decorations, [roomId]: defaults.decorations[roomId] },
          selectedRoom: roomId,
          purchases: [...state.hospital.purchases, `room:${roomId}`],
          coinsSpent: state.hospital.coinsSpent + room.unlockPrice,
        },
      }
    })
    return purchased
  },
  purchaseHospitalItem: (roomId, itemId) => {
    let purchased = false
    set(state => {
      const item = hospitalItems.find(candidate => candidate.id === itemId)
      if (!item || ['IN_PROGRESS', 'COMPLICATION', 'STABILIZED'].includes(state.surgery.status)
        || !canBuyHospitalItem(itemId, roomId, state.hospital, state.coins)) return state
      purchased = true
      return {
        coins: state.coins - item.price,
        hospital: {
          ...state.hospital,
          unlockedItems: [...state.hospital.unlockedItems, itemId],
          purchases: [...state.hospital.purchases, `item:${itemId}`],
          decorations: {
            ...state.hospital.decorations,
            [roomId]: { ...state.hospital.decorations[roomId], [item.category]: itemId },
          },
          coinsSpent: state.hospital.coinsSpent + item.price,
        },
      }
    })
    return purchased
  },
  installHospitalItem: (roomId, itemId) => {
    let installed = false
    set(state => {
      const item = hospitalItems.find(candidate => candidate.id === itemId)
      if (!item || ['IN_PROGRESS', 'COMPLICATION', 'STABILIZED'].includes(state.surgery.status)
        || !state.hospital.unlockedRooms.includes(roomId)
        || !state.hospital.unlockedItems.includes(itemId)) return state
      installed = true
      return {
        hospital: {
          ...state.hospital,
          selectedRoom: roomId,
          decorations: {
            ...state.hospital.decorations,
            [roomId]: { ...state.hospital.decorations[roomId], [item.category]: itemId },
          },
        },
      }
    })
    return installed
  },
  uninstallHospitalItem: (roomId, itemId) => {
    let uninstalled = false
    set(state => {
      const item = hospitalItems.find(candidate => candidate.id === itemId)
      const defaults: Record<string, string> = {
        wall: 'wall-mint', floor: 'floor-mint', bed: 'bed-basic', chair: 'chair-basic',
        table: 'table-basic', plant: 'plant-basic', picture: 'picture-basic', light: 'light-soft', decor: 'decor-none',
      }
      if (!item || ['IN_PROGRESS', 'COMPLICATION', 'STABILIZED'].includes(state.surgery.status)
        || !state.hospital.unlockedRooms.includes(roomId)
        || state.hospital.decorations[roomId]?.[item.category] !== itemId) return state
      uninstalled = true
      return {
        hospital: {
          ...state.hospital,
          furniture: state.hospital.furniture.filter(placement => !(placement.roomId === roomId && placement.itemId === itemId)),
          decorations: {
            ...state.hospital.decorations,
            [roomId]: { ...state.hospital.decorations[roomId], [item.category]: defaults[item.category] },
          },
        },
      }
    })
    return uninstalled
  },
  upgradeHospitalRoom: (roomId) => {
    let upgraded = false
    set(state => {
      if (['IN_PROGRESS', 'COMPLICATION', 'STABILIZED'].includes(state.surgery.status)
        || !canUpgradeHospitalRoom(roomId, state.hospital, state.coins)) return state
      const level = state.hospital.roomLevels[roomId] ?? 1
      const cost = getRoomUpgradeCost(level)
      upgraded = true
      return {
        coins: state.coins - cost,
        hospital: {
          ...state.hospital,
          roomLevels: { ...state.hospital.roomLevels, [roomId]: level + 1 },
          purchases: [...state.hospital.purchases, `upgrade:${roomId}:${level + 1}`],
          coinsSpent: state.hospital.coinsSpent + cost,
        },
      }
    })
    return upgraded
  },
  setPatientCareStatus: (patientId, status) => {
    let updated = false
    set(state => {
      const careQueue = transitionPatientCase(state.hospital.careQueue, patientId, status)
      if (!careQueue) return state
      updated = true
      return { hospital: { ...state.hospital, careQueue } }
    })
    return updated
  },
  claimHospitalMission: (missionId) => {
    let claimed = false
    set(state => {
      const mission = hospitalMissions.find(item => item.id === missionId)
      if (!mission || state.hospital.claimedMissionIds.includes(missionId)) return state
      const progress = getHospitalMissionProgress(missionId, {
        careQueue: state.hospital.careQueue,
        surgeryCount: state.surgeryHistory.length,
        roomLevels: state.hospital.roomLevels,
        teamIsValid: isValidTeam(state.selectedStaff, state.roleAssignments),
      })
      if (progress < mission.target) return state
      claimed = true
      return {
        coins: state.coins + mission.reward,
        hospital: { ...state.hospital, claimedMissionIds: [...state.hospital.claimedMissionIds, missionId] },
      }
    })
    return claimed
  },
  placeHospitalFurniture: (placement) => {
    let placed = false
    set(state => {
      if (['IN_PROGRESS', 'COMPLICATION', 'STABILIZED'].includes(state.surgery.status)
        || !state.hospital.unlockedItems.includes(placement.itemId)) return state
      const hospital = upsertHospitalFurniture(state.hospital, placement)
      if (!hospital) return state
      placed = true
      return { hospital }
    })
    return placed
  },
  rotateHospitalFurniture: (placementId) => {
    let rotated = false
    set(state => {
      const placement = state.hospital.furniture.find(item => item.id === placementId)
      if (!placement || ['IN_PROGRESS', 'COMPLICATION', 'STABILIZED'].includes(state.surgery.status)) return state
      rotated = true
      return {
        hospital: {
          ...state.hospital,
          furniture: state.hospital.furniture.map(item =>
            item.id === placementId ? { ...item, rotation: (item.rotation + 45) % 360 } : item,
          ),
        },
      }
    })
    return rotated
  },
  removeHospitalFurniture: (placementId) => {
    let removed = false
    set(state => {
      if (['IN_PROGRESS', 'COMPLICATION', 'STABILIZED'].includes(state.surgery.status)) return state
      const hospital = removeFurniture(state.hospital, placementId)
      if (!hospital) return state
      removed = true
      return { hospital }
    })
    return removed
  },
  }), {
    name: 'mini-hospital-save',
    version: 6,
    migrate: (persistedState, version) => {
      const state = persistedState as Partial<GameStore>
      const migrated = version < 2
        ? { ...state, doctor: migrateDoctorAppearance(state.doctor ?? null) }
        : state
      const withTeam = version < 3
        ? { ...migrated, staffProfiles: {}, favoriteTeam: [] }
        : { ...migrated, staffProfiles: migrated.staffProfiles ?? {}, favoriteTeam: migrated.favoriteTeam ?? [] }
      if (version >= 5) return {
        ...withTeam,
        coins: withTeam.coins ?? withTeam.rewards ?? 0,
        hospital: migratedHospital(withTeam.hospital, withTeam.experience ?? 0),
      }
      const conversation = (withTeam.conversation ?? []).map(entry => ({
        ...entry,
        comprehensionDelta: entry.comprehensionDelta ?? (entry.trustDelta >= 8 ? 16 : entry.trustDelta < 0 ? -2 : 3),
      }))
      const savedPatient = patients.find(patient => patient.id === withTeam.selectedPatient)
      return {
        ...withTeam,
        conversation,
        understanding: withTeam.understanding ?? (withTeam.consent ? 65 : conversation.reduce((total, entry) => total + (entry.comprehensionDelta ?? 0), 0)),
        patientEmotion: withTeam.patientEmotion ?? (savedPatient ? initialPatientEmotion(savedPatient.emotion) : 'neutral'),
        consentDecision: withTeam.consentDecision ?? (withTeam.consent ? 'accepted' : 'pending'),
        coins: withTeam.coins ?? withTeam.rewards ?? 0,
        hospital: migratedHospital(withTeam.hospital, withTeam.experience ?? 0),
      }
    },
    ...(persistedStorage ? { storage: persistedStorage } : {}),
  }))
}

export const useGameStore = createGameStore()
