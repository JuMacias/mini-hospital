import type { CharacterAppearance } from './characterTypes'

export type AppearanceField = keyof CharacterAppearance
export type AppearanceValue = CharacterAppearance[AppearanceField]
export type CustomizationCategory = 'face' | 'skin' | 'hair' | 'hat' | 'glasses' | 'beard' | 'uniform'

export interface AppearanceOption {
  id: string
  label: string
  field: AppearanceField
  value: AppearanceValue
  color?: string
}

const options = (field: AppearanceField, values: Array<{ value: AppearanceValue; label: string; color?: string }>): AppearanceOption[] =>
  values.map(({ value, label, color }) => ({ id: `${field}-${String(value)}`, field, value, label, color }))

export const skinOptions = options('skin', [
  { value: '#fbe0c9', label: 'Marfil cálido', color: '#fbe0c9' },
  { value: '#f2c6a5', label: 'Durazno', color: '#f2c6a5' },
  { value: '#e5ad87', label: 'Miel', color: '#e5ad87' },
  { value: '#d99c78', label: 'Dorado', color: '#d99c78' },
  { value: '#bd8065', label: 'Canela', color: '#bd8065' },
  { value: '#a66f57', label: 'Bronce', color: '#a66f57' },
  { value: '#895b49', label: 'Cacao', color: '#895b49' },
  { value: '#603c33', label: 'Ébano cálido', color: '#603c33' },
])

export const hairColorOptions = options('hair', [
  { value: '#201b1a', label: 'Negro', color: '#201b1a' },
  { value: '#251e1c', label: 'Negro suave', color: '#251e1c' },
  { value: '#382a24', label: 'Castaño oscuro', color: '#382a24' },
  { value: '#302521', label: 'Castaño espresso', color: '#302521' },
  { value: '#47302c', label: 'Castaño clásico', color: '#47302c' },
  { value: '#49332d', label: 'Castaño nogal', color: '#49332d' },
  { value: '#604232', label: 'Castaño', color: '#604232' },
  { value: '#8b5333', label: 'Castaño claro', color: '#8b5333' },
  { value: '#b97843', label: 'Caramelo', color: '#b97843' },
  { value: '#d4ad54', label: 'Rubio miel', color: '#d4ad54' },
  { value: '#ecd18c', label: 'Rubio claro', color: '#ecd18c' },
  { value: '#b85b62', label: 'Rosa cereza', color: '#b85b62' },
  { value: '#9063aa', label: 'Lila', color: '#9063aa' },
  { value: '#4e9a98', label: 'Turquesa', color: '#4e9a98' },
])

export const eyeColorOptions = options('eyes', [
  { value: '#3e332f', label: 'Café', color: '#3e332f' },
  { value: '#705b47', label: 'Avellana tostado', color: '#705b47' },
  { value: '#536d69', label: 'Verde gris', color: '#536d69' },
  { value: '#5687a3', label: 'Azul', color: '#5687a3' },
  { value: '#72936e', label: 'Verde', color: '#72936e' },
  { value: '#896b48', label: 'Avellana', color: '#896b48' },
  { value: '#695e91', label: 'Violeta', color: '#695e91' },
])

export const faceOptions = [
  ...options('faceShape', [
    { value: 'round', label: 'Redonda' },
    { value: 'oval', label: 'Ovalada' },
    { value: 'heart', label: 'Corazón' },
    { value: 'square', label: 'Suave cuadrada' },
  ]),
  ...options('eyeStyle', [
    { value: 'round', label: 'Ojos redondos' },
    { value: 'almond', label: 'Ojos almendrados' },
    { value: 'sleepy', label: 'Ojos serenos' },
    { value: 'sparkle', label: 'Ojos brillantes' },
  ]),
  ...options('eyebrowStyle', [
    { value: 'soft', label: 'Cejas suaves' },
    { value: 'arched', label: 'Cejas arqueadas' },
    { value: 'straight', label: 'Cejas rectas' },
    { value: 'bold', label: 'Cejas marcadas' },
  ]),
  ...options('expression', [
    { value: 'smile', label: 'Sonriente' },
    { value: 'calm', label: 'Tranquila' },
    { value: 'surprised', label: 'Sorprendida' },
    { value: 'cheerful', label: 'Alegre' },
  ]),
  ...options('noseStyle', [
    { value: 'dot', label: 'Nariz pequeña' },
    { value: 'small', label: 'Nariz suave' },
    { value: 'button', label: 'Nariz redonda' },
  ]),
  ...options('mouthStyle', [
    { value: 'smile', label: 'Sonrisa' },
    { value: 'soft', label: 'Boca tranquila' },
    { value: 'open', label: 'Risa abierta' },
  ]),
  ...eyeColorOptions,
]

export const hairStyleOptions = options('hairStyle', [
  { value: 'short', label: 'Corto clásico' },
  { value: 'long', label: 'Largo' },
  { value: 'curly', label: 'Rizado' },
  { value: 'bob', label: 'Bob' },
  { value: 'bun', label: 'Moño' },
  { value: 'ponytail', label: 'Cola alta' },
  { value: 'braids', label: 'Trenzas' },
  { value: 'wavy', label: 'Ondulado' },
  { value: 'pixie', label: 'Pixie' },
  { value: 'afro', label: 'Afro' },
  { value: 'side-part', label: 'Raya al lado' },
  { value: 'spiky', label: 'Despeinado' },
])

