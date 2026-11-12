import { lazy, Suspense, useState } from 'react'
import { ArrowRight, Bell, BriefcaseMedical, Check, ChevronRight, CircleHelp, ClipboardCheck, Heart, Hospital, Menu, Settings, ShieldCheck, Sparkles, Users, X } from 'lucide-react'
import { useGameStore } from './store/gameStore'
import { isValidTeam } from './game/teamRules'
import type { Doctor } from './types'
import { Avatar } from './components/Avatar'
import { PreopFlow } from './components/PreopFlow'
import { AudioSettings } from './components/AudioSettings'
import { CharacterCreatorPage } from './components/CharacterCreatorPage'
import { TeamPage } from './components/TeamPage'
import { GameTutorial } from './components/GameTutorial'
import { audioManager } from './game/AudioManager'
import './App.css'

const SurgeryPage = lazy(() => import('./components/SurgeryPage').then(module => ({ default: module.SurgeryPage })))
const HospitalPage = lazy(() => import('./components/HospitalPage').then(module => ({ default: module.HospitalPage })))
type Screen = 'home' | 'doctor' | 'team' | 'preop' | 'surgery' | 'hospital' | 'settings'
const defaultDoctor: Doctor = { name: 'Dra. Alex', gender: 'doctora', skin: '#bd8065', hair: '#47302c', eyes: '#536d69', uniform: '#63c9bd', accessory: 'gorra' }

