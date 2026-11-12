import { useState } from 'react'
import { ArrowLeft, ArrowRight, Brain, Check, ChevronRight, Heart, MessageCircle, ShieldCheck, Sparkles, Users } from 'lucide-react'
import { staff } from '../data/staff'
import { patients, dialogueQuestions, riskClarificationQuestion } from '../data/patients'
import { preparationTasks } from '../data/preparationTasks'
import { useGameStore } from '../store/gameStore'
import { canEnterPreparation, canGiveConsent, getNextDialogueQuestion, initialPatientEmotion, missingConsentTopics, orderDialogueOptions, preparationProgress, scoreFreeResponse, scorePresetResponse } from '../game/preopRules'
import { getTeamMemberView } from '../game/teamRules'
import { Avatar } from './Avatar'
import type { ConversationEmotion, ConversationTopic, Patient } from '../types'
import './PreopFlow.css'
import './PreopConversation.css'

type Stage = 'patients' | 'conversation' | 'preparation' | 'ready'
const roleTitles = { anesthesia: 'Anestesia', instrument: 'Instrumentación', circulating: 'Enfermería', assistant: 'Cirugía asistente' }
const emotionLabel: Record<ConversationEmotion, string> = {
  neutral: 'Conociéndose', happy: 'Con ánimo', nervous: 'Con nervios',
  confused: 'Con dudas', worried: 'Con preocupación', calm: 'En calma',
}
const expressionForEmotion: Record<ConversationEmotion, 'smile' | 'calm' | 'surprised' | 'cheerful'> = {
  neutral: 'calm', happy: 'cheerful', nervous: 'surprised', confused: 'surprised', worried: 'surprised', calm: 'calm',
}

function PatientAvatar({ patient, large = false, emotion = initialPatientEmotion(patient.emotion), motion }: { patient: Patient; large?: boolean; emotion?: ConversationEmotion; motion?: 'idle' | 'talk' | 'alert' | 'happy' }) {
  const eyebrowStyle = emotion === 'worried' || emotion === 'nervous' ? 'arched' : emotion === 'confused' ? 'straight' : undefined
  const mouthStyle = emotion === 'happy' ? 'smile' : emotion === 'worried' || emotion === 'confused' ? 'soft' : undefined
  const animation = motion ?? (emotion === 'happy' ? 'happy' : emotion === 'worried' || emotion === 'nervous' || emotion === 'confused' ? 'alert' : 'idle')
  return <div className={`patient-avatar-wrap ${large ? 'patient-avatar-large' : ''}`}>
    <Avatar color={patient.uniform} hair={patient.hair} skin={patient.skin} hairStyle={patient.hairStyle} accessory={patient.accessory} eyebrowStyle={eyebrowStyle} mouthStyle={mouthStyle} expression={expressionForEmotion[emotion]} motion={animation} />
  </div>
}

function PatientSelection({ onSelect, careQueue }: { onSelect: (id: string) => void; careQueue: ReturnType<typeof useGameStore.getState>['hospital']['careQueue'] }) {
  const unavailable = new Set(['failed', 'discharged', 'recovery', 'surgery', 'preparation'])
  const availablePatients = patients.filter(patient => !unavailable.has(careQueue.find(item => item.patientId === patient.id)?.status ?? 'arrived'))
  return <section className="page detail-page preop-page"><div className="back-link static"><ArrowLeft size={16} /> Preparación preoperatoria</div><div className="detail-title"><div><div className="eyebrow">CONOCE A QUIÉN VAS A ACOMPAÑAR</div><h1>¿A quién cuidamos hoy?</h1><p className="subtitle">Elige un paciente para conversar y preparar juntos una aventura ficticia.</p></div><div className="patient-count">{availablePatients.length} PACIENTES DISPONIBLES</div></div>{availablePatients.length ? <div className="patient-catalog">{availablePatients.map(patient => { const status = careQueue.find(item => item.patientId === patient.id)?.status; return <article className="patient-card" key={patient.id}><div className={`patient-card-art tone-${patient.id}`}><PatientAvatar patient={patient} /><span className="patient-emotion">{emotionLabel[initialPatientEmotion(patient.emotion)]}</span></div><div className="patient-card-body"><div className="patient-name-row"><h2>{patient.name}</h2><span>{patient.age} años</span></div><p className="patient-personality">{patient.personality}</p><div className="patient-detail"><b>Motivo</b><span>{patient.reason}</span></div><div className="patient-detail"><b>Aventura</b><span>{patient.procedure}</span></div><div className="patient-card-bottom"><span className={`difficulty difficulty-${patient.difficulty}`}>{status === 'declined' ? 'PUEDE REPASAR' : patient.difficulty}</span><button className="primary-btn" onClick={() => onSelect(patient.id)}>{status === 'declined' ? 'Volver a explicar' : `Conocer a ${patient.name.split(' ')[0]}`} <ArrowRight size={14} /></button></div></div></article>})}</div> : <div className="fiction-note">Todos los pacientes de esta tanda ya completaron su recorrido. Puedes volver al hospital.</div>}<div className="fiction-note"><ShieldCheck size={16} /> Los pacientes y procedimientos son completamente ficticios. El juego no ofrece consejos médicos.</div></section>
}

