import type { ReactNode } from 'react'
import type { CharacterAnimation } from '../types'
import type { CharacterAppearance } from '../game/characterTypes'
import './CharacterRenderer.css'
import './CharacterRendererMotion.css'

interface CharacterRendererProps {
  appearance: CharacterAppearance
  gender?: 'doctor' | 'doctora'
  variant?: 'portrait' | 'full'
  animation?: CharacterAnimation
  animate?: boolean
  className?: string
}

function Hair({ style, color }: { style: CharacterAppearance['hairStyle']; color: string }) {
  const styles: Record<CharacterAppearance['hairStyle'], ReactNode> = {
    short: <><path d="M66 91c-8-45 13-72 54-72 40 0 60 28 54 72l-15 18H79z" /><path d="M70 58c22 8 38 3 55-12 11 15 27 19 47 17v25H69z" /></>,
    long: <><path d="M62 112V69c-2-34 20-53 58-53s60 20 58 54v92h-24l-8-70-51 8-11 62H62z" /><path d="M65 61c9-30 26-44 55-44 31 0 50 17 58 45-25 4-45-4-58-20-15 16-33 23-55 19z" /></>,
    curly: <><path d="M63 104V75c-2-39 21-62 57-62s61 24 58 63v31h-18V77c-15 5-27 4-40-7-13 12-29 17-44 12v22z" /><circle cx="69" cy="49" r="15" /><circle cx="89" cy="26" r="16" /><circle cx="113" cy="19" r="17" /><circle cx="138" cy="22" r="16" /><circle cx="160" cy="39" r="16" /><circle cx="175" cy="60" r="13" /></>,
    bob: <><path d="M63 112V66c0-38 22-57 57-57s57 19 57 57v64h-25l-8-57-50 7-10 50H63z" /><path d="M67 55c8-27 25-42 53-42 30 0 47 16 54 44-24 2-42-5-54-21-13 15-31 22-53 19z" /></>,
    bun: <><path d="M65 109V66c0-37 21-56 55-56s56 20 56 56v43h-20V76c-13 9-27 11-39 1-15 11-31 12-52 2v30z" /><circle cx="119" cy="15" r="21" /></>,
    ponytail: <><path d="M64 111V66c0-37 22-56 55-56s57 20 57 56v44h-19V77c-18 10-40 8-56-2-10 8-22 10-37 6z" /><path d="M169 55c20 7 28 22 22 45-4 14-13 24-23 27l-10-13c11-12 15-28 11-45z" /></>,
    braids: <><path d="M63 111V65c0-38 21-57 56-57s58 20 58 57v45h-18V75c-14 8-28 8-40 0-15 9-32 10-56 2z" /><path d="M68 74c-9 23-8 48 3 68l12-3c-7-18-8-37-4-56zM168 74c9 23 8 48-3 68l-12-3c7-18 8-37 4-56z" /><path d="M65 45c10-25 28-37 54-37 29 0 47 14 56 40-26 4-43-4-56-19-14 16-32 22-54 16z" /></>,
    wavy: <><path d="M62 112V67c0-38 22-57 57-57s58 20 58 57v98h-20l-5-27-13 12-10-20-14 17-12-19-15 18-11-18-13 15V75c-7 12-13 21-22 26z" /><path d="M66 51c9-26 27-40 53-40 29 0 48 15 56 42-23 4-41-3-55-20-15 17-32 23-54 18z" /></>,
    pixie: <><path d="M68 97c-9-39 8-69 49-72 33-3 54 15 56 46-19-1-34-8-45-20-13 18-32 26-60 24z" /><path d="M69 62c18 3 31-4 41-18 7 10 18 15 34 15l-9 22-66 3z" /></>,
    afro: <><path d="M62 112V76c0-39 22-61 57-61s59 23 59 62v35h-21V76c-12 9-25 11-39 1-16 11-34 11-56 2z" /><circle cx="68" cy="53" r="17" /><circle cx="82" cy="31" r="18" /><circle cx="103" cy="19" r="18" /><circle cx="127" cy="16" r="19" /><circle cx="151" cy="23" r="19" /><circle cx="170" cy="42" r="18" /><circle cx="178" cy="63" r="15" /></>,
    'side-part': <><path d="M64 108V67c0-38 22-57 56-57s58 20 58 57v45h-18V77c-16 11-36 11-54 2-11 7-24 10-42 6z" /><path d="M66 54c5-28 25-43 54-43 29 0 49 15 57 42-28 4-48-4-58-24-9 18-27 27-53 25z" /></>,
    spiky: <><path d="M66 106V66c0-37 21-56 54-56s56 19 56 56v43h-19V77c-14 9-29 9-41-1-15 10-32 10-50 2z" /><path d="M66 53l-8-26 24 15 8-31 17 25 17-34 12 33 25-20-5 32 27-5-11 28c-25-3-41-11-51-24-13 15-31 22-55 19z" /></>,
  }
  return <g fill={color} stroke="#563f3a" strokeOpacity=".12" strokeWidth="2">{styles[style]}</g>
}

