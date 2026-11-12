import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, BookOpen, X } from 'lucide-react'
import './GameTutorial.css'

export type TutorialScreen = 'doctor' | 'team' | 'hospital' | 'preop' | 'surgery'

const steps: Array<{ title: string; description: string; destination: TutorialScreen; action: string }> = [
  { title: 'Personaliza tu personaje', description: 'Elige su apariencia y guarda los cambios para verla en las demás pantallas.', destination: 'doctor', action: 'Ir a Mi personaje' },
  { title: 'Forma tu equipo', description: 'Selecciona cuatro profesionales y cubre los roles necesarios antes de operar.', destination: 'team', action: 'Ir a Equipo médico' },
  { title: 'Recibe a un paciente', description: 'En Mi Hospital puedes revisar los turnos y comenzar una atención disponible.', destination: 'hospital', action: 'Ir a Mi Hospital' },
  { title: 'Conversa y pide consentimiento', description: 'Resuelve preguntas y deja que el paciente decida. Puedes volver a explicar sin penalización.', destination: 'preop', action: 'Ir a Atención preoperatoria' },
  { title: 'Prepara el quirófano', description: 'Completa las seis tareas de preparación para habilitar el inicio de la cirugía ficticia.', destination: 'preop', action: 'Ir a la preparación' },
  { title: 'Juega la cirugía ficticia', description: 'Sigue las indicaciones del minijuego y elige una dificultad adecuada. No representa procedimientos médicos reales.', destination: 'surgery', action: 'Ir al quirófano' },
  { title: 'Usa tus recompensas', description: 'Los resultados otorgan monedas y experiencia; puedes usarlas para ampliar y decorar el hospital.', destination: 'hospital', action: 'Mejorar el hospital' },
]

export function GameTutorial({ onClose, onNavigate }: { onClose: () => void; onNavigate: (screen: TutorialScreen) => void }) {
  const [index, setIndex] = useState(0)
  const closeRef = useRef<HTMLButtonElement>(null)
  const step = steps[index]

  useEffect(() => {
    closeRef.current?.focus()
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return <div className="game-tutorial-backdrop" onMouseDown={event => {
    if (event.target === event.currentTarget) onClose()
  }}>
    <section className="game-tutorial" role="dialog" aria-modal="true" aria-labelledby="game-tutorial-title" aria-describedby="game-tutorial-description">
      <header className="game-tutorial-header">
        <span className="game-tutorial-icon"><BookOpen size={19} /></span>
        <span><small>GUÍA OPCIONAL · {index + 1} DE {steps.length}</small><h2 id="game-tutorial-title">{step.title}</h2></span>
        <button ref={closeRef} type="button" className="game-tutorial-close" onClick={onClose} aria-label="Omitir guía"><X size={19} /></button>
      </header>
      <p id="game-tutorial-description">{step.description}</p>
      <div className="game-tutorial-progress" aria-label={`Paso ${index + 1} de ${steps.length}`}>
        {steps.map((item, stepIndex) => <i key={item.title} className={stepIndex <= index ? 'complete' : ''} />)}
      </div>
      <footer className="game-tutorial-actions">
        <button type="button" className="game-tutorial-secondary" onClick={onClose}>Omitir guía</button>
        <div>
          {index > 0 && <button type="button" className="game-tutorial-secondary" onClick={() => setIndex(value => value - 1)} aria-label="Paso anterior"><ArrowLeft size={16} /></button>}
          <button type="button" className="game-tutorial-primary" onClick={() => index < steps.length - 1 ? setIndex(value => value + 1) : onClose()}>
            {index === steps.length - 1 ? 'Terminar' : 'Siguiente'} <ArrowRight size={15} />
          </button>
          <button type="button" className="game-tutorial-go" onClick={() => onNavigate(step.destination)}>{step.action}</button>
        </div>
      </footer>
    </section>
  </div>
}