function PatientConversation({ patient, onBack, onPrepare }: { patient: Patient; onBack: () => void; onPrepare: () => void }) {
  const { doctor, conversation, trust, calm, understanding, patientEmotion, consent, consentDecision, respondToPatient, setConsentDecision } = useGameStore()
  const [freeText, setFreeText] = useState('')
  const [showFree, setShowFree] = useState(false)
  const [revisitQuestion, setRevisitQuestion] = useState<string | null>(null)
  const selectedQuestion = revisitQuestion
    ? [...dialogueQuestions, riskClarificationQuestion].find(question => question.id === revisitQuestion)
    : undefined
  const nextQuestion = selectedQuestion ?? getNextDialogueQuestion(conversation, patientEmotion, understanding)
  const mayConsent = canGiveConsent(conversation, understanding)
  const missingTopics = missingConsentTopics(conversation, understanding)
  const answeredCount = new Set(conversation.filter(entry => entry.questionId !== 'risk-clarification').map(entry => entry.questionId)).size
  const lastEntry = conversation.at(-1)
  const orderedOptions = nextQuestion ? orderDialogueOptions(nextQuestion.options, `${patient.id}:${nextQuestion.id}`) : []
  const mainDoctor = doctor ?? { name: 'Dra. Alex', gender: 'doctora' as const, skin: '#bd8065', hair: '#47302c', eyes: '#536d69', uniform: '#63c9bd', accessory: 'gorra' }
  const respond = (entry: {
    questionId: string
    response: string
    trustDelta: number
    calmDelta: number
    comprehensionDelta: number
    quality: 'empathetic' | 'incomplete' | 'inappropriate'
    feedback: string
    concepts: ConversationTopic[]
    source: 'preset' | 'free'
  }) => {
    respondToPatient(entry)
    setFreeText('')
    setShowFree(false)
    setRevisitQuestion(null)
  }
  const answerFree = () => {
    if (!freeText.trim() || !nextQuestion) return
    const topic: ConversationTopic = nextQuestion.topic === 'risk-clarification' ? 'risks' : nextQuestion.topic
    const result = scoreFreeResponse(freeText, topic)
    respond({
      questionId: nextQuestion.id, response: freeText.trim(), trustDelta: result.trust, calmDelta: result.calm,
      comprehensionDelta: result.comprehension, quality: result.quality, feedback: result.feedback,
      concepts: result.concepts, source: 'free',
    })
  }
  const openReview = (questionId: string) => {
    setConsentDecision('pending')
    setRevisitQuestion(questionId)
    setShowFree(false)
  }
  const animation = patientEmotion === 'happy' ? 'happy' : patientEmotion === 'worried' || patientEmotion === 'nervous' || patientEmotion === 'confused' ? 'alert' : 'talk'
  return <section className="page detail-page preop-page"><button className="back-link" onClick={onBack}><ArrowLeft size={16} /> Cambiar paciente</button><div className="detail-title"><div><div className="eyebrow">UN MOMENTO PARA ESCUCHAR</div><h1>Conoce a {patient.name.split(' ')[0]}</h1><p className="subtitle">Explícale su aventura con palabras amables y sencillas.</p></div><span className="step-pill">PASO 1 DE 2 · CONVERSAR</span></div>
    <div className="conversation-layout"><div className="conversation-scene">
      <div className="conversation-cloud cloud-left">¡Hola, {mainDoctor.name.replace(/^(Dra?\.?\s*)/i, '')}!</div>
      <div className="conversation-cloud cloud-right" aria-live="polite">{nextQuestion?.prompt ?? (consentDecision === 'accepted' ? 'Gracias por escucharme. Estoy lista para decidir.' : consentDecision === 'declined' ? 'Gracias por respetar mi decisión.' : '¿Te gustaría repasar algo antes de decidir?')}</div>
      <div className="conversation-characters"><div className="conversation-person"><Avatar large color={mainDoctor.uniform} hair={mainDoctor.hair} skin={mainDoctor.skin} eyes={mainDoctor.eyes} accessory={mainDoctor.accessory} hairStyle={mainDoctor.hairStyle} gender={mainDoctor.gender} customization={mainDoctor} motion="talk" /><b>{mainDoctor.name}</b><span>{mainDoctor.gender === 'doctor' ? 'DOCTOR PRINCIPAL' : 'DOCTORA PRINCIPAL'}</span></div><div className="conversation-heart">♡</div><div className="conversation-person"><PatientAvatar patient={patient} large emotion={patientEmotion} motion={animation} /><b>{patient.name}</b><span>{emotionLabel[patientEmotion]}</span></div></div>
      <div className="trust-bars"><div><span>Confianza</span><div className="meter"><i style={{ width: `${trust}%` }} /></div><b>{trust}%</b></div><div><span>Tranquilidad</span><div className="meter calm-meter"><i style={{ width: `${calm}%` }} /></div><b>{calm}%</b></div><div><span><Brain size={13} /> Comprensión</span><div className="meter understanding-meter"><i style={{ width: `${understanding}%` }} /></div><b>{understanding}%</b></div></div>
    </div>
      <div className="dialogue-card"><div className="dialogue-top"><span className="number-badge">{nextQuestion?.id === 'risk-clarification' ? '↺' : nextQuestion ? `${String(Math.min(answeredCount + 1, dialogueQuestions.length)).padStart(2, '0')}` : '✓'}</span><div><span className="field-label">{nextQuestion?.id === 'risk-clarification' ? 'ACLARACIÓN' : nextQuestion ? `PREGUNTA ${Math.min(answeredCount + 1, dialogueQuestions.length)} DE ${dialogueQuestions.length}` : 'DECISIÓN DEL PACIENTE'}</span><h2>{nextQuestion?.title ?? '¿Te gustaría dar tu consentimiento?'}</h2></div></div>
        <p className="dialogue-hint">{nextQuestion?.concern ?? (mayConsent ? 'El paciente puede aceptar o rechazar libremente. No se avanza sin consentimiento.' : 'Antes de decidir, debe quedar clara la explicación y el paciente debe poder resolver sus dudas.')}</p>
        {lastEntry?.feedback && <div className={`response-feedback feedback-${lastEntry.quality ?? 'incomplete'}`} aria-live="polite"><MessageCircle size={16} /><span>{lastEntry.feedback}</span></div>}
        {nextQuestion ? <><div className="response-list">{orderedOptions.map(option => { const result = scorePresetResponse(option); return <button key={option.id} className={`response-option response-${option.quality}`} onClick={() => respond({ questionId: nextQuestion.id, response: option.text, trustDelta: result.trust, calmDelta: result.calm, comprehensionDelta: result.comprehension, quality: result.quality, feedback: result.feedback, concepts: result.concepts, source: 'preset' })}><span className="response-mark">{option.quality === 'empathetic' ? '♡' : option.quality === 'incomplete' ? '…' : '!'}</span><span>{option.text}</span><ChevronRight size={15} /></button> })}</div><button className="free-toggle" onClick={() => setShowFree(!showFree)}>{showFree ? 'Elegir respuesta sugerida' : '✎ Escribir mi propia explicación'}</button>{showFree && <div className="free-response"><textarea value={freeText} maxLength={240} onChange={event => setFreeText(event.target.value)} placeholder="Escribe una explicación amable y sencilla…" /><p>Evaluación local por conceptos y sinónimos; no es IA ni comprensión real del lenguaje.</p><button className="primary-btn" disabled={!freeText.trim()} onClick={answerFree}>Enviar explicación <ArrowRight size={14} /></button></div>}</>
          : <div className="consent-panel">
            {!mayConsent && <div className="consent-requirements"><b>Antes de decidir, repasemos:</b><span>{missingTopics.join(' · ') || 'una explicación más clara'}</span><small>La comprensión se evalúa con reglas locales sencillas; no representa una evaluación clínica.</small></div>}
            <div className="consent-options"><button className={`consent-choice ${consentDecision === 'accepted' ? 'consent-yes' : ''}`} disabled={!mayConsent} onClick={() => setConsentDecision('accepted')}><Heart size={16} /> Sí, doy mi consentimiento</button><button className={`consent-choice ${consentDecision === 'declined' ? 'consent-no' : ''}`} onClick={() => setConsentDecision('declined')}>Todavía no quiero continuar</button></div>
            <p>{consentDecision === 'accepted' ? 'El paciente dio su consentimiento ficticio. Puede continuar la preparación.' : consentDecision === 'declined' ? 'La decisión se respeta sin penalización. Puede repasar la información o elegir otro paciente.' : 'La decisión es del paciente. Puede aceptar o rechazar; solo con su consentimiento podrán continuar.'}</p>
            {!mayConsent && <div className="review-actions"><button onClick={() => openReview('risks')}>Repasar riesgos</button><button onClick={() => openReview('procedure')}>Repasar procedimiento</button></div>}
            {consentDecision === 'declined' && <div className="review-actions"><button onClick={() => openReview('risks')}>Volver a explicar</button><button onClick={onBack}>Elegir otro paciente</button></div>}
            <button className="primary-btn" disabled={!canEnterPreparation(consent) || consentDecision !== 'accepted'} onClick={onPrepare}>Continuar a preparar quirófano <ArrowRight size={14} /></button>
          </div>}
        <div className="conversation-history" aria-label="Historial de conversación">{conversation.map((entry, index) => <div key={entry.id ?? `${entry.questionId}-${index}`} title={entry.feedback}><Check size={12} /> {entry.questionId === 'risk-clarification' ? 'Aclaración de riesgos' : `Conversación ${index + 1}`} · {entry.source === 'free' ? 'respuesta libre' : 'respuesta sugerida'}</div>)}</div>
      </div>
    </div>
  </section>
}