function HairFront({ style, color }: { style: CharacterAppearance['hairStyle']; color: string }) {
  const top = <path d="M66 61c2-29 19-47 54-47s53 19 55 48c-20 1-39-5-54-20-15 16-34 22-55 19z" />
  const fringes: Record<CharacterAppearance['hairStyle'], ReactNode> = {
    short: <><path d="M68 58c8-26 24-39 52-39 27 0 46 14 53 41-21 1-39-6-52-21-13 15-31 22-53 19z" /><path d="M78 52q24 8 42-9 12 17 42 17v12q-23 4-41-12-19 18-43 12z" /></>,
    long: <>{top}<path d="M73 53q19 10 39-7v14q-18 17-39 9zM128 47q17 13 40 7v15q-24 8-40-7z" /></>,
    curly: <><circle cx="72" cy="47" r="13" /><circle cx="91" cy="29" r="15" /><circle cx="115" cy="20" r="16" /><circle cx="140" cy="26" r="15" /><circle cx="163" cy="44" r="13" /><circle cx="89" cy="49" r="11" /><circle cx="112" cy="42" r="11" /><circle cx="137" cy="45" r="11" /></>,
    bob: <><path d="M66 58c5-28 25-44 54-44 30 0 49 16 55 45-21 2-40-5-55-21-13 17-31 23-54 20z" /><path d="M75 54q24 9 45-11 17 19 45 12v18q-26 2-45-13-19 17-45 11z" /></>,
    bun: <>{top}<circle cx="119" cy="14" r="18" /><path d="M78 55q25 4 41-12 17 17 42 12v15q-26 4-42-10-19 17-41 10z" /></>,
    ponytail: <>{top}<path d="M75 53q23 10 44-9 16 18 42 9v17q-24 5-42-11-20 17-44 10z" /></>,
    braids: <>{top}<path d="M72 54q23 7 47-11 19 18 48 11v17q-28 6-48-11-24 19-47 10z" /></>,
    wavy: <>{top}<path d="M70 54q18 8 36-8 17 17 33 0 14 14 31 8v17q-17 8-32-7-17 17-33 0-17 17-35 8z" /></>,
    pixie: <><path d="M68 60c4-29 21-46 51-46s51 17 53 43c-21 2-38-6-51-20-13 17-31 24-53 23z" /><path d="M76 53q18 7 34-8 12 15 38 11l-4 14q-24 4-39-9-13 14-30 9z" /></>,
    afro: <><circle cx="68" cy="48" r="15" /><circle cx="84" cy="27" r="16" /><circle cx="105" cy="18" r="17" /><circle cx="128" cy="17" r="17" /><circle cx="151" cy="25" r="17" /><circle cx="170" cy="45" r="15" /><circle cx="91" cy="45" r="11" /><circle cx="116" cy="39" r="12" /><circle cx="143" cy="43" r="11" /></>,
    'side-part': <><path d="M67 58c5-30 23-45 54-45s53 18 55 47c-25 3-44-5-56-24-11 18-29 25-53 22z" /><path d="M72 52q21 8 43-9 16 18 43 12v17q-26 3-43-13-22 16-43 9z" /></>,
    spiky: <><path d="M68 58l-5-22 19 12 5-31 20 24 13-34 13 32 22-22-3 31 22-7-9 30q-24-1-45-17-23 16-51 9z" /></>,
  }
  return <g fill={color} stroke="#563f3a" strokeOpacity=".12" strokeWidth="1.5">{fringes[style]}</g>
}

