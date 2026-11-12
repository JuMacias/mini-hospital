import type { CharacterAnimation, CharacterAppearance } from '../types'
import { resolveCharacterAppearance } from '../game/characterRules'
import { CharacterRenderer } from './CharacterRenderer'
import './Avatar.css'

interface AvatarProps extends Partial<CharacterAppearance> {
  customization?: Partial<CharacterAppearance>
  color: string
  hair: string
  skin: string
  accessory?: string
  gender?: 'doctor' | 'doctora'
  motion?: CharacterAnimation
  large?: boolean
  className?: string
}

export function Avatar(props: AvatarProps) {
  const { color, hair, skin, accessory, gender = 'doctora', motion = 'idle', large = false, className = '', customization = {}, ...visualOptions } = props
  const appearance = resolveCharacterAppearance({ ...visualOptions, ...customization, skin, hair, uniform: color, accessory, gender })
  return <div aria-hidden="true" data-gender={gender} className={`avatar ${large ? 'avatar-large' : ''} ${className}`}>
    <CharacterRenderer appearance={appearance} gender={gender} variant="portrait" animation={motion} />
  </div>
}
