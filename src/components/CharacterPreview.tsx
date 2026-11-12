import { Sparkles } from 'lucide-react'
import type { CharacterAnimation, CharacterAppearance, Doctor } from '../types'
import { CharacterRenderer } from './CharacterRenderer'

interface CharacterPreviewProps {
  doctor: Doctor
  appearance: CharacterAppearance
  celebration: number
}

export function CharacterPreview({ doctor, appearance, celebration }: CharacterPreviewProps) {
  const animation: CharacterAnimation = celebration > 0 ? 'happy' : 'idle'
  return <section className={`creator-preview-panel ${celebration ? 'creator-celebrating' : ''}`}>
    <div className="creator-preview-stage">
      <div className="creator-halo" />
      <div className="creator-floor" />
      <div key={celebration} className="creator-full-character">
        <CharacterRenderer appearance={appearance} gender={doctor.gender} variant="full" animation={animation} />
      </div>
      <div className="creator-preview-spark spark-one"><Sparkles size={18} /></div>
      <div className="creator-preview-spark spark-two"><Sparkles size={12} /></div>
      <span className="creator-preview-label">VISTA PREVIA · EN VIVO</span>
    </div>
    <div className="creator-preview-caption">
      <span>{doctor.name || 'Tu personaje'}</span>
      <small>{doctor.gender === 'doctor' ? 'DOCTOR PRINCIPAL' : 'DOCTORA PRINCIPAL'}</small>
    </div>
  </section>
}
