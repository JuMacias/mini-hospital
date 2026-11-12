import { useEffect, useMemo, useRef, useState } from 'react'
import Phaser from 'phaser'
import { ArrowLeft, ArrowRight, BedDouble, Check, ChevronRight, Clock3, Coins, Heart, Lightbulb, LockKeyhole, Minus, Move, Plus, RotateCcw, RotateCw, Sparkles, Star, Trash2, Trees, Users, X } from 'lucide-react'
import { staff } from '../data/staff'
import { patients } from '../data/patients'
import { Avatar } from './Avatar'
import { createInitialHospitalState, canBuyHospitalItem, canUnlockHospitalRoom, canUpgradeHospitalRoom, getRoomUpgradeCost, hospitalCategoryLabels, hospitalItems, hospitalLevelForExperience, hospitalRooms, hospitalComfortScore, successfulSurgeryCount } from '../game/hospitalRules'
import { getTeamMemberView, isValidTeam } from '../game/teamRules'
import { HospitalScene, type HospitalSceneData } from '../game/HospitalScene'
import { getHospitalMissionProgress, hospitalMissions } from '../game/hospitalOperations'
import { useGameStore } from '../store/gameStore'
import type { Doctor, HospitalItemCategory, HospitalRoomId, PatientCareStatus } from '../types'
import './HospitalPage.css'

const defaultDoctor: Doctor = { name: 'Dra. Alex', gender: 'doctora', skin: '#bd8065', hair: '#47302c', eyes: '#536d69', uniform: '#63c9bd', accessory: 'gorra' }
const categories = Object.keys(hospitalCategoryLabels) as HospitalItemCategory[]
const categoryIcons: Record<HospitalItemCategory, typeof Sparkles> = {
  wall: Sparkles, floor: Star, bed: BedDouble, chair: Users, table: BedDouble,
  plant: Trees, picture: Star, light: Lightbulb, decor: Sparkles,
}

type Purchase = { kind: 'room'; roomId: HospitalRoomId } | { kind: 'item'; itemId: string } | { kind: 'upgrade'; roomId: HospitalRoomId }
type PlacementPreview = { roomId: HospitalRoomId; x: number; y: number; valid: boolean }

const careStatusLabels: Record<PatientCareStatus, string> = {
  arrived: 'Llegó a recepción',
  waiting: 'En espera',
  consultation: 'En consulta',
  preparation: 'En preparación',
  surgery: 'En cirugía',
  recovery: 'En recuperación',
  discharged: 'Alta completada',
  declined: 'Consentimiento rechazado',
  failed: 'Aventura fallida',
}

