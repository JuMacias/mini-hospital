export type HairStyle =
  | 'short' | 'long' | 'curly' | 'bob' | 'bun' | 'ponytail'
  | 'braids' | 'wavy' | 'pixie' | 'afro' | 'side-part' | 'spiky'

export type FaceShape = 'round' | 'oval' | 'heart' | 'square'
export type EyeStyle = 'round' | 'almond' | 'sleepy' | 'sparkle'
export type BrowStyle = 'soft' | 'arched' | 'straight' | 'bold'
export type ExpressionStyle = 'smile' | 'calm' | 'surprised' | 'cheerful'
export type NoseStyle = 'dot' | 'small' | 'button'
export type MouthStyle = 'smile' | 'soft' | 'open'
export type HatStyle = 'none' | 'surgical' | 'patterned' | 'headband' | 'beanie'
export type GlassesStyle = 'none' | 'round' | 'square' | 'cat-eye' | 'aviator'
export type BeardStyle = 'none' | 'stubble' | 'mustache' | 'beard' | 'goatee'
export type UniformStyle = 'coat' | 'scrubs' | 'jacket'

export interface CharacterAppearance {
  skin: string
  eyes: string
  faceShape: FaceShape
  eyeStyle: EyeStyle
  eyebrowStyle: BrowStyle
  expression: ExpressionStyle
  noseStyle: NoseStyle
  mouthStyle: MouthStyle
  hair: string
  hairStyle: HairStyle
  hatStyle: HatStyle
  hatColor: string
  hatPattern: string
  glassesStyle: GlassesStyle
  glassesColor: string
  beardStyle: BeardStyle
  beardColor: string
  uniformStyle: UniformStyle
  uniform: string
  shoeColor: string
  mask: boolean
  stethoscope: boolean
}
