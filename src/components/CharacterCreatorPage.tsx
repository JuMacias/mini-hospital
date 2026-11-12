import { useState } from 'react'
import { ArrowLeft, Check, Heart, Shuffle } from 'lucide-react'
import type { CharacterAppearance, Doctor } from '../types'
import { optionsByCategory, type AppearanceOption, type CustomizationCategory } from '../game/CharacterOptions'
import { applyCharacterOption, legacyAccessoryFor, randomizeCharacter, resolveCharacterAppearance } from '../game/characterRules'
import { CharacterPreview } from './CharacterPreview'
import { CustomizationCategories } from './CustomizationCategories'
import { CustomizationGrid } from './CustomizationGrid'
import './CharacterCreatorPage.css'
import './CharacterCreatorPageResponsive.css'

interface CharacterCreatorPageProps {
  doctor: Doctor
  saved: boolean
  onChange: (doctor: Doctor) => void
  onBack: () => void
  onSave: () => void
}

const categoryTitles: Record<CustomizationCategory, string> = {
  face: 'Rostro',
  skin: 'Tono de piel',
  hair: 'Cabello',
  hat: 'Gorros y diseños',
  glasses: 'Gafas',
  beard: 'Barba y bigote',
  uniform: 'Uniforme y accesorios',
}

export function CharacterCreatorPage({ doctor, saved, onChange, onBack, onSave }: CharacterCreatorPageProps) {
  const [category, setCategory] = useState<CustomizationCategory>('face')
  const [celebration, setCelebration] = useState(0)
  const appearance: CharacterAppearance = resolveCharacterAppearance(doctor)
  const selectOption = (option: AppearanceOption) => {
    const updated = applyCharacterOption(appearance, option)
    onChange({ ...doctor, ...updated, accessory: legacyAccessoryFor(updated) })
  }
  const randomize = () => onChange(randomizeCharacter(doctor))
  const save = () => {
    setCelebration(value => value + 1)
    onSave()
  }
  const visibleCount = optionsByCategory[category].length
  return <section className="page character-creator-page">
    <header className="creator-header">
      <div className="creator-brand"><span className="creator-brand-mark"><Heart size={20} fill="white" /></span><span>mini<b>hospital</b></span></div>
      <div className="creator-heading"><div className="eyebrow">TU IDENTIDAD, TU ESTILO</div><h1>Personalización del personaje</h1></div>
      <div className="creator-header-controls">
        <label className="creator-name"><span>Nombre</span><input aria-label="Nombre del personaje" maxLength={24} value={doctor.name} onChange={event => onChange({ ...doctor, name: event.target.value })} /></label>
        <div className="creator-gender" role="group" aria-label="Tipo de personaje">
          <button type="button" className={doctor.gender === 'doctora' ? 'gender-selected' : ''} aria-pressed={doctor.gender === 'doctora'} onClick={() => onChange({ ...doctor, gender: 'doctora' })}>Doctora</button>
          <button type="button" className={doctor.gender === 'doctor' ? 'gender-selected' : ''} aria-pressed={doctor.gender === 'doctor'} onClick={() => onChange({ ...doctor, gender: 'doctor' })}>Doctor</button>
        </div>
      </div>
    </header>
    <div className="creator-layout">
      <CharacterPreview doctor={doctor} appearance={appearance} celebration={celebration} />
      <CustomizationCategories active={category} onChange={setCategory} />
      <section className="creator-options-panel">
        <div className="creator-options-header"><div><span className="creator-options-kicker">ELIGE TU ESTILO</span><h2>{categoryTitles[category]}</h2></div><span className="creator-option-count">{visibleCount} opciones</span></div>
        <CustomizationGrid category={category} appearance={appearance} onSelect={selectOption} />
      </section>
    </div>
    <footer className="creator-footer">
      <button type="button" className="creator-back" onClick={onBack}><ArrowLeft size={17} /> Volver</button>
      <div className="creator-footer-actions">
        <span className={`creator-saved-status ${saved ? 'is-saved' : ''}`}>{saved ? <><Check size={14} /> Guardado</> : 'Cambios guardados al instante'}</span>
        <button type="button" className="creator-random" onClick={randomize}><Shuffle size={16} /> Aleatorio</button>
        <button type="button" className="creator-save" onClick={save}><Check size={17} /> Guardar personaje</button>
      </div>
    </footer>
  </section>
}
