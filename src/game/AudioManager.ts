import type { AudioPreferences } from '../types'

export type AudioEffect = 'button' | 'monitor' | 'alarm' | 'success' | 'failure' | 'notification'

const effectFrequencies: Record<AudioEffect, number> = {
  button: 620,
  monitor: 480,
  alarm: 260,
  success: 740,
  failure: 190,
  notification: 560,
}

function boundedVolume(value: number) {
  return Math.max(0, Math.min(1, value))
}

export function normalizeAudioPreferences(preferences: AudioPreferences): AudioPreferences {
  return {
    musicVolume: boundedVolume(preferences.musicVolume),
    effectsVolume: boundedVolume(preferences.effectsVolume),
  }
}

export class AudioManager {
  private context: AudioContext | null = null
  private musicGain: GainNode | null = null
  private effectsGain: GainNode | null = null
  private musicOscillators: OscillatorNode[] = []

  get enabled() {
    return this.context !== null
  }

  async enable(preferences: AudioPreferences) {
    if (!window.AudioContext) throw new Error('Este navegador no permite audio Web Audio.')
    if (!this.context) {
      this.context = new window.AudioContext()
      this.musicGain = this.context.createGain()
      this.effectsGain = this.context.createGain()
      this.musicGain.connect(this.context.destination)
      this.effectsGain.connect(this.context.destination)
      for (const frequency of [110, 164.81]) {
        const oscillator = this.context.createOscillator()
        oscillator.type = 'sine'
        oscillator.frequency.value = frequency
        oscillator.connect(this.musicGain)
        oscillator.start()
        this.musicOscillators.push(oscillator)
      }
    }
    if (this.context.state === 'suspended') await this.context.resume()
    this.configure(preferences)
  }

  configure(preferences: AudioPreferences) {
    if (!this.context || !this.musicGain || !this.effectsGain) return
    const now = this.context.currentTime
    const normalized = normalizeAudioPreferences(preferences)
    this.musicGain.gain.setTargetAtTime(normalized.musicVolume * 0.035, now, 0.08)
    this.effectsGain.gain.setTargetAtTime(normalized.effectsVolume, now, 0.04)
  }

  play(effect: AudioEffect) {
    if (!this.context || !this.effectsGain || this.context.state !== 'running') return
    const oscillator = this.context.createOscillator()
    const envelope = this.context.createGain()
    const now = this.context.currentTime
    const duration = effect === 'alarm' ? 0.4 : 0.14
    oscillator.type = effect === 'alarm' ? 'triangle' : 'sine'
    oscillator.frequency.setValueAtTime(effectFrequencies[effect], now)
    if (effect === 'success') oscillator.frequency.exponentialRampToValueAtTime(920, now + duration)
    if (effect === 'failure') oscillator.frequency.exponentialRampToValueAtTime(120, now + duration)
    envelope.gain.setValueAtTime(0.0001, now)
    envelope.gain.exponentialRampToValueAtTime(0.13, now + 0.025)
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration)
    oscillator.connect(envelope)
    envelope.connect(this.effectsGain)
    oscillator.start(now)
    oscillator.stop(now + duration)
  }

  async disable() {
    if (!this.context) return
    const context = this.context
    this.context = null
    this.musicGain = null
    this.effectsGain = null
    this.musicOscillators = []
    await context.close()
  }
}

export const audioManager = new AudioManager()