function IsometricRoom({ completed }: { completed: string[] }) {
  return <div className="isometric-room" aria-label="Vista isométrica del quirófano"><div className="iso-wall wall-back" /><div className="iso-wall wall-side" /><div className="iso-floor" /><div className="iso-lamp lamp-a"><i /></div><div className="iso-lamp lamp-b"><i /></div><div className="iso-monitor"><div className={completed.includes('monitor') ? 'screen-ready' : ''}><span>♡</span><i /></div><b>MONITOR</b></div><div className="iso-anesthesia"><div /><span>ANESTESIA</span></div><div className="iso-table"><div className="iso-bed"><i /><i /><span /></div><div className="iso-leg leg-one" /><div className="iso-leg leg-two" /></div><div className="iso-instrument"><span>✦</span><span>✚</span><span>✧</span></div><div className="iso-sterile"><i /><i /><i /></div><div className="iso-plants">✿</div><div className="iso-room-caption"><Sparkles size={13} /> Quirófano de fantasía</div></div>
}

function ORPreparation({ patient, onBack, onReady }: { patient: Patient; onBack: () => void; onReady: () => void }) {
  const { doctor, selectedStaff, roleAssignments, staffProfiles, completedTasks, togglePreparationTask } = useGameStore()
  const progress = preparationProgress(completedTasks, preparationTasks.length)
  const mainDoctor = doctor ?? { name: 'Dra. Alex', gender: 'doctora' as const, skin: '#bd8065', hair: '#47302c', eyes: '#536d69', uniform: '#63c9bd', accessory: 'gorra' }
  const team = Object.entries(roleAssignments).map(([role, id]) => {
    const person = staff.find(member => member.id === id && selectedStaff.includes(id))
    return person ? { role: role as keyof typeof roleTitles, person: getTeamMemberView(person, staffProfiles) } : null
  }).filter((item): item is NonNullable<typeof item> => !!item)
  return <section className="page detail-page preop-page"><button className="back-link" onClick={onBack}><ArrowLeft size={16} /> Volver a la conversación</button><div className="detail-title"><div><div className="eyebrow">PASO 2 DE 2 · PREPARACIÓN</div><h1>Preparamos el quirófano</h1><p className="subtitle">Cada quien tiene una tarea. ¡Hagámoslo en equipo! Paciente: {patient.name} · {patient.procedure}</p></div><div className="prep-progress-badge">{completedTasks.length} / {preparationTasks.length}<small>TAREAS</small></div></div>
    <div className="prep-layout"><div className="prep-main"><IsometricRoom completed={completedTasks} /><div className="team-strip"><div className="team-strip-heading"><Users size={15} /><b>El equipo de hoy</b><span>{team.length + 1} profesionales</span></div><div className="team-strip-members"><div className="team-member"><Avatar color={mainDoctor.uniform} hair={mainDoctor.hair} skin={mainDoctor.skin} eyes={mainDoctor.eyes} accessory={mainDoctor.accessory} customization={mainDoctor} /><span><b>{mainDoctor.name}</b><small>{mainDoctor.gender === 'doctor' ? 'Doctor principal' : 'Doctora principal'}</small></span></div>{team.map(({ role, person }) => <div className="team-member" key={person.id}><Avatar color={person.uniform} hair={person.hair} skin={person.skin} gender={person.gender} accessory={person.accessory} customization={person.appearance} motion="idle" /><span><b>{person.name}</b><small>{roleTitles[role]}</small></span></div>)}</div></div></div>
      <aside className="task-panel"><div className="task-panel-heading"><div><h2>Lista de preparación</h2><p>Marca cada tarea al completarla.</p></div><span>{progress}%</span></div><div className="progress-track"><i style={{ width: `${progress}%` }} /></div><div className="task-list">{preparationTasks.map(task => { const done = completedTasks.includes(task.id); return <button key={task.id} className={`task-row ${done ? 'task-done' : ''}`} onClick={() => togglePreparationTask(task.id)}><span className="task-icon">{done ? <Check size={16} /> : task.icon}</span><span><b>{task.title}</b><small>{task.description}</small></span><i className="task-check">{done && <Check size={12} />}</i></button> })}</div><div className="room-safety-note"><ShieldCheck size={15} /> Todo el equipo está colaborando en un juego ficticio y seguro.</div><button className="primary-btn task-continue" disabled={progress < 100} onClick={onReady}>{progress === 100 ? '¡Equipo y paciente listos!' : 'Completa todas las tareas'} <ArrowRight size={15} /></button></aside></div>
  </section>
}