function Hat({ appearance }: { appearance: CharacterAppearance }) {
  const { hatStyle, hatColor, hatPattern } = appearance
  if (hatStyle === 'none') return null
  if (hatStyle === 'headband') return <path d="M67 57Q120 28 173 57" fill="none" stroke={hatColor} strokeWidth="10" strokeLinecap="round" />
  const beanie = hatStyle === 'beanie'
  const patterned = hatStyle === 'patterned'
  return <g>
    <path d={beanie ? 'M73 46Q78 10 120 10t47 36v8H73z' : patterned ? 'M69 51Q76 18 120 16t51 35l-10 10H78z' : 'M73 48Q78 20 120 19t47 29v12H73z'} fill={hatColor} stroke="#d4e4df" strokeWidth="3" />
    <path d={patterned ? 'M68 60q52-9 104 0' : 'M68 57h104'} fill="none" stroke={hatColor} strokeWidth="11" strokeLinecap="round" />
    {patterned && <path d="M78 52q42-13 84 0" fill="none" stroke="#fff9" strokeWidth="3" />}
    {hatPattern === 'dots' && [91, 108, 132, 149].map(x => <circle key={x} cx={x} cy="38" r="4" fill="white" opacity=".8" />)}
    {hatPattern === 'crosses' && [96, 142].map(x => <g key={x} stroke="white" strokeWidth="3" strokeLinecap="round"><path d={`M${x} 30v12M${x - 6} 36h12`} /></g>)}
    {hatPattern === 'stars' && [95, 143].map(x => <path key={x} d={`M${x} 29l2 5 5 2-5 2-2 5-2-5-5-2 5-2z`} fill="white" />)}
    {hatPattern === 'solid' && <circle cx="120" cy="36" r="4" fill="white" opacity=".85" />}
  </g>
}

function Face({ appearance }: { appearance: CharacterAppearance }) {
  const face = appearance.faceShape
  const facePath = face === 'heart'
    ? 'M120 144C108 132 66 103 66 73c0-22 17-36 37-36 9 0 15 5 17 12 4-8 11-12 20-12 20 0 35 14 35 36 0 29-39 58-55 71z'
    : null
  return <g>
    {facePath
      ? <path d={facePath} fill={appearance.skin} stroke="#b87463" strokeOpacity=".2" strokeWidth="3" />
      : face === 'square'
        ? <rect x="69" y="34" width="102" height="112" rx="39" fill={appearance.skin} />
        : <ellipse cx="120" cy="91" rx={face === 'oval' ? 45 : 52} ry={face === 'oval' ? 65 : 58} fill={appearance.skin} />}
    <ellipse cx="86" cy="103" rx="10" ry="5" fill="#ee9c94" opacity=".32" />
    <ellipse cx="154" cy="103" rx="10" ry="5" fill="#ee9c94" opacity=".32" />
    <g className="creator-blink">
      {appearance.eyeStyle === 'sleepy'
        ? <g fill="none" stroke="#382f35" strokeWidth="4" strokeLinecap="round"><path d="M86 81q12 9 24 0" /><path d="M130 81q12 9 24 0" /></g>
        : <g>
          {appearance.eyeStyle === 'almond'
            ? <g><path d="M79 78q14-14 28 0-14 16-28 0zM133 78q14-14 28 0-14 16-28 0z" fill="#fff" /><ellipse cx="93" cy="78" rx="6" ry="8" fill={appearance.eyes} /><ellipse cx="147" cy="78" rx="6" ry="8" fill={appearance.eyes} /></g>
            : <g><ellipse cx="93" cy="80" rx={appearance.eyeStyle === 'sparkle' ? 12 : 10} ry="13" fill="#fff" /><ellipse cx="147" cy="80" rx={appearance.eyeStyle === 'sparkle' ? 12 : 10} ry="13" fill="#fff" /><circle cx="94" cy="81" r="7" fill={appearance.eyes} /><circle cx="146" cy="81" r="7" fill={appearance.eyes} /><circle cx="96" cy="78" r="3" fill="#fff" /><circle cx="148" cy="78" r="3" fill="#fff" />{appearance.eyeStyle === 'sparkle' && <g fill="#fff"><path d="M84 67v8M80 71h8M157 66v8M153 70h8" /></g>}</g>}
        </g>}
      <g fill="none" stroke="#563f3a" strokeWidth={appearance.eyebrowStyle === 'bold' ? 5 : 3.5} strokeLinecap="round">
        {appearance.eyebrowStyle === 'straight' ? <><path d="M80 61h26M134 61h26" /></> : appearance.eyebrowStyle === 'arched' ? <><path d="M80 64q13-12 27-2M133 62q14-10 27 2" /></> : appearance.eyebrowStyle === 'bold' ? <><path d="M79 61q14-9 29 0M132 61q15-9 29 0" /></> : <><path d="M81 63q12-7 25 0M134 63q12-7 25 0" /></>}
      </g>
    </g>
    {appearance.noseStyle === 'dot'
      ? <circle cx="120" cy="101" r="2.8" fill="#b77964" opacity=".7" />
      : appearance.noseStyle === 'button'
        ? <ellipse cx="120" cy="102" rx="5" ry="4" fill="#c88770" />
        : <path d="M118 87q-2 13 3 15" fill="none" stroke="#b77964" strokeWidth="2.5" strokeLinecap="round" />}
    {appearance.expression === 'surprised'
      ? <ellipse cx="120" cy="119" rx="6" ry="8" fill="#a75258" />
      : appearance.expression === 'cheerful' || appearance.mouthStyle === 'open'
        ? <path d="M108 116q12 20 24 0q-2 16-12 16t-12-16z" fill="#a75258" />
        : appearance.expression === 'calm' || appearance.mouthStyle === 'soft'
          ? <path d="M110 119q10 3 20 0" fill="none" stroke="#9e5e5c" strokeWidth="3" strokeLinecap="round" />
          : <path d="M106 115q14 18 28 0" fill="none" stroke="#9e5e5c" strokeWidth="4" strokeLinecap="round" />}
  </g>
}

