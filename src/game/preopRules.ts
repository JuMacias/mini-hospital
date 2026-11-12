import { dialogueQuestions, riskClarificationQuestion } from '../data/patients'
import type {
  ConversationEmotion,
  ConversationEntry,
  ConversationQuality,
  ConversationTopic,
  DialogueOption,
  Patient,
} from '../types'

const requiredQuestionIds = dialogueQuestions.map(question => question.id)

function latestResponses(conversation: ConversationEntry[]): Map<string, ConversationEntry> {
  return new Map(conversation.map(entry => [entry.questionId, entry]))
}

export function canSelectPatient(patientId: string, availablePatientIds: string[]): boolean {
  return availablePatientIds.includes(patientId)
}

export function canGiveConsent(conversation: ConversationEntry[], understanding?: number): boolean {
  const latest = latestResponses(conversation)
  if (!requiredQuestionIds.every(id => latest.has(id))) return false
  if (understanding === undefined) return true
  const riskAnswer = latest.get('risk-clarification') ?? latest.get('risks')
  return understanding >= 55 && (riskAnswer?.comprehensionDelta ?? 0) >= 12
}

export function missingConsentTopics(conversation: ConversationEntry[], understanding: number): string[] {
  const latest = latestResponses(conversation)
  const missing: string[] = dialogueQuestions
    .filter(question => !latest.has(question.id))
    .map(question => topicLabel(question.topic === 'risk-clarification' ? 'risks' : question.topic))
  const riskAnswer = latest.get('risk-clarification') ?? latest.get('risks')
  if (riskAnswer && (riskAnswer.comprehensionDelta ?? 0) < 12 && !missing.includes('riesgos')) missing.push('riesgos')
  if (understanding < 55 && !missing.length) missing.push('una explicación más clara')
  return missing
}

export function getNextDialogueQuestion(
  conversation: ConversationEntry[],
  emotion: ConversationEmotion,
  understanding: number,
) {
  const latest = latestResponses(conversation)
  if (!latest.has('introduction')) return dialogueQuestions.find(question => question.id === 'introduction')
  if (!latest.has('procedure')) return dialogueQuestions.find(question => question.id === 'procedure')

  const riskAnswer = latest.get('risks')
  if (
    riskAnswer &&
    (riskAnswer.quality === 'inappropriate' || (riskAnswer.comprehensionDelta ?? 0) < 12) &&
    (emotion === 'worried' || emotion === 'nervous') &&
    !latest.has(riskClarificationQuestion.id)
  ) return riskClarificationQuestion

  const branchOrder = emotion === 'worried'
    ? ['risks', 'benefits', 'recovery', 'questions']
    : emotion === 'nervous' || emotion === 'confused'
      ? ['questions', 'benefits', 'risks', 'recovery']
      : ['benefits', 'risks', 'recovery', 'questions']
  const nextId = branchOrder.find(id => !latest.has(id))
  if (nextId) return dialogueQuestions.find(question => question.id === nextId)
  if (understanding < 55 && !latest.has(riskClarificationQuestion.id) && (emotion === 'worried' || emotion === 'nervous')) {
    return riskClarificationQuestion
  }
  return undefined
}

export function orderDialogueOptions<T extends { id: string }>(options: T[], seed: string): T[] {
  const result = [...options]
  let state = [...seed].reduce((hash, character) => (Math.imul(hash, 31) + character.charCodeAt(0)) >>> 0, 2166136261)
  for (let index = result.length - 1; index > 0; index -= 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    const swapIndex = state % (index + 1)
    ;[result[index], result[swapIndex]] = [result[swapIndex], result[index]]
  }
  return result
}

export function initialPatientEmotion(emotion: Patient['emotion']): ConversationEmotion {
  if (emotion === 'nervioso') return 'nervous'
  if (emotion === 'preocupado') return 'worried'
  if (emotion === 'animado') return 'happy'
  return 'calm'
}

export function emotionAfterResponse(
  current: ConversationEmotion,
  quality: ConversationQuality,
  questionId: string,
): ConversationEmotion {
  if (quality === 'inappropriate') return questionId === 'risks' || questionId === 'risk-clarification' ? 'worried' : 'confused'
  if (quality === 'incomplete') return current === 'worried' ? 'worried' : 'nervous'
  return questionId === 'introduction' || questionId === 'questions' ? 'happy' : 'calm'
}