function ReadyScreen({ patient, onHome, onSurgery }: { patient: Patient; onHome: () => void; onSurgery: () => void }) {
  const { completedTasks } = useGameStore()
  return <section className="page detail-page preop-page ready-page"><div className="ready-celebration">✦　✿　♡</div><div className="eyebrow">PREPARACIÓN COMPLETADA</div><h1>¡Todos listos, {patient.name.split(' ')[0]}!</h1><p className="subtitle">La doctora, el equipo y el paciente están preparados para ingresar al quirófano.</p><div className="ready-summary"><PatientAvatar patient={patient} /><div><b>{patient.name} · {patient.age} años</b><span>{patient.procedure}</span><small><Check size={13} /> Consentimiento ficticio registrado · {completedTasks.length} tareas completadas</small></div></div><p className="ready-notice"><ShieldCheck size={16} /> La cirugía es una aventura abstracta: no incluye pasos ni consejos médicos.</p><div className="ready-actions"><button className="primary-btn" onClick={onSurgery}>Ingresar al quirófano <ArrowRight size={15} /></button><button className="secondary-btn" onClick={onHome}>Volver al inicio</button></div></section>
}

export function PreopFlow({ onHome, onSurgery }: { onHome: () => void; onSurgery: () => void }) {
  const { selectedPatient, consent, completedTasks, hospital, beginPreop, setPatientCareStatus } = useGameStore()
  const [stage, setStage] = useState<Stage>(() => {
    if (!selectedPatient) return 'patients'
    if (!consent) return 'conversation'
    return preparationTasks.every(task => completedTasks.includes(task.id)) ? 'ready' : 'preparation'
  })
  const selected = patients.find(patient => patient.id === selectedPatient)
  const pickPatient = (id: string) => {
    if (!patients.some(patient => patient.id === id)) return
    beginPreop(id)
    setStage('conversation')
  }
  const preparePatient = () => {
    if (selectedPatient) setPatientCareStatus(selectedPatient, 'preparation')
    setStage('preparation')
  }
  if (stage === 'patients' || !selected) return <PatientSelection onSelect={pickPatient} careQueue={hospital.careQueue} />
  if (stage === 'conversation') return <PatientConversation patient={selected} onBack={() => setStage('patients')} onPrepare={preparePatient} />
  if (stage === 'preparation') return <ORPreparation patient={selected} onBack={() => setStage('conversation')} onReady={() => setStage('ready')} />
  return <ReadyScreen patient={selected} onHome={onHome} onSurgery={onSurgery} />
}