function Beard({ style, color }: { style: CharacterAppearance['beardStyle']; color: string }) {
  if (style === 'none') return null
  return <g fill={color} opacity=".95">
    {(style === 'stubble' || style === 'beard') && <path d="M72 101q3 41 48 48 45-7 48-48l-11 2q-6 28-37 31-31-3-37-31z" />}
    {(style === 'mustache' || style === 'goatee' || style === 'beard') && <path d="M99 111q10-8 21-2 11-6 21 2-2 10-11 8l-10-5-10 5q-9 2-11-8z" />}
    {style === 'goatee' && <path d="M111 128q9 2 18 0l-3 12q-6 8-12 0z" />}
  </g>
}

function Glasses({ appearance }: { appearance: CharacterAppearance }) {
  const { glassesStyle, glassesColor } = appearance
  if (glassesStyle === 'none') return null
  const frame = glassesStyle === 'cat-eye'
    ? <g fill="none" stroke={glassesColor} strokeWidth="4" strokeLinejoin="round"><path d="M74 71l7-9 29 4-1 20q-14 10-27 0zM130 66l29-4 7 9-8 15q-13 10-27 0z" /></g>
    : glassesStyle === 'aviator'
      ? <g fill="#a6d9e020" stroke={glassesColor} strokeWidth="4"><path d="M77 69q18-11 31 0l-2 18q-15 13-25-1zM132 69q13-11 31 0l-4 17q-10 14-25 1z" /></g>
      : <g fill="#ffffff1c" stroke={glassesColor} strokeWidth="4"><rect x="77" y="68" width="32" height="27" rx={glassesStyle === 'round' ? 13 : 5} /><rect x="131" y="68" width="32" height="27" rx={glassesStyle === 'round' ? 13 : 5} /></g>
  return <g>{frame}<path d="M109 76q11-6 22 0M76 76l-8-4M164 76l8-4" fill="none" stroke={glassesColor} strokeWidth="4" strokeLinecap="round" /></g>
}