const conceptWords: Record<ConversationTopic, string[]> = {
  introduction: ['presentarme', 'soy parte', 'equipo', 'acompan', 'escuch', 'soy tu doctora', 'soy tu doctor'],
  procedure: ['procedimiento', 'paso', 'mision', 'aventura', 'durante', 'ocurrira', 'hare', 'haremos', 'explicare'],
  benefits: ['objetivo', 'ayudar', 'beneficio', 'mejorar', 'aliviar', 'busca', 'servira'],
  risks: ['riesgo', 'sorpresa', 'complicacion', 'cambio', 'pausa', 'puede pasar'],
  recovery: ['despues', 'descansar', 'descanso', 'recuperacion', 'acompanamiento', 'equipo cerca'],
  questions: ['pregunta', 'duda', 'escuchar', 'responder', 'repasar', 'explicar de nuevo'],
}

const caringWords = ['entiendo', 'acompan', 'contigo', 'escuchar', 'cuidar', 'tranquil', 'puedes preguntar', 'estare a tu lado']
const dismissiveWords = ['callate', 'no preguntes', 'no importa', 'deja de', 'no es asunto', 'no hay riesgos', 'no hay ningun riesgo', 'todo sera perfecto', 'seguro que todo sale bien']

function normalizeText(text: string): string {
  return text.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim()
}

export interface FreeResponseScore {
  trust: number
  calm: number
  quality: ConversationQuality
  comprehension: number
  feedback: string
  concepts: ConversationTopic[]
}

export function scoreFreeResponse(text: string, expectedTopic?: ConversationTopic): FreeResponseScore {
  const normalized = normalizeText(text)
  const concepts = (Object.entries(conceptWords) as [ConversationTopic, string[]][])
    .filter(([, words]) => words.some(word => normalized.includes(word)))
    .map(([topic]) => topic)
  if (normalized.split(' ').filter(Boolean).length < 3) {
    return { trust: 0, calm: 0, quality: 'incomplete', comprehension: 0, feedback: 'Escribe una explicación un poco más completa para que el paciente pueda entenderla.', concepts }
  }
  if (dismissiveWords.some(word => normalized.includes(word))) {
    return { trust: -9, calm: -8, quality: 'inappropriate', comprehension: -4, feedback: 'La respuesta suena despectiva o promete demasiado. Reconoce su duda y explica con honestidad.', concepts }
  }
  const includesExpected = expectedTopic ? concepts.includes(expectedTopic) : concepts.length > 0
  if (!includesExpected) {
    return { trust: 1, calm: 1, quality: 'incomplete', comprehension: 2, feedback: `Aún falta explicar ${expectedTopic ? topicLabel(expectedTopic) : 'la idea principal'} con claridad.`, concepts }
  }
  const caring = caringWords.some(word => normalized.includes(word))
  return caring
    ? { trust: 7, calm: 6, quality: 'empathetic', comprehension: 16, feedback: `Buena explicación: abordaste ${topicLabel(expectedTopic ?? concepts[0])} con empatía.`, concepts }
    : { trust: 3, calm: 2, quality: 'incomplete', comprehension: 10, feedback: `Mencionaste ${topicLabel(expectedTopic ?? concepts[0])}; puedes sumar una frase amable para reconocer sus dudas.`, concepts }
}

function topicLabel(topic: ConversationTopic): string {
  const labels: Record<ConversationTopic, string> = {
    introduction: 'quién le acompaña',
    procedure: 'procedimiento',
    benefits: 'beneficios',
    risks: 'riesgos',
    recovery: 'recuperación',
    questions: 'sus preguntas',
  }
  return labels[topic]
}

export function scorePresetResponse(option: DialogueOption) {
  return {
    trust: option.trust,
    calm: option.calm,
    quality: option.quality,
    comprehension: option.comprehension,
    feedback: option.feedback,
    concepts: option.concepts ?? [],
  }
}

export function patientSurgeryNarrative(emotion: ConversationEmotion, trust: number): string {
  if (emotion === 'worried' || emotion === 'nervous') return 'El paciente aún se siente inquieto. El equipo puede acompañarle con palabras tranquilas durante la aventura.'
  if (emotion === 'confused') return 'El paciente conserva algunas dudas. El equipo le recordará que puede pedir una pausa y escuchar una explicación sencilla.'
  if (trust >= 70) return 'El paciente se siente escuchado y confía en el equipo. Este dato solo guía el tono narrativo, no afecta la cirugía.'
  return 'El paciente está acompañado. Su estado emocional guía el diálogo, no la estabilidad ni las reglas de la cirugía.'
}

export function canEnterPreparation(consent: boolean): boolean {
  return consent
}

export function preparationProgress(completedTasks: string[], totalTasks: number): number {
  if (totalTasks <= 0) return 0
  return Math.round((new Set(completedTasks).size / totalTasks) * 100)
}
