import { useEffect, useState } from 'react'
import { AudioLines, Moon, Sun, Volume2, VolumeX } from 'lucide-react'
import { audioManager } from '../game/AudioManager'
import { useGameStore } from '../store/gameStore'
import './AudioSettings.css'

export function AudioSettings() {
  const { audioPreferences, setAudioPreferences, nightMode, setNightMode } = useGameStore()
  const [enabled, setEnabled] = useState(audioManager.enabled)
  const [error, setError] = useState('')

  useEffect(() => {
    audioManager.configure(audioPreferences)
  }, [audioPreferences])

  const updateVolume = (key: 'musicVolume' | 'effectsVolume', value: number) => {
    const preferences = { ...audioPreferences, [key]: value }
    setAudioPreferences(preferences)
    audioManager.configure(preferences)
  }

  const toggleAudio = async () => {
    setError('')
    try {
      if (enabled) {
        await audioManager.disable()
        setEnabled(false)
      } else {
        await audioManager.enable(audioPreferences)
        setEnabled(true)
        audioManager.play('notification')
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo iniciar el audio.')
    }
  }

  return <section className="page detail-page audio-settings">
    <div className="eyebrow"><AudioLines size={14} /> CONFIGURACIÓN</div>
    <h1>Sonido y ambiente</h1>
    <p className="subtitle">El audio se activa únicamente cuando tú lo eliges. Los sonidos se generan localmente; no se descargan archivos.</p>
    <div className="appearance-card">
      <div><b>Tema visual</b><span>Elige entre el tema claro (blanco) y el oscuro (negro).</span></div>
      <button type="button" className="appearance-toggle" aria-pressed={nightMode} onClick={() => setNightMode(!nightMode)}>
        {nightMode ? <Sun size={16} /> : <Moon size={16} />}
        {nightMode ? 'Usar tema claro (blanco)' : 'Usar tema oscuro (negro)'}
      </button>
    </div>
    <div className="audio-card">
      <div className="audio-card-header"><span className="setup-icon lilac"><Volume2 /></span><div><h2>Audio del juego</h2><p>{enabled ? 'Audio activado en este dispositivo' : 'Audio apagado hasta que pulses activar'}</p></div><button className="primary-btn" onClick={toggleAudio}>{enabled ? <><VolumeX size={15} /> Desactivar</> : <><Volume2 size={15} /> Activar audio</>}</button></div>
      <label className="audio-slider"><span><b>Música ambiental</b><output>{Math.round(audioPreferences.musicVolume * 100)}%</output></span><input type="range" min="0" max="1" step="0.01" value={audioPreferences.musicVolume} onChange={event => updateVolume('musicVolume', Number(event.target.value))} /></label>
      <label className="audio-slider"><span><b>Efectos y notificaciones</b><output>{Math.round(audioPreferences.effectsVolume * 100)}%</output></span><input type="range" min="0" max="1" step="0.01" value={audioPreferences.effectsVolume} onChange={event => updateVolume('effectsVolume', Number(event.target.value))} /></label>
      {error && <p role="alert" className="audio-error">{error}</p>}
    </div>
  </section>
}
