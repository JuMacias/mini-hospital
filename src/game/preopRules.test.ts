import { describe, expect, it } from 'vitest'
import { dialogueQuestions } from '../data/patients'
import { canEnterPreparation, canGiveConsent, canSelectPatient, emotionAfterResponse, getNextDialogueQuestion, initialPatientEmotion, orderDialogueOptions, preparationProgress, scoreFreeResponse } from './preopRules'
import type { ConversationEntry } from '../types'
import { createGameStore } from '../store/gameStore'
import type { StateStorage } from 'zustand/middleware'

const completedConversation: ConversationEntry[] = dialogueQuestions.map(question => ({
  questionId: question.id,
  response: 'Te explicaré cada paso y estaré contigo.',
  trustDelta: 7,
  calmDelta: 7,
  source: 'free',
}))

describe('reglas de atención preoperatoria', () => {
  it('solo permite seleccionar pacientes del catálogo', () => {
    expect(canSelectPatient('luna', ['luna', 'tomas'])).toBe(true)
    expect(canSelectPatient('desconocido', ['luna', 'tomas'])).toBe(false)
  })

  it('requiere responder cada pregunta y registrar consentimiento', () => {
    expect(canGiveConsent(completedConversation.slice(0, 2))).toBe(false)
    expect(canGiveConsent(completedConversation)).toBe(true)
    expect(canEnterPreparation(false)).toBe(false)
    expect(canEnterPreparation(true)).toBe(true)
  })

  it('calcula progreso sin contar tareas repetidas', () => {
    expect(preparationProgress(['cama', 'cama'], 4)).toBe(25)
    expect(preparationProgress(['a', 'b', 'c', 'd'], 4)).toBe(100)
    expect(preparationProgress(['a'], 0)).toBe(0)
  })

  it('evalúa respuestas libres solo con criterios locales básicos', () => {
    expect(scoreFreeResponse('Te explicaré cada paso y estaré contigo.').quality).toBe('empathetic')
    expect(scoreFreeResponse('No preguntes, no importa.').quality).toBe('inappropriate')
    expect(scoreFreeResponse('Está bien.').quality).toBe('incomplete')
  })

  it('ramifica las preguntas siguientes según la reacción emocional', () => {
    const introduction = { ...completedConversation[0], questionId: 'introduction' }
    const procedure = { ...completedConversation[1], questionId: 'procedure' }
    const unclearRisks = { ...completedConversation.find(entry => entry.questionId === 'risks')!, quality: 'inappropriate' as const, comprehensionDelta: -4 }
    expect(getNextDialogueQuestion([], 'nervous', 0)?.id).toBe('introduction')
    expect(getNextDialogueQuestion([introduction], 'nervous', 10)?.id).toBe('procedure')
    expect(getNextDialogueQuestion([introduction, procedure], 'nervous', 30)?.id).toBe('questions')
    expect(getNextDialogueQuestion([introduction, procedure], 'worried', 30)?.id).toBe('risks')
    expect(getNextDialogueQuestion([introduction, procedure, unclearRisks], 'worried', 25)?.id).toBe('risk-clarification')
  })

  it('cambia determinísticamente la posición de las opciones adecuadas', () => {
    const positions = dialogueQuestions.map(question => orderDialogueOptions(question.options, `luna:${question.id}`)
      .findIndex(option => option.quality === 'empathetic'))
    expect(new Set(positions).size).toBeGreaterThan(1)
    expect(orderDialogueOptions(dialogueQuestions[0].options, 'luna:introduction'))
      .toEqual(orderDialogueOptions(dialogueQuestions[0].options, 'luna:introduction'))
  })

  it('actualiza emociones y exige explicación suficiente de riesgos para consentir', () => {
    const enough = dialogueQuestions.map(question => ({
      ...completedConversation.find(entry => entry.questionId === question.id)!,
      questionId: question.id,
      comprehensionDelta: question.id === 'risks' ? 18 : 12,
      quality: 'empathetic' as const,
    }))
    expect(initialPatientEmotion('preocupado')).toBe('worried')
    expect(emotionAfterResponse('calm', 'inappropriate', 'risks')).toBe('worried')
    expect(emotionAfterResponse('worried', 'empathetic', 'questions')).toBe('happy')
    expect(canGiveConsent(enough, 65)).toBe(true)
    expect(canGiveConsent(enough.map(entry => entry.questionId === 'risks' ? { ...entry, comprehensionDelta: 2 } : entry), 65)).toBe(false)
    expect(canGiveConsent(enough, 30)).toBe(false)
  })

  it('evalúa conceptos, sinónimos y falta de información sin simular IA', () => {
    expect(scoreFreeResponse('Te contaré cada paso de la misión y estaré contigo.', 'procedure')).toMatchObject({
      quality: 'empathetic', concepts: ['procedure'],
    })
    expect(scoreFreeResponse('Pueden surgir sorpresas y el equipo puede hacer una pausa.', 'risks').concepts).toContain('risks')
    expect(scoreFreeResponse('Sí.', 'recovery').feedback).toContain('más completa')
    expect(scoreFreeResponse('No hay riesgos y todo será perfecto.', 'risks').quality).toBe('inappropriate')
  })

  it('persiste respuestas, emociones, comprensión y consentimiento sin duplicarlas al cargar', async () => {
    const values = new Map<string, string>()
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    } satisfies StateStorage
    const store = createGameStore(storage)
    store.getState().beginPreop('luna')
    dialogueQuestions.forEach(question => store.getState().respondToPatient({
      questionId: question.id,
      response: 'Explicación amable',
      trustDelta: 8,
      calmDelta: 8,
      comprehensionDelta: question.id === 'risks' ? 18 : 12,
      quality: 'empathetic',
      feedback: `Feedback ${question.id}`,
      concepts: [question.topic === 'risk-clarification' ? 'risks' : question.topic],
      source: 'preset',
    }))
    store.getState().setConsentDecision('accepted')
    const restored = createGameStore(storage)
    await restored.persist.rehydrate()
    expect(restored.getState()).toMatchObject({
      selectedPatient: 'luna',
      understanding: 78,
      patientEmotion: 'happy',
      consent: true,
      consentDecision: 'accepted',
    })
    expect(restored.getState().conversation).toHaveLength(dialogueQuestions.length)
    expect(new Set(restored.getState().conversation.map(entry => entry.id)).size).toBe(dialogueQuestions.length)
  })

  it('migra las partidas v3 preservando la conversación y el consentimiento', async () => {
    const values = new Map<string, string>()
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    } satisfies StateStorage
    values.set('mini-hospital-save', JSON.stringify({
      state: {
        selectedPatient: 'tomas',
        conversation: [{ questionId: 'risks', response: 'A veces hay sorpresas.', trustDelta: 8, calmDelta: 7, source: 'preset' }],
        trust: 61,
        calm: 58,
        consent: true,
      },
      version: 3,
    }))
    const store = createGameStore(storage)
    await store.persist.rehydrate()
    expect(store.getState()).toMatchObject({
      selectedPatient: 'tomas',
      trust: 61,
      consent: true,
      consentDecision: 'accepted',
      understanding: 65,
    })
    expect(store.getState().conversation).toHaveLength(1)
    expect(JSON.parse(values.get('mini-hospital-save') ?? '{}').version).toBe(8)
  })

  it('respeta el rechazo aunque la comprensión no alcance el umbral para aceptar', () => {
    const store = createGameStore()
    store.getState().beginPreop('luna')
    store.getState().setConsentDecision('declined')
    expect(store.getState().consent).toBe(false)
    expect(store.getState().consentDecision).toBe('declined')
    expect(store.getState().trust).toBe(45)
  })
})
