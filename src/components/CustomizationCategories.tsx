import { Glasses, HatGlasses, Scissors, Shirt, Smile, UserRound, VenetianMask, type LucideIcon } from 'lucide-react'
import type { CustomizationCategory } from '../game/CharacterOptions'

const categories: Array<{ id: CustomizationCategory; label: string; icon: LucideIcon; tone: string }> = [
  { id: 'face', label: 'Rostro', icon: Smile, tone: 'violet' },
  { id: 'skin', label: 'Piel', icon: UserRound, tone: 'peach' },
  { id: 'hair', label: 'Cabello', icon: Scissors, tone: 'pink' },
  { id: 'hat', label: 'Gorro', icon: HatGlasses, tone: 'orange' },
  { id: 'glasses', label: 'Gafas', icon: Glasses, tone: 'blue' },
  { id: 'beard', label: 'Barba', icon: VenetianMask, tone: 'lilac' },
  { id: 'uniform', label: 'Uniforme', icon: Shirt, tone: 'mint' },
]

interface CustomizationCategoriesProps {
  active: CustomizationCategory
  onChange: (category: CustomizationCategory) => void
}

export function CustomizationCategories({ active, onChange }: CustomizationCategoriesProps) {
  return <nav className="creator-categories" aria-label="Categorías de personalización">
    {categories.map(({ id, label, icon: Icon, tone }) => <button
      type="button"
      key={id}
      className={`creator-category ${active === id ? 'category-active' : ''}`}
      aria-pressed={active === id}
      onClick={() => onChange(id)}
    ><span className={`category-icon tone-${tone}`}><Icon size={22} strokeWidth={2.2} /></span><span>{label}</span></button>)}
  </nav>
}