function App() {
  const { doctor, setDoctor, selectedStaff, roleAssignments, saved, save, clearPatientSelection, beginPreop } = useGameStore()
  const [screen, setScreen] = useState<Screen>('home')
  const [mobileNav, setMobileNav] = useState(false)
  const [toast, setToast] = useState('')
  const [tutorialOpen, setTutorialOpen] = useState(false)
  const currentDoctor = doctor ?? defaultDoctor
  const validTeam = isValidTeam(selectedStaff, roleAssignments)
  const flash = (message: string) => { audioManager.play('notification'); setToast(message); window.setTimeout(() => setToast(''), 2600) }
  const go = (next: Screen) => { audioManager.play('button'); setScreen(next); setMobileNav(false) }
  const nav = <><div className="nav-label">TU HOSPITAL</div>
    <button className={`nav-item ${screen === 'home' ? 'active' : ''}`} onClick={() => go('home')}><Hospital /> Inicio <span className="nav-dot" /></button>
    <div className="nav-label nav-label-spaced">PREPARACIÓN</div>
    <button className={`nav-item ${screen === 'doctor' ? 'active' : ''}`} onClick={() => go('doctor')}><Sparkles /> Mi personaje</button>
    <button className={`nav-item ${screen === 'team' ? 'active' : ''}`} onClick={() => go('team')}><Users /> Equipo médico</button>
    <button className={`nav-item ${screen === 'preop' ? 'active' : ''}`} onClick={() => go('preop')}><ClipboardCheck /> Atención preoperatoria</button>
    <button className={`nav-item ${screen === 'hospital' ? 'active' : ''}`} onClick={() => go('hospital')}><BriefcaseMedical /> Mi hospital</button>
    <div className="sidebar-bottom"><div className="help-card"><div className="help-icon"><CircleHelp size={17} /></div><strong>¿Necesitas ayuda?</strong><span>Tu aventura empieza aquí.</span><button onClick={() => setTutorialOpen(true)}>Ver guía <ArrowRight size={14} /></button></div><button className={`nav-item muted ${screen === 'settings' ? 'active' : ''}`} onClick={() => go('settings')}><Settings /> Configuración</button><div className="profile-mini"><Avatar color={currentDoctor.uniform} hair={currentDoctor.hair} skin={currentDoctor.skin} accessory={currentDoctor.accessory} hairStyle={currentDoctor.hairStyle} gender={currentDoctor.gender} customization={currentDoctor} /><div><b>{currentDoctor.name}</b><span>{currentDoctor.gender === 'doctor' ? 'Doctor principal' : 'Doctora principal'}</span></div><ChevronRight size={16} /></div></div>
  </>
  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}><div className="brand"><div className="brand-mark"><Heart size={20} fill="white" /></div><div><b>mini<span>hospital</span></b><small>PEQUEÑOS CUIDADOS, GRANDES HAZAÑAS</small></div><button className="close-nav" onClick={() => setMobileNav(false)}><X size={20} /></button></div>{nav}</aside>
    {mobileNav && <button className="nav-scrim" onClick={() => setMobileNav(false)} aria-label="Cerrar menú" />}
    <main className="main-area"><header className="topbar"><button className="mobile-menu" onClick={() => setMobileNav(true)} aria-label="Abrir menú"><Menu /></button><div className="crumb">Mini Hospital <ChevronRight size={14} /> <b>{screen === 'home' ? 'Inicio' : screen === 'doctor' ? 'Mi personaje' : screen === 'team' ? 'Equipo médico' : screen === 'preop' ? 'Atención preoperatoria' : screen === 'surgery' ? 'Quirófano' : screen === 'hospital' ? 'Mi Hospital' : 'Configuración'}</b></div><div className="top-right"><span className="online"><i /> Guardado en este dispositivo</span><button className="icon-btn" aria-label="Notificaciones" onClick={() => flash('No tienes notificaciones nuevas.')}><Bell size={18} /></button><span className="top-avatar"><Avatar color={currentDoctor.uniform} hair={currentDoctor.hair} skin={currentDoctor.skin} accessory={currentDoctor.accessory} hairStyle={currentDoctor.hairStyle} gender={currentDoctor.gender} customization={currentDoctor} /></span></div></header>
      {screen === 'home' && <section className="page home-page">
        <div className="welcome-line"><div><div className="eyebrow"><span className="sparkle">✳</span> TU PRÓXIMA GRAN AVENTURA</div><h1>¡Hola, {currentDoctor.name.replace(/^(Dra?\.?\s*)/i, '')}!</h1><p className="subtitle">Tu hospital está listo para hacer cosas increíbles.</p></div><span className="date-pill">✦ &nbsp;Un día perfecto para cuidar</span></div>
        <div className="hero-card"><div className="hero-copy"><span className="hero-kicker">BIENVENIDA AL EQUIPO</span><h2>¡Cada gran historia<br />comienza con cuidado!</h2><p>Prepara tu equipo, conoce a tus colegas<br className="desktop-break" /> y conviértete en la heroína de cada día.</p><button className="primary-btn" onClick={() => go('team')}>Preparar mi equipo <ArrowRight size={17} /></button><div className="hero-note"><ShieldCheck size={16} /> Un espacio seguro para aprender y jugar</div></div>
          <div className="hero-art"><div className="art-sun" /><div className="art-cloud cloud-one" /><div className="art-cloud cloud-two" /><div className="art-cross">+</div><div className="art-floor" /><div className="doctor-art"><Avatar large color={currentDoctor.uniform} hair={currentDoctor.hair} skin={currentDoctor.skin} eyes={currentDoctor.eyes} accessory={currentDoctor.accessory} hairStyle={currentDoctor.hairStyle} gender={currentDoctor.gender} customization={currentDoctor} /></div><div className="plant-art">✿</div><div className="art-caption"><span>✦</span> La salud también se juega en equipo</div></div>
        </div>
        <div className="section-heading"><div><h2>Tu aventura empieza aquí</h2><p>Unos pasos sencillos antes de entrar al quirófano.</p></div><button className="text-link" onClick={() => go('team')}>Ver preparación <ArrowRight size={15} /></button></div>
        <div className="setup-grid"><button className="setup-card" onClick={() => go('doctor')}><div className="setup-icon lilac"><Sparkles /></div><span className="step">PASO 01</span><h3>Tu personaje</h3><p>Elige tu estilo y crea tu doctora ideal.</p><div className="card-bottom"><span className={saved.doctor ? 'status-done' : ''}>{saved.doctor ? <><Check size={13} /> LISTO</> : 'POR PERSONALIZAR'}</span><span className="round-arrow"><ArrowRight size={16} /></span></div></button>
          <button className="setup-card" onClick={() => go('team')}><div className="setup-icon mint"><Users /></div><span className="step">PASO 02</span><h3>Tu equipo médico</h3><p>Escoge a 4 colegas para acompañarte.</p><div className="card-bottom"><span className={saved.team && validTeam ? 'status-done' : ''}>{saved.team && validTeam ? <><Check size={13} /> LISTO</> : `${selectedStaff.length} DE 4 SELECCIONADOS`}</span><span className="round-arrow"><ArrowRight size={16} /></span></div></button>
          <button className="setup-card" onClick={() => go('preop')}><div className="setup-icon peach"><ClipboardCheck /></div><span className="step">PASO 03</span><h3>Atención preoperatoria</h3><p>Conoce al paciente y prepara el quirófano.</p><div className="card-bottom"><span>EMPEZAR</span><span className="round-arrow"><ArrowRight size={16} /></span></div></button></div>
        <div className="bottom-banner"><span className="banner-star">✳</span><div><b>En Mini Hospital, cuidar es la mejor aventura.</b><span>Todo es ficticio, amable y pensado para divertirse.</span></div><span className="banner-doodle">♡</span></div>
      </section>}
      {screen === 'doctor' && <CharacterCreatorPage
        doctor={currentDoctor}
        saved={saved.doctor}
        onChange={setDoctor}
        onBack={() => go('home')}
        onSave={() => { save('doctor'); flash('¡Tu personaje quedó guardado!') }}
      />}
      {screen === 'team' && <TeamPage onBack={() => go('home')} onNotify={flash} />}
      {screen === 'hospital' && <Suspense fallback={<section className="page detail-page"><div className="eyebrow">CARGANDO TU HOSPITAL</div><h1>Preparando el mapa…</h1></section>}><HospitalPage onStartPreop={(patientId) => { beginPreop(patientId); go('preop') }} onBack={() => go('home')} /></Suspense>}
      {screen === 'preop' && <PreopFlow onHome={() => go('home')} onSurgery={() => go('surgery')} />}
      {screen === 'settings' && <AudioSettings />}
      {screen === 'surgery' && <Suspense fallback={<section className="page detail-page"><div className="eyebrow">CARGANDO EL QUIRÓFANO</div><h1>Preparando la escena…</h1></section>}><SurgeryPage onHome={() => go('home')} onAnotherPatient={() => { clearPatientSelection(); go('preop') }} /></Suspense>}
      <footer className="footer"><span>MINI HOSPITAL <i>✳</i> HECHO PARA CUIDAR Y JUGAR</span><span>Una aventura ficticia y amable <Heart size={12} /></span></footer>
    </main>{tutorialOpen && <GameTutorial onClose={() => setTutorialOpen(false)} onNavigate={destination => { setTutorialOpen(false); go(destination) }} />}{toast && <div className="toast"><Check size={16} />{toast}</div>}</div>
}

export default App