export const hatOptions = [
  ...options('hatStyle', [
    { value: 'none', label: 'Sin gorro' },
    { value: 'surgical', label: 'Gorro quirúrgico' },
    { value: 'patterned', label: 'Gorro estampado' },
    { value: 'headband', label: 'Vincha' },
    { value: 'beanie', label: 'Gorro tejido' },
  ]),
  ...options('hatColor', [
    { value: '#ffffff', label: 'Blanco', color: '#ffffff' },
    { value: '#63c9bd', label: 'Turquesa', color: '#63c9bd' },
    { value: '#88a9df', label: 'Azul', color: '#88a9df' },
    { value: '#b7a0d8', label: 'Lila', color: '#b7a0d8' },
    { value: '#e7a3b6', label: 'Rosa', color: '#e7a3b6' },
    { value: '#f2b66d', label: 'Naranja', color: '#f2b66d' },
  ]),
  ...options('hatPattern', [
    { value: 'solid', label: 'Liso' },
    { value: 'dots', label: 'Lunares' },
    { value: 'crosses', label: 'Cruces' },
    { value: 'stars', label: 'Estrellas' },
  ]),
]

export const glassesOptions = [
  ...options('glassesStyle', [
    { value: 'none', label: 'Sin gafas' },
    { value: 'round', label: 'Redondas' },
    { value: 'square', label: 'Cuadradas' },
    { value: 'cat-eye', label: 'Gato' },
    { value: 'aviator', label: 'Aviador' },
  ]),
  ...options('glassesColor', [
    { value: '#574136', label: 'Marrón', color: '#574136' },
    { value: '#293b50', label: 'Azul noche', color: '#293b50' },
    { value: '#c95b68', label: 'Coral', color: '#c95b68' },
    { value: '#73569d', label: 'Violeta', color: '#73569d' },
    { value: '#687e78', label: 'Verde gris', color: '#687e78' },
  ]),
]

export const beardOptions = [
  ...options('beardStyle', [
    { value: 'none', label: 'Sin barba' },
    { value: 'stubble', label: 'Sombra suave' },
    { value: 'mustache', label: 'Bigote' },
    { value: 'beard', label: 'Barba corta' },
    { value: 'goatee', label: 'Candado' },
  ]),
  ...options('beardColor', [
    { value: '#201b1a', label: 'Negro', color: '#201b1a' },
    { value: '#382a24', label: 'Castaño oscuro', color: '#382a24' },
    { value: '#8b5333', label: 'Castaño claro', color: '#8b5333' },
    { value: '#b7a58d', label: 'Canoso', color: '#b7a58d' },
  ]),
]

export const uniformOptions = [
  ...options('uniformStyle', [
    { value: 'coat', label: 'Bata médica' },
    { value: 'scrubs', label: 'Uniforme quirúrgico' },
    { value: 'jacket', label: 'Chaqueta clínica' },
  ]),
  ...options('uniform', [
    { value: '#63c9bd', label: 'Verde quirúrgico', color: '#63c9bd' },
    { value: '#88a9df', label: 'Azul cielo', color: '#88a9df' },
    { value: '#b7a0d8', label: 'Lila suave', color: '#b7a0d8' },
    { value: '#e7a3b6', label: 'Rosa pastel', color: '#e7a3b6' },
    { value: '#f2b66d', label: 'Naranja suave', color: '#f2b66d' },
    { value: '#f4f4ef', label: 'Blanco', color: '#f4f4ef' },
    { value: '#4d8790', label: 'Verde petróleo', color: '#4d8790' },
    { value: '#a5b8df', label: 'Azul lavanda', color: '#a5b8df' },
    { value: '#83c8ba', label: 'Menta clara', color: '#83c8ba' },
    { value: '#d9a2bb', label: 'Rosa malva', color: '#d9a2bb' },
    { value: '#a69bd0', label: 'Lila medio', color: '#a69bd0' },
    { value: '#82c6c2', label: 'Turquesa suave', color: '#82c6c2' },
    { value: '#a9bee4', label: 'Azul nube', color: '#a9bee4' },
    { value: '#d8a6c4', label: 'Rosa orquídea', color: '#d8a6c4' },
    { value: '#85cbb2', label: 'Verde agua', color: '#85cbb2' },
    { value: '#bea8dc', label: 'Violeta pastel', color: '#bea8dc' },
    { value: '#e5b291', label: 'Durazno', color: '#e5b291' },
    { value: '#edb4c8', label: 'Rosa paciente', color: '#edb4c8' },
    { value: '#9db9e1', label: 'Azul paciente', color: '#9db9e1' },
    { value: '#b9a5dc', label: 'Lila paciente', color: '#b9a5dc' },
    { value: '#91cbb9', label: 'Menta paciente', color: '#91cbb9' },
    { value: '#edc18f', label: 'Arena paciente', color: '#edc18f' },
  ]),
  ...options('shoeColor', [
    { value: '#ffffff', label: 'Zapatos blancos', color: '#ffffff' },
    { value: '#574136', label: 'Zapatos cafés', color: '#574136' },
    { value: '#db6680', label: 'Zapatos coral', color: '#db6680' },
    { value: '#566b92', label: 'Zapatos azules', color: '#566b92' },
  ]),
  ...options('mask', [
    { value: false, label: 'Sin mascarilla' },
    { value: true, label: 'Mascarilla' },
  ]),
  ...options('stethoscope', [
    { value: true, label: 'Estetoscopio' },
    { value: false, label: 'Sin estetoscopio' },
  ]),
]

export const optionsByCategory: Record<CustomizationCategory, AppearanceOption[]> = {
  face: faceOptions,
  skin: skinOptions,
  hair: [...hairStyleOptions, ...hairColorOptions],
  hat: hatOptions,
  glasses: glassesOptions,
  beard: beardOptions,
  uniform: uniformOptions,
}