function Uniform({ appearance, gender }: { appearance: CharacterAppearance; gender: 'doctor' | 'doctora' }) {
  const { uniform, uniformStyle, shoeColor, stethoscope } = appearance
  const pantsColor = uniform
  return <g>
    <path d="M92 276h27v49q-12 8-27 2zM121 276h27v51q-14 6-27-2z" fill={pantsColor} stroke="#668d87" strokeOpacity=".3" strokeWidth="2" />
    <path d="M120 285v38" stroke="#ffffff55" strokeWidth="2" />
    <path d="M84 166l-30 14-18 73q-2 12 10 15l15 3 16-53 5 79h76l5-79 16 53 15-3q12-3 10-15l-18-73-30-14z" fill={uniform} stroke="#668d87" strokeOpacity=".25" strokeWidth="3" />
    {uniformStyle === 'coat' && <g><path d="M85 166l35 33 35-33 22 12-21 27-16-13 8 92H92l8-92-16 13-21-27z" fill={uniform} stroke="#d9e5e1" strokeWidth="3" /><path d="M120 199v86" stroke="#d6e0de" strokeWidth="2" /><circle cx="129" cy="221" r="2.5" fill="#e2bb70" /><circle cx="129" cy="239" r="2.5" fill="#e2bb70" /><rect x="139" y="215" width="17" height="19" rx="3" fill="#eaf3f0" /><text x="147.5" y="227" textAnchor="middle" fontSize="5" fontWeight="800" fill="#5e8e87">{gender === 'doctor' ? 'DR' : 'DRA'}</text></g>}
    {uniformStyle === 'jacket' && <g><path d="M85 166l35 32 35-32 22 12-21 27-16-13 8 92H92l8-92-16 13-21-27z" fill={uniform} stroke="#fff" strokeOpacity=".55" strokeWidth="3" /><path d="M120 198v86" stroke="#ffffff99" strokeWidth="3" /><path d="M101 200l19 11 19-11" fill="none" stroke="#ffffffaa" strokeWidth="3" /></g>}
    {uniformStyle === 'scrubs' && <g><path d="M85 166l35 31 35-31 24 13-20 27-19-14 9 86H91l9-86-19 14-20-27z" fill={uniform} stroke="#fff" strokeOpacity=".5" strokeWidth="3" /><path d="M120 198v80" stroke="#ffffff6b" strokeWidth="2" /><path d="M94 248h19" stroke="#ffffff70" strokeWidth="3" /></g>}
    {stethoscope && <g fill="none" stroke="#b88749" strokeWidth="4" strokeLinecap="round"><path d="M91 177v31q0 18 16 18t16-18v-7" /><circle cx="123" cy="199" r="6" fill="#e5c47c" /><path d="M91 177v-5M91 172h8" /></g>}
    <path d="M91 323h29v16q-4 9-31 4-7-3-4-10z" fill={shoeColor} stroke="#d7dddb" strokeWidth="3" />
    <path d="M121 323h29v10q3 9-5 11-27 5-30-4v-17z" fill={shoeColor} stroke="#d7dddb" strokeWidth="3" />
    <path d="M88 339q13 6 32 1M121 339q13 6 30-1" fill="none" stroke="#8e9ba0" strokeWidth="3" />
  </g>
}

export function CharacterRenderer({ appearance, gender = 'doctora', variant = 'full', animation = 'idle', animate = true, className = '' }: CharacterRendererProps) {
  return <svg data-gender={gender} className={`character-renderer character-renderer-${variant} character-renderer-${animation} ${animate ? '' : 'character-renderer-static'} ${className}`} viewBox={variant === 'full' ? '0 0 240 380' : '18 0 204 240'} role="img" aria-label="Vista previa del personaje personalizado">
    {variant === 'full' && <><ellipse cx="120" cy="365" rx="69" ry="11" fill="#607f87" opacity=".18" /><path d="M49 365a71 22 0 0 0 142 0" fill="#d2f3ea" opacity=".48" /></>}
    <g className="character-renderer-breathing">
      <Hair style={appearance.hairStyle} color={appearance.hair} />
      <path d="M103 139h34v37h-34z" fill={appearance.skin} />
      <Uniform appearance={appearance} gender={gender} />
      <Face appearance={appearance} />
      <Beard style={appearance.beardStyle} color={appearance.beardColor} />
      {appearance.mask && <path d="M82 95q38 15 76 0v34q-38 19-76 0z" fill="#69c7bf" stroke="#fff" strokeWidth="3" />}
      {appearance.mask && <path d="M82 100l-12 9M158 100l12 9" fill="none" stroke="#66aaa4" strokeWidth="3" />}
      <HairFront style={appearance.hairStyle} color={appearance.hair} />
      {appearance.hatStyle !== 'none' && <Hat appearance={appearance} />}
      <Glasses appearance={appearance} />
      <g className="character-arms">
        <path className="character-arm-left" d="M82 176q-16 0-22 17l-11 32q-3 9 6 13l12 4 17-43z" fill={appearance.uniform} stroke="#668d87" strokeOpacity=".35" strokeWidth="3" />
        <path className="character-arm-right" d="M158 176q16 0 22 17l11 32q3 9-6 13l-12 4-17-43z" fill={appearance.uniform} stroke="#668d87" strokeOpacity=".35" strokeWidth="3" />
        <path d="M55 235q-6 7-4 16l4 6q3 3 5-1l-1-5 3 6q3 3 5-1l-2-8 4 5q3 2 4-2l-5-10-7-8zM185 235q6 7 4 16l-4 6q-3 3-5-1l1-5-3 6q-3 3-5-1l2-8-4 5q-3 2-4-2l5-10 7-8z" fill={appearance.skin} stroke="#9c6c5a" strokeOpacity=".3" strokeWidth="2" strokeLinejoin="round" />
      </g>
    </g>
  </svg>
}
