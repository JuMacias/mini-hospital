import type { MedicalProfessional, Role } from '../types'

export const staff: MedicalProfessional[] = [
  { id: 'sofia', name: 'Sofía Reyes', specialty: 'Anestesiología', roles: ['anesthesia'], personality: 'calm', gender: 'doctora', uniform: '#a5b8df', hair: '#49332d', skin: '#bd8065', hairStyle: 'bun', accessory: 'gorra', stats: { precision: 92, speed: 76, calm: 95, experience: 88, teamwork: 90 } },
  { id: 'mateo', name: 'Mateo Cruz', specialty: 'Instrumentación', roles: ['instrument'], personality: 'methodical', gender: 'doctor', uniform: '#83c8ba', hair: '#302521', skin: '#d99c78', hairStyle: 'short', accessory: 'glasses', stats: { precision: 88, speed: 91, calm: 84, experience: 81, teamwork: 93 } },
  { id: 'valentina', name: 'Valentina Ríos', specialty: 'Enfermería', roles: ['circulating'], personality: 'empathetic', gender: 'doctora', uniform: '#d9a2bb', hair: '#49332d', skin: '#f2c6a5', hairStyle: 'long', accessory: 'headband', stats: { precision: 85, speed: 89, calm: 91, experience: 86, teamwork: 96 } },
  { id: 'lucas', name: 'Lucas Vidal', specialty: 'Cirugía asistente', roles: ['assistant'], personality: 'energetic', gender: 'doctor', uniform: '#a69bd0', hair: '#382a24', skin: '#895b49', hairStyle: 'curly', stats: { precision: 94, speed: 86, calm: 82, experience: 92, teamwork: 87 } },
  { id: 'emma', name: 'Emma Torres', specialty: 'Anestesiología', roles: ['anesthesia'], personality: 'empathetic', gender: 'doctora', uniform: '#82c6c2', hair: '#b97843', skin: '#f2c6a5', hairStyle: 'bob', accessory: 'gorra', stats: { precision: 86, speed: 83, calm: 93, experience: 84, teamwork: 89 } },
  { id: 'diego', name: 'Diego Luna', specialty: 'Instrumentación', roles: ['instrument'], personality: 'energetic', gender: 'doctor', uniform: '#a9bee4', hair: '#251e1c', skin: '#bd8065', hairStyle: 'short', stats: { precision: 90, speed: 94, calm: 79, experience: 87, teamwork: 85 } },
  { id: 'ines', name: 'Inés Marín', specialty: 'Enfermería', roles: ['circulating'], personality: 'methodical', gender: 'doctora', uniform: '#d8a6c4', hair: '#47302c', skin: '#d99c78', hairStyle: 'bun', accessory: 'glasses', stats: { precision: 91, speed: 82, calm: 90, experience: 90, teamwork: 92 } },
  { id: 'nicolas', name: 'Nicolás Paz', specialty: 'Cirugía asistente', roles: ['assistant'], personality: 'calm', gender: 'doctor', uniform: '#85cbb2', hair: '#b97843', skin: '#603c33', hairStyle: 'curly', accessory: 'headband', stats: { precision: 87, speed: 92, calm: 85, experience: 83, teamwork: 91 } },
  { id: 'camila', name: 'Camila Sol', specialty: 'Anestesiología', roles: ['anesthesia'], personality: 'methodical', gender: 'doctora', uniform: '#bea8dc', hair: '#251e1c', skin: '#895b49', hairStyle: 'long', stats: { precision: 95, speed: 80, calm: 89, experience: 93, teamwork: 86 } },
  { id: 'julian', name: 'Julián Vega', specialty: 'Instrumentación', roles: ['instrument'], personality: 'empathetic', gender: 'doctor', uniform: '#e5b291', hair: '#382a24', skin: '#f2c6a5', hairStyle: 'bob', accessory: 'gorra', stats: { precision: 84, speed: 88, calm: 92, experience: 80, teamwork: 94 } },
]

export const defaultSelectedStaff = staff.slice(0, 4).map(person => person.id)
export const defaultRoleAssignments: Record<Role, string> = { anesthesia: 'sofia', instrument: 'mateo', circulating: 'valentina', assistant: 'lucas' }
