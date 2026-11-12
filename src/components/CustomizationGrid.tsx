import { Check } from 'lucide-react'
import type { CharacterAppearance } from '../game/characterTypes'
import { optionsByCategory, type AppearanceOption, type CustomizationCategory } from '../game/CharacterOptions'
import { applyCharacterOption } from '../game/characterRules'
import { CharacterRenderer } from './CharacterRenderer'

const groupTitles: Record<AppearanceOption['field'], string> = {
  skin: 'Tonos de piel',
  eyes: 'Color de ojos',
  faceShape: 'Forma del rostro',
  eyeStyle: 'Estilo de ojos',
  eyebrowStyle: 'Cejas',
  expression: 'Expresión',
  noseStyle: 'Nariz',
  mouthStyle: 'Boca',
  hair: 'Color de cabello',
  hairStyle: 'Peinado',
  hatStyle: 'Tipo de gorro',
  hatColor: 'Color del gorro',
  hatPattern: 'Diseño del gorro',
  glassesStyle: 'Montura',
  glassesColor: 'Color de montura',
  beardStyle: 'Estilo',
  beardColor: 'Color',
  uniformStyle: 'Tipo de uniforme',
  uniform: 'Color de uniforme',
  shoeColor: 'Zapatos',
  mask: 'Mascarilla',
  stethoscope: 'Accesorios',
}

interface CustomizationGridProps {
  category: CustomizationCategory
  appearance: CharacterAppearance
  onSelect: (option: AppearanceOption) => void
}

export function CustomizationGrid({ category, appearance, onSelect }: CustomizationGridProps) {
  const options = optionsByCategory[category]
  const fields = [...new Set(options.map(option => option.field))]
  return <div className="creator-options-scroll">
    {fields.map(field => {
      const fieldOptions = options.filter(option => option.field === field)
      return <section className="creator-option-group" key={field}>
        <div className="creator-option-heading"><h3>{groupTitles[field]}</h3><span>{fieldOptions.length}</span></div>
        <div className="creator-option-grid">{fieldOptions.map(option => {
          const selected = appearance[option.field] === option.value
          const thumbnail = applyCharacterOption(appearance, option)
          return <button
            type="button"
            className={`creator-option ${selected ? 'option-selected' : ''}`}
            key={option.id}
            aria-label={option.label}
            aria-pressed={selected}
            onClick={() => onSelect(option)}
          >
            <span className="option-character"><CharacterRenderer appearance={thumbnail} variant="full" animate={false} /></span>
            {option.color && <span className="option-color" style={{ backgroundColor: option.color }} />}
            <span className="option-label">{option.label}</span>
            {selected && <span className="option-check"><Check size={12} strokeWidth={3} /></span>}
          </button>
        })}</div>
      </section>
    })}
  </div>
}
