export type AssetStatus = 'procedural-placeholder' | 'pending'

export interface AssetManifestEntry {
  id: string
  category: 'character' | 'patient' | 'environment' | 'audio'
  status: AssetStatus
  path: string | null
  source: string
  license: string
}

export const assetManifest: AssetManifestEntry[] = [
  { id: 'layered-character-generator', category: 'character', status: 'procedural-placeholder', path: null, source: 'Phaser Graphics, authored in this project', license: 'Original project code; no external sprite files' },
  { id: 'patient-portraits', category: 'patient', status: 'procedural-placeholder', path: null, source: 'Phaser Graphics and CSS avatar layers, authored in this project', license: 'Original project code; no external sprite files' },
  { id: 'isometric-operating-room', category: 'environment', status: 'procedural-placeholder', path: null, source: 'Phaser Graphics, authored in this project', license: 'Original project code; no external image files' },
  { id: 'hospital-interior-generator', category: 'environment', status: 'procedural-placeholder', path: null, source: 'HospitalScene Phaser Graphics, authored in this project', license: 'Original project code; no external image files' },
  { id: 'final-character-sprite-atlas', category: 'character', status: 'pending', path: null, source: 'Not yet commissioned or acquired', license: 'Pending compatible-license verification' },
  { id: 'final-patient-sprite-atlas', category: 'patient', status: 'pending', path: null, source: 'Not yet commissioned or acquired', license: 'Pending compatible-license verification' },
  { id: 'final-room-art-pack', category: 'environment', status: 'pending', path: null, source: 'Not yet commissioned or acquired', license: 'Pending compatible-license verification' },
  { id: 'ambient-and-ui-sounds', category: 'audio', status: 'procedural-placeholder', path: null, source: 'Web Audio synthesis, authored in this project', license: 'Generated at runtime; no audio files' },
]

export function findAsset(id: string): AssetManifestEntry | undefined {
  return assetManifest.find(asset => asset.id === id)
}

export function isFinalSpriteAvailable(id: string): boolean {
  const asset = findAsset(id)
  return !!asset && asset.status !== 'pending' && asset.path !== null
}