export function HospitalPage({ onStartPreop, onBack }: { onStartPreop: (patientId: string) => void; onBack: () => void }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const sceneErrorRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<Phaser.Game | null>(null)
  const sceneDataRef = useRef<HospitalSceneData | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<HospitalItemCategory>('wall')
  const [pendingPurchase, setPendingPurchase] = useState<Purchase | null>(null)
  const [notice, setNotice] = useState('')
  const [placementMode, setPlacementMode] = useState<{ itemId: string; placementId?: string; roomId?: HospitalRoomId } | null>(null)
  const [placementPreview, setPlacementPreview] = useState<PlacementPreview | null>(null)
  const [placementRotation, setPlacementRotation] = useState(0)
  const placementModeRef = useRef(placementMode)
  const {
    doctor, selectedStaff, staffProfiles, hospital, experience, surgeryHistory, coins,
    roleAssignments, setPatientCareStatus, claimHospitalMission, placeHospitalFurniture,
    uninstallHospitalItem,
    rotateHospitalFurniture, removeHospitalFurniture,
    selectHospitalRoom, purchaseHospitalRoom, purchaseHospitalItem, installHospitalItem, upgradeHospitalRoom,
  } = useGameStore()
  const mainDoctor = doctor ?? defaultDoctor
  const team = useMemo(() => selectedStaff
    .map(id => staff.find(person => person.id === id))
    .filter((person): person is (typeof staff)[number] => !!person)
    .map(person => getTeamMemberView(person, staffProfiles)), [selectedStaff, staffProfiles])
  const receptionist = useMemo(() => {
    const person = staff.find(candidate => !selectedStaff.includes(candidate.id)) ?? staff[0]
    return getTeamMemberView(person, staffProfiles)
  }, [selectedStaff, staffProfiles])
  const sceneData = useMemo<HospitalSceneData>(() => ({
    doctor: mainDoctor,
    team,
    receptionist,
    patients,
    hospital,
  }), [mainDoctor, team, receptionist, hospital])

  useEffect(() => {
    if (!hostRef.current) return
    let game: Phaser.Game | undefined
    const handleRoomSelection = (roomId: HospitalRoomId) => selectHospitalRoom(roomId)
    const syncCurrentData = () => {
      if (sceneDataRef.current) game?.events.emit('hospital:state', sceneDataRef.current)
      if (placementModeRef.current) game?.events.emit('hospital:placement-mode', placementModeRef.current)
    }
    const handlePlacementPreview = (preview: PlacementPreview) => setPlacementPreview(preview)
    try {
      game = new Phaser.Game({
        type: Phaser.CANVAS,
        width: Math.max(320, hostRef.current.clientWidth),
        height: Math.max(360, hostRef.current.clientHeight),
        parent: hostRef.current,
        backgroundColor: '#eff7f3',
        scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
        render: { antialias: true, pixelArt: false, transparent: false },
        scene: [new HospitalScene(sceneDataRef.current ?? {
          doctor: defaultDoctor,
          team: [],
          patients,
          hospital: createInitialHospitalState(),
        })],
      })
      gameRef.current = game
      game.events.on('hospital:room-selected', handleRoomSelection)
      game.events.on('hospital:scene-ready', syncCurrentData)
      game.events.on('hospital:placement-preview', handlePlacementPreview)
      game.events.once(Phaser.Core.Events.DESTROY, () => {
        game?.events.off('hospital:room-selected', handleRoomSelection)
        game?.events.off('hospital:scene-ready', syncCurrentData)
        game?.events.off('hospital:placement-preview', handlePlacementPreview)
      })
    } catch (error) {
      if (sceneErrorRef.current) {
        sceneErrorRef.current.textContent = `No se pudo iniciar la vista 2.5D: ${error instanceof Error ? error.message : 'error desconocido'}`
        sceneErrorRef.current.hidden = false
      }
    }
    return () => {
      if (gameRef.current === game) gameRef.current = null
      game?.destroy(true)
    }
  }, [selectHospitalRoom])

  useEffect(() => {
    sceneDataRef.current = sceneData
    gameRef.current?.events.emit('hospital:state', sceneData)
  }, [sceneData])

  useEffect(() => {
    placementModeRef.current = placementMode
    gameRef.current?.events.emit('hospital:placement-mode', placementMode)
  }, [placementMode])

  const room = hospitalRooms.find(item => item.id === hospital.selectedRoom) ?? hospitalRooms[0]
  const roomIsUnlocked = hospital.unlockedRooms.includes(room.id)
  const currentRoomLevel = hospital.roomLevels[room.id] ?? 1
  const upgradeCost = getRoomUpgradeCost(currentRoomLevel)
  const upgradeBlocked = currentRoomLevel < 3 && coins < upgradeCost
  const wins = successfulSurgeryCount(surgeryHistory)
  const level = Math.max(hospital.level, hospitalLevelForExperience(experience))
  const levelProgress = level >= 5 ? 100 : experience % 100
  const visibleItems = hospitalItems.filter(item => item.category === selectedCategory)
  const installed = hospital.decorations[room.id]?.[selectedCategory]

  const startPurchase = (purchase: Purchase) => {
    setNotice('')
    setPendingPurchase(purchase)
  }
  const confirmPurchase = () => {
    if (!pendingPurchase) return
    let success = false
    if (pendingPurchase.kind === 'room') success = purchaseHospitalRoom(pendingPurchase.roomId)
    if (pendingPurchase.kind === 'item') success = purchaseHospitalItem(room.id, pendingPurchase.itemId)
    if (pendingPurchase.kind === 'upgrade') success = upgradeHospitalRoom(pendingPurchase.roomId)
    setNotice(success ? '¡Mejora aplicada y guardada!' : 'No se pudo completar la compra. Revisa el saldo y los requisitos.')
    setPendingPurchase(null)
  }
  const selectRoom = (roomId: HospitalRoomId) => {
    selectHospitalRoom(roomId)
    setNotice('')
  }
  const startPlacement = (itemId: string, placementId?: string) => {
    const selectedPlacement = hospital.furniture.find(item => item.id === placementId)
    const roomId = selectedPlacement?.roomId ?? room.id
    setPlacementPreview(null)
    setPlacementRotation(selectedPlacement?.rotation ?? 0)
    const mode = { itemId, roomId, ...(placementId ? { placementId } : {}) }
    setPlacementMode(mode)
    gameRef.current?.events.emit('hospital:placement-mode', mode)
  }
  const cancelPlacement = () => {
    setPlacementMode(null)
    setPlacementPreview(null)
  }
  const confirmPlacement = () => {
    if (!placementMode || !placementPreview?.valid) return
    const id = placementMode.placementId
      ?? globalThis.crypto?.randomUUID?.()
      ?? `furniture-${placementMode.itemId}-${Date.now()}`
    const existing = hospital.furniture.find(item => item.id === placementMode.placementId)
    const success = placeHospitalFurniture({
      id,
      roomId: placementPreview.roomId,
      itemId: placementMode.itemId,
      x: placementPreview.x,
      y: placementPreview.y,
      rotation: placementRotation,
    })
    setNotice(success ? 'Mueble colocado y guardado.' : 'No se pudo colocar: elige un espacio libre dentro de la habitación.')
    if (success) cancelPlacement()
    if (existing && !success) setNotice('No se pudo mover el mueble; esa zona está ocupada o bloqueada.')
  }
  const patientAction = (patientId: string, status: PatientCareStatus) => {
    if (status === 'waiting' || status === 'declined') {
      onStartPreop(patientId)
      return
    }
    if (status === 'arrived') {
      setNotice(setPatientCareStatus(patientId, 'waiting') ? 'Paciente recibido y añadido a la sala de espera.' : 'No se pudo actualizar el turno.')
    } else if (status === 'recovery') {
      setNotice(setPatientCareStatus(patientId, 'discharged') ? 'Alta ficticia registrada. ¡Gracias por acompañar a este paciente!' : 'No se pudo completar el alta.')
    }
  }
  const missionContext = {
    careQueue: hospital.careQueue,
    surgeryCount: surgeryHistory.length,
    roomLevels: hospital.roomLevels,
    teamIsValid: isValidTeam(selectedStaff, roleAssignments),
  }
  const careCounts = {
    pending: hospital.careQueue.filter(item => item.status === 'arrived' || item.status === 'waiting').length,
    consultation: hospital.careQueue.filter(item => item.status === 'consultation').length,
    preparation: hospital.careQueue.filter(item => item.status === 'preparation').length,
    surgery: hospital.careQueue.filter(item => item.status === 'surgery').length,
    recovery: hospital.careQueue.filter(item => item.status === 'recovery').length,
    finished: hospital.careQueue.filter(item => ['discharged', 'failed', 'declined'].includes(item.status)).length,
  }
  const placementItem = placementMode ? hospitalItems.find(item => item.id === placementMode.itemId) : undefined
  const nextPatient = hospital.careQueue.find(item => ['waiting', 'declined'].includes(item.status))
  const roomPlacements = hospital.furniture.filter(item => item.roomId === room.id)

  const pendingDetails = pendingPurchase?.kind === 'room'
    ? hospitalRooms.find(item => item.id === pendingPurchase.roomId)
    : pendingPurchase?.kind === 'item'
      ? hospitalItems.find(item => item.id === pendingPurchase.itemId)
      : null
  const pendingPrice = pendingPurchase?.kind === 'room'
    ? hospitalRooms.find(item => item.id === pendingPurchase.roomId)?.unlockPrice ?? 0
    : pendingPurchase?.kind === 'item'
      ? hospitalItems.find(item => item.id === pendingPurchase.itemId)?.price ?? 0
      : pendingPurchase?.kind === 'upgrade'
        ? getRoomUpgradeCost(hospital.roomLevels[pendingPurchase.roomId] ?? 1)
        : 0
  const pendingTitle = pendingPurchase?.kind === 'upgrade'
    ? `Mejorar ${hospitalRooms.find(item => item.id === pendingPurchase.roomId)?.name ?? 'habitación'}`
    : pendingDetails?.name ?? ''

  return <section className="page detail-page hospital-page">
    <button className="back-link" onClick={onBack}><ArrowLeft size={16} /> Volver al hospital principal</button>
    <div className="hospital-heading">
      <div><div className="eyebrow">TU ESPACIO, TU AVENTURA</div><h1>Mi Hospital</h1><p className="subtitle">Recorre, personaliza y amplía tu hospital con las monedas de tus aventuras.</p></div>
      <div className="hospital-wallet"><span><Coins size={16} />{coins}<small>MONEDAS</small></span><span><Sparkles size={16} />{experience}<small>EXPERIENCIA</small></span></div>
    </div>
    <div className="hospital-level-card">
      <div className="hospital-level-medal"><HospitalIcon /></div>
      <div className="hospital-level-copy"><b>Nivel de hospital {level}</b><span>{wins} {wins === 1 ? 'aventura completada' : 'aventuras completadas'} · {hospitalComfortScore(hospital)} puntos de comodidad</span><div className="hospital-xp-track"><i style={{ width: `${levelProgress}%` }} /></div><small>{level >= 5 ? 'Nivel máximo alcanzado' : `${100 - (experience % 100)} EXP para el siguiente nivel`}</small></div>
      <div className="hospital-level-tag">NIVEL {level}</div>
    </div>
    <section className="hospital-operations" aria-label="Gestión de pacientes y misiones">
      <div className="hospital-queue">
        <div className="hospital-operations-heading"><div><span className="field-label">RECEPCIÓN Y TURNOS</span><h2>Pacientes del hospital</h2></div><span>{hospital.careQueue.length} turnos</span></div>
        <div className="hospital-queue-counts" aria-label="Resumen de turnos">
          <span><b>{careCounts.pending}</b>Pendientes</span><span><b>{careCounts.consultation}</b>En consulta</span>
          <span><b>{careCounts.preparation}</b>Preparados</span><span><b>{careCounts.surgery}</b>En cirugía</span>
          <span><b>{careCounts.recovery}</b>En recuperación</span><span><b>{careCounts.finished}</b>Finalizados</span>
        </div>
        <div className="hospital-patient-list">
          {hospital.careQueue.map((care, index) => {
            const patient = patients.find(item => item.id === care.patientId)
            if (!patient) return null
            const waitMinutes = Math.max(1, index + 1)
            return <article className={`hospital-patient-card status-${care.status}`} key={care.id}>
              <div className="hospital-patient-avatar"><Avatar color={patient.uniform} hair={patient.hair} skin={patient.skin} hairStyle={patient.hairStyle} accessory={patient.accessory} motion={care.status === 'failed' ? 'sad' : care.status === 'consultation' ? 'talk' : 'idle'} /></div>
              <div className="hospital-patient-copy"><div><b>{patient.name}</b><span>{patient.age} años</span></div><small>{patient.reason}</small><span className="hospital-care-status">{careStatusLabels[care.status]}</span></div>
              <div className="hospital-patient-action">
                {(care.status === 'arrived' || care.status === 'waiting') && <small><Clock3 size={12} /> {care.status === 'arrived' ? `Espera ficticia: ${waitMinutes} min` : 'Turno en espera'}</small>}
                {care.status === 'failed' && <small className="care-failure-note">La aventura fallida no se registra como alta.</small>}
                {care.status === 'arrived' && <button onClick={() => patientAction(patient.id, care.status)}>Recibir</button>}
                {care.status === 'waiting' && <button onClick={() => patientAction(patient.id, care.status)}>Atender</button>}
                {care.status === 'declined' && <button onClick={() => patientAction(patient.id, care.status)}>Volver a explicar</button>}
                {care.status === 'recovery' && <button onClick={() => patientAction(patient.id, care.status)}>Dar alta</button>}
              </div>
            </article>
          })}
        </div>
      </div>
      <div className="hospital-missions">
        <div className="hospital-operations-heading"><div><span className="field-label">OBJETIVOS DEL HOSPITAL</span><h2>Misiones</h2></div><Sparkles size={18} /></div>
        <div className="hospital-mission-list">
          {hospitalMissions.map(mission => {
            const progress = getHospitalMissionProgress(mission.id, missionContext)
            const claimed = hospital.claimedMissionIds.includes(mission.id)
            const ready = progress >= mission.target
            return <article className={`hospital-mission ${claimed ? 'claimed' : ''}`} key={mission.id}>
              <div><b>{mission.title}</b><span>{mission.description}</span><small>{claimed ? 'Recompensa reclamada' : ready ? `Lista · ${mission.reward} monedas` : `${progress} / ${mission.target}`}</small></div>
              <button disabled={!ready || claimed} onClick={() => setNotice(claimHospitalMission(mission.id) ? `Misión completada: +${mission.reward} monedas.` : 'No se pudo reclamar esta misión.')}>{claimed ? <Check size={14} /> : <><Coins size={13} />{mission.reward}</>}</button>
            </article>
          })}
        </div>
      </div>
    </section>
    <div className="hospital-workspace">
      <div className="hospital-map-card">
        <div className="hospital-map-toolbar"><div><b>Explora tus espacios</b><span>Arrastra para recorrer · usa la rueda o los controles para acercar</span></div><div className="hospital-zoom-controls"><button aria-label="Alejar mapa" onClick={() => gameRef.current?.events.emit('hospital:zoom', -0.12)}><Minus size={16} /></button><button aria-label="Acercar mapa" onClick={() => gameRef.current?.events.emit('hospital:zoom', 0.12)}><Plus size={16} /></button><button aria-label="Centrar mapa" onClick={() => gameRef.current?.events.emit('hospital:camera-reset')}><RotateCcw size={15} /></button></div></div>
        <div className="hospital-scene-wrap"><div className="hospital-scene-host" ref={hostRef} aria-label="Mapa isométrico interactivo del hospital" /><div className="hospital-scene-error" ref={sceneErrorRef} role="alert" hidden /></div>
        <div className="hospital-room-strip" aria-label="Habitaciones">
          {hospitalRooms.map(candidate => {
            const unlocked = hospital.unlockedRooms.includes(candidate.id)
            return <button key={candidate.id} className={`hospital-room-chip ${hospital.selectedRoom === candidate.id ? 'selected' : ''} ${!unlocked ? 'locked' : ''}`} onClick={() => selectRoom(candidate.id)}>
              {!unlocked && <LockKeyhole size={13} />}<span>{candidate.name}</span>{unlocked && <small>N{hospital.roomLevels[candidate.id] ?? 1}</small>}
            </button>
          })}
        </div>
        <p className="hospital-art-note"><span className="hospital-art-dot" /> Personajes y mobiliario son ilustraciones vectoriales originales generadas por Phaser; el arte final de habitaciones aún está pendiente.</p>
      </div>
      <aside className="hospital-room-panel">
        <div className="hospital-room-panel-title">
          <div className={`hospital-room-icon ${roomIsUnlocked ? '' : 'locked'}`}>{roomIsUnlocked ? <Heart size={20} /> : <LockKeyhole size={20} />}</div>
          <div><span className="field-label">{roomIsUnlocked ? 'HABITACIÓN' : 'NUEVO ESPACIO'}</span><h2>{room.name}</h2></div>
        </div>
        <p className="hospital-room-description">{room.description}</p>
        {roomIsUnlocked ? <>
          <div className="room-level-summary"><span>Nivel de habitación</span><b>{currentRoomLevel} / 3</b></div>
          <button className="hospital-upgrade-button" disabled={!canUpgradeHospitalRoom(room.id, hospital, coins)} title={upgradeBlocked ? `Te faltan ${upgradeCost - coins} monedas` : undefined} onClick={() => startPurchase({ kind: 'upgrade', roomId: room.id })}>
            <Sparkles size={15} /><span>{currentRoomLevel >= 3 ? 'Nivel máximo' : `Mejorar por ${upgradeCost} monedas`}</span><ChevronRight size={15} />
          </button>
          {upgradeBlocked && <small className="hospital-requirement-note" role="status">Te faltan {upgradeCost - coins} monedas para mejorar esta habitación.</small>}
          {room.id === 'operating' && <button className="hospital-start-button" disabled={!nextPatient} onClick={() => nextPatient && onStartPreop(nextPatient.patientId)}>Iniciar atención a un paciente <ArrowRight size={15} /></button>}
          <div className="hospital-shop-heading"><div><b>Personalizar</b><small>Las compras se aplican al instante al confirmar.</small></div></div>
          <div className="hospital-category-row">{categories.map(category => {
            const Icon = categoryIcons[category]
            return <button key={category} className={selectedCategory === category ? 'active' : ''} onClick={() => setSelectedCategory(category)}><Icon size={14} />{hospitalCategoryLabels[category]}</button>
          })}</div>
          <div className="hospital-item-list">
            {visibleItems.map(item => {
              const owned = hospital.unlockedItems.includes(item.id)
              const isInstalled = installed === item.id
              const canBuy = canBuyHospitalItem(item.id, room.id, hospital, coins)
              const blockedByLevel = item.levelRequired > level
              const blockedByBalance = !owned && !blockedByLevel && coins < item.price
              const missingCoins = item.price - coins
              return <article className={`hospital-item-card ${isInstalled ? 'installed' : ''}`} key={item.id}>
                <div className={`hospital-item-swatch swatch-${item.category}`} style={item.category === 'wall' ? { backgroundColor: item.value } : undefined} aria-hidden="true">
                  {item.category === 'floor' ? <span className={`floor-sample ${item.value}`} /> : item.category === 'plant' ? <Trees size={19} /> : item.category === 'light' ? <Lightbulb size={19} /> : item.category === 'bed' ? <BedDouble size={19} /> : item.category === 'wall' ? null : <Star size={18} />}
                </div>
                <div className="hospital-item-copy"><b>{item.name}</b><span>{item.description}</span><small>{blockedByLevel ? `Requiere nivel ${item.levelRequired}` : blockedByBalance ? `Cuesta ${item.price}; te faltan ${missingCoins} monedas` : `${item.price} monedas`}</small></div>
                {isInstalled ? <span className="installed-badge"><Check size={13} /> Puesto</span> : owned
                  ? <button className="install-item-button" onClick={() => installHospitalItem(room.id, item.id)}>Instalar</button>
                  : <button className="buy-item-button" disabled={!canBuy} title={blockedByBalance ? `Te faltan ${missingCoins} monedas` : blockedByLevel ? `Requiere nivel ${item.levelRequired}` : undefined} onClick={() => startPurchase({ kind: 'item', itemId: item.id })}>{blockedByLevel ? `Nivel ${item.levelRequired}` : <><Coins size={13} />{item.price}</>}</button>}
                {isInstalled && !['wall', 'floor'].includes(item.category) && <button className="furniture-move-button" onClick={() => startPlacement(item.id, hospital.furniture.find(placement => placement.roomId === room.id && placement.itemId === item.id)?.id)} aria-label={`Mover ${item.name}`}><Move size={13} />Mover</button>}
                {isInstalled && <button className="furniture-remove-button" onClick={() => setNotice(uninstallHospitalItem(room.id, item.id) ? `${item.name} retirado.` : 'No se pudo retirar el artículo.')} aria-label={`Retirar ${item.name}`}><Trash2 size={13} /></button>}
              </article>
            })}
          </div>
          {roomPlacements.length > 0 && <div className="hospital-placed-list">
            <b>Elementos colocados</b>
            {roomPlacements.map(placement => <div key={placement.id}>
              <span>{hospitalItems.find(item => item.id === placement.itemId)?.name ?? 'Mueble'} · {placement.rotation}°</span>
              <button onClick={() => startPlacement(placement.itemId, placement.id)} aria-label="Mover mueble"><Move size={13} /></button>
              <button onClick={() => setNotice(rotateHospitalFurniture(placement.id) ? 'Mueble girado y guardado.' : 'No se pudo girar el mueble.')} aria-label="Girar mueble"><RotateCw size={13} /></button>
              <button onClick={() => setNotice(removeHospitalFurniture(placement.id) ? 'Mueble retirado.' : 'No se pudo retirar el mueble.')} aria-label="Retirar mueble"><Trash2 size={13} /></button>
            </div>)}
          </div>}
          {placementMode && <div className="hospital-placement-panel" role="status">
            <div><b>Vista previa: {placementItem?.name ?? 'mueble'}</b><span>{placementPreview?.valid ? `${hospitalRooms.find(candidate => candidate.id === placementPreview.roomId)?.name} · ${Math.round(placementPreview.x)}, ${Math.round(placementPreview.y)}` : 'Pulsa un espacio libre dentro de una habitación para previsualizar.'}</span></div>
            <div><button onClick={() => setPlacementRotation(value => (value + 45) % 360)} aria-label="Rotar vista previa"><RotateCw size={14} /> {placementRotation}°</button><button disabled={!placementPreview?.valid} onClick={confirmPlacement}><Check size={14} /> Confirmar</button><button onClick={cancelPlacement}><X size={14} /> Cancelar</button></div>
          </div>}
        </> : <div className="hospital-unlock-panel">
          <b>Requisitos para desbloquear</b>
          <div className="unlock-condition"><span>Nivel del hospital</span><strong>{hospital.level} / {room.levelRequired}</strong></div>
          <div className="unlock-condition"><span>Experiencia</span><strong>{experience} / {room.experienceRequired} EXP</strong></div>
          <div className="unlock-condition"><span>Cirugías completadas</span><strong>{wins} / {room.surgeriesRequired}</strong></div>
          <div className="unlock-condition"><span>Precio de apertura</span><strong>{room.unlockPrice} monedas</strong></div>
          <button className="hospital-start-button" disabled={!canUnlockHospitalRoom(room.id, hospital, experience, wins, coins)} onClick={() => startPurchase({ kind: 'room', roomId: room.id })}>
            <LockKeyhole size={15} /> Desbloquear habitación
          </button>
          {!canUnlockHospitalRoom(room.id, hospital, experience, wins, coins) && <small className="hospital-requirement-note">Completa aventuras, gana experiencia y reúne monedas para abrir este espacio.</small>}
        </div>}
        {notice && !notice.startsWith('No se pudo iniciar') && <div className="hospital-notice" role="status">{notice}</div>}
        {pendingPurchase && <div className="hospital-confirm-backdrop" role="presentation">
          <div className="hospital-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="hospital-confirm-title">
            <div className="confirm-emblem"><Coins size={21} /></div><h3 id="hospital-confirm-title">Confirmar compra</h3><p>{pendingTitle ? `${pendingTitle} se aplicará a ${pendingPurchase.kind === 'room' ? 'tu hospital' : room.name}.` : '¿Quieres mejorar esta habitación?'}</p>
            <div className="confirm-price"><span>Precio</span><b>{pendingPrice} monedas</b></div>
            <small>Saldo disponible: {coins} monedas</small>
            <div className="confirm-actions"><button onClick={() => setPendingPurchase(null)}>Cancelar</button><button disabled={coins < pendingPrice} onClick={confirmPurchase}>Confirmar <Check size={14} /></button></div>
          </div>
        </div>}
      </aside>
    </div>
    <div className="hospital-footer-note"><Users size={15} /><span>La decoración mejora el ambiente y la comodidad. No cambia las probabilidades ni garantiza resultados en las aventuras.</span></div>
  </section>
}

function HospitalIcon() {
  return <span className="hospital-icon-cross" aria-hidden="true">+</span>
}
