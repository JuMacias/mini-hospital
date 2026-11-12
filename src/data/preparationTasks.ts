import type { PreparationTask } from '../types'

export const preparationTasks: PreparationTask[] = [
  { id: 'bed', title: 'Preparar la camilla', description: 'Acomodar sábanas limpias y suaves.', icon: '🛏️' },
  { id: 'instruments', title: 'Organizar instrumental', description: 'Ordenar herramientas de fantasía.', icon: '🧰' },
  { id: 'monitor', title: 'Revisar el monitor', description: 'Comprobar que la pantalla esté lista.', icon: '📟' },
  { id: 'materials', title: 'Preparar materiales', description: 'Dejar los materiales estériles a mano.', icon: '🧴' },
  { id: 'lights', title: 'Verificar iluminación', description: 'Encender las lámparas del quirófano.', icon: '💡' },
  { id: 'safety', title: 'Lista de seguridad', description: 'Confirmar en equipo que todo esté preparado.', icon: '✅' },
]
