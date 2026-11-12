import Phaser from 'phaser'
import { CharacterSprite } from './CharacterSprite'
import { disposeCharacters } from './characterVisuals'
import { hospitalItems, hospitalRooms } from './hospitalRules'
import { canPlaceHospitalFurniture, hospitalRoomWorldPositions } from './hospitalOperations'
import type { CharacterAnimation, Doctor, HospitalRoomId, HospitalState, MedicalProfessional, Patient } from '../types'

export interface HospitalSceneData {
  doctor: Doctor
  team: MedicalProfessional[]
  receptionist?: MedicalProfessional
  patients: Patient[]
  hospital: HospitalState
}

interface RoomPosition {
  x: number
  y: number
}

const worldSize = { width: 1200, height: 780 }
const roomPositions = hospitalRoomWorldPositions
const roomHalfWidth = 162
const roomHalfHeight = 91
const initialWall = 0xd9ebe4
const initialFloor = 0xe9f3ee

function colorValue(value: string | undefined, fallback: number): number {
  return value?.startsWith('#') ? Number.parseInt(value.slice(1), 16) : fallback
}

function darken(color: number, ratio: number): number {
  const parsed = Phaser.Display.Color.IntegerToColor(color)
  return Phaser.Display.Color.GetColor(
    Math.round(parsed.red * ratio),
    Math.round(parsed.green * ratio),
    Math.round(parsed.blue * ratio),
  )
}

function itemValue(state: HospitalState, roomId: HospitalRoomId, category: string): string {
  return state.decorations[roomId]?.[category as keyof NonNullable<HospitalState['decorations'][HospitalRoomId]>] ?? ''
}

export class HospitalScene extends Phaser.Scene {
  private dataState: HospitalSceneData
  private readonly mapObjects: Phaser.GameObjects.GameObject[] = []
  private readonly characters: CharacterSprite[] = []
  private readonly walkers: Array<{ character: CharacterSprite; routes: Array<Array<{ x: number; y: number }>>; after: CharacterAnimation }> = []
  private selectedRoom: HospitalRoomId
  private lastPointer = { x: 0, y: 0 }
  private dragPointer?: number
  private routeIndex = 0
  private placementMode?: { itemId: string; placementId?: string; roomId?: HospitalRoomId }
  private placementPreview?: Phaser.GameObjects.Graphics
  private placementPointer?: number
  private stateListener?: (data: HospitalSceneData) => void
  private zoomListener?: (amount: number) => void
  private resetListener?: () => void
  private placementModeListener?: (mode: { itemId: string; placementId?: string; roomId?: HospitalRoomId } | null) => void
  private roomPointerDown?: (pointer: Phaser.Input.Pointer) => void
  private roomPointerMove?: (pointer: Phaser.Input.Pointer) => void
  private roomPointerUp?: (pointer: Phaser.Input.Pointer) => void
  private wheelListener?: (pointer: Phaser.Input.Pointer, objects: Phaser.GameObjects.GameObject[], dx: number, dy: number) => void
  private resizeListener?: (gameSize: Phaser.Structs.Size) => void

  constructor(data: HospitalSceneData) {
    super({ key: 'HospitalScene' })
    this.dataState = data
    this.selectedRoom = data.hospital.selectedRoom
  }

  create() {
    this.cameras.main.setBackgroundColor('#eff7f3')
    this.cameras.main.setBounds(0, 0, worldSize.width, worldSize.height)
    this.setInitialZoom()
    this.drawHospital()
    this.attachInteraction()
    this.stateListener = data => {
      const previous = this.dataState
      const mapChanged = previous.hospital.selectedRoom !== data.hospital.selectedRoom
        || previous.hospital.unlockedRooms !== data.hospital.unlockedRooms
        || previous.hospital.roomLevels !== data.hospital.roomLevels
        || previous.hospital.decorations !== data.hospital.decorations
        || previous.hospital.furniture !== data.hospital.furniture
      const charactersChanged = previous.doctor !== data.doctor
        || previous.team !== data.team
        || previous.receptionist !== data.receptionist
        || previous.hospital.careQueue !== data.hospital.careQueue
      this.dataState = data
      this.selectedRoom = data.hospital.selectedRoom
      if (mapChanged) this.drawMap()
      if (charactersChanged) this.drawCharacters()
    }
    this.zoomListener = amount => this.setZoom(this.cameras.main.zoom + amount)
    this.resetListener = () => {
      this.setInitialZoom()
      const position = roomPositions[this.selectedRoom]
      this.cameras.main.centerOn(position.x, position.y)
    }
    this.placementModeListener = mode => {
      this.placementMode = mode ?? undefined
      this.placementPointer = undefined
      this.drawPlacementPreview(undefined)
    }
    this.game.events.on('hospital:state', this.stateListener)
    this.game.events.on('hospital:zoom', this.zoomListener)
    this.game.events.on('hospital:camera-reset', this.resetListener)
    this.game.events.on('hospital:placement-mode', this.placementModeListener)
    this.game.events.emit('hospital:scene-ready')
    this.time.addEvent({
      delay: 4800,
      loop: true,
      callback: () => this.moveNextCharacter(),
    })
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this)
    this.events.once(Phaser.Scenes.Events.DESTROY, this.onShutdown, this)
  }

  update() {
    this.characters.forEach(character => character.setDepthFromY())
  }

  private setInitialZoom() {
    const zoom = Math.min(0.82, Math.max(0.46, this.scale.width / 1020))
    this.setZoom(zoom)
    this.cameras.main.centerOn(roomPositions[this.selectedRoom].x, roomPositions[this.selectedRoom].y)
  }

  private setZoom(value: number) {
    this.cameras.main.setZoom(Phaser.Math.Clamp(value, 0.46, 1.25))
  }

  private attachInteraction() {
    this.roomPointerDown = pointer => {
      if (this.placementMode) {
        this.placementPointer = pointer.id
        return
      }
      this.dragPointer = pointer.id
      this.lastPointer = { x: pointer.x, y: pointer.y }
    }
    this.roomPointerMove = pointer => {
      if (this.placementMode) {
        const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y)
        this.drawPlacementPreview(world)
        return
      }
      if (!pointer.isDown || this.dragPointer !== pointer.id) return
      const zoom = this.cameras.main.zoom
      this.cameras.main.scrollX -= (pointer.x - this.lastPointer.x) / zoom
      this.cameras.main.scrollY -= (pointer.y - this.lastPointer.y) / zoom
      this.lastPointer = { x: pointer.x, y: pointer.y }
    }
    this.roomPointerUp = pointer => {
      if (this.placementMode && this.placementPointer === pointer.id) {
        const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y)
        const candidate = this.findPlacementRoom(world.x, world.y)
        this.game.events.emit('hospital:placement-preview', candidate
          ? { ...candidate, valid: true }
          : { roomId: this.selectedRoom, x: world.x, y: world.y, valid: false })
        this.placementPointer = undefined
        return
      }
      if (this.dragPointer === pointer.id) this.dragPointer = undefined
    }
    this.wheelListener = (_pointer, _objects, _dx, dy) => this.setZoom(this.cameras.main.zoom + (dy < 0 ? 0.06 : -0.06))
    this.resizeListener = () => {
      this.cameras.main.setBounds(0, 0, worldSize.width, worldSize.height)
      this.setZoom(this.cameras.main.zoom)
    }
    this.input.on('pointerdown', this.roomPointerDown)
    this.input.on('pointermove', this.roomPointerMove)
    this.input.on('pointerup', this.roomPointerUp)
    this.input.on('pointerupoutside', this.roomPointerUp)
    this.input.on('wheel', this.wheelListener)
    this.scale.on(Phaser.Scale.Events.RESIZE, this.resizeListener)
  }

  private addGraphics(depth = 1): Phaser.GameObjects.Graphics {
    const graphics = this.add.graphics().setDepth(depth)
    this.mapObjects.push(graphics)
    return graphics
  }

  private addText(x: number, y: number, text: string, style: Phaser.Types.GameObjects.Text.TextStyle, depth = 1) {
    const label = this.add.text(x, y, text, style).setDepth(depth)
    this.mapObjects.push(label)
    return label
  }

  private drawHospital() {
    this.drawMap()
    this.drawCharacters()
  }

  private drawMap() {
    this.mapObjects.forEach(object => object.destroy())
    this.mapObjects.length = 0
    const background = this.addGraphics(-10)
    background.fillStyle(0xeaf4ef, 1)
    background.fillRect(0, 0, worldSize.width, worldSize.height)
    background.fillStyle(0xf6faf8, 1)
    background.fillPoints([{ x: 600, y: 28 }, { x: 1168, y: 280 }, { x: 600, y: 748 }, { x: 32, y: 280 }], true)
    background.lineStyle(3, 0xd2e5dc, 1)
    background.strokePoints([{ x: 600, y: 28 }, { x: 1168, y: 280 }, { x: 600, y: 748 }, { x: 32, y: 280 }], true)

    const rooms = [...hospitalRooms].sort((a, b) => roomPositions[a.id].y - roomPositions[b.id].y)
    rooms.forEach(room => this.drawRoom(room.id, room.name, roomPositions[room.id]))
    this.drawHallways()
    this.drawRoomFurniture()
  }

  private drawHallways() {
    const g = this.addGraphics(2)
    g.fillStyle(0xdcece5, 1)
    g.fillPoints([{ x: 365, y: 376 }, { x: 600, y: 324 }, { x: 835, y: 376 }, { x: 600, y: 430 }], true)
    g.fillPoints([{ x: 445, y: 393 }, { x: 600, y: 359 }, { x: 755, y: 393 }, { x: 600, y: 429 }], true)
    g.lineStyle(2, 0xc3ddd1, 0.8)
    g.strokePoints([{ x: 365, y: 376 }, { x: 600, y: 324 }, { x: 835, y: 376 }, { x: 600, y: 430 }], true)
    this.addText(556, 381, 'PASILLO CENTRAL', { fontFamily: 'DM Sans', fontSize: '9px', color: '#719287', fontStyle: 'bold' }, 4)
    ;[420, 780].forEach(x => {
      const sign = this.addGraphics(5)
      sign.fillStyle(0xffffff, 0.85)
      sign.fillRoundedRect(x - 15, 365, 30, 18, 5)
      sign.fillStyle(0x87b7a5, 1)
      sign.fillCircle(x, 374, 4)
    })
  }

  private drawRoom(roomId: HospitalRoomId, name: string, { x, y }: RoomPosition) {
    const locked = !this.dataState.hospital.unlockedRooms.includes(roomId)
    const wallItemId = itemValue(this.dataState.hospital, roomId, 'wall')
    const floorItemId = itemValue(this.dataState.hospital, roomId, 'floor')
    const wallColor = colorValue(hospitalItems.find(item => item.id === wallItemId)?.value, initialWall)
    const floorColor = floorItemId === 'floor-oak' ? 0xe8d8ba : floorItemId === 'floor-checker' ? 0xe8e2f0 : initialFloor
    const top = { x, y: y - roomHalfHeight }
    const left = { x: x - roomHalfWidth, y }
    const right = { x: x + roomHalfWidth, y }
    const bottom = { x, y: y + roomHalfHeight }
    const g = this.addGraphics(y - 50)
    g.fillStyle(darken(wallColor, 0.88), 1)
    g.fillPoints([{ x: top.x, y: top.y }, { x: right.x, y: right.y }, { x: right.x, y: right.y - 68 }, { x: top.x, y: top.y - 68 }], true)
    g.fillStyle(wallColor, 1)
    g.fillPoints([{ x: top.x, y: top.y }, { x: left.x, y: left.y }, { x: left.x, y: left.y - 68 }, { x: top.x, y: top.y - 68 }], true)
    g.fillStyle(floorColor, 1)
    g.fillPoints([top, right, bottom, left], true)
    g.lineStyle(this.selectedRoom === roomId ? 5 : 2, this.selectedRoom === roomId ? 0x4fb99c : 0xb9d7ca, 1)
    g.strokePoints([top, right, bottom, left], true)
    if (floorItemId === 'floor-checker' || floorItemId === 'floor-oak') {
      g.lineStyle(1, floorItemId === 'floor-oak' ? 0xb49a76 : 0xc8bdd9, 0.55)
      for (let index = -2; index <= 2; index += 1) {
        g.lineBetween(x - 125, y + index * 17, x + 125, y + index * 17)
      }
    }
    const level = this.dataState.hospital.roomLevels[roomId] ?? 0
    const labelColor = locked ? '#9a9895' : '#3c6156'
    this.addText(x, y - 154, name.toLocaleUpperCase(), {
      fontFamily: 'Nunito, sans-serif', fontSize: '13px', color: labelColor, fontStyle: 'bold',
      backgroundColor: '#f7fffbdd', padding: { x: 8, y: 4 },
    }, y + 100).setOrigin(0.5)
    if (locked) {
      this.addText(x, y - 124, 'BLOQUEADA', {
        fontFamily: 'DM Sans', fontSize: '9px', color: '#9b8176', fontStyle: 'bold',
        backgroundColor: '#fff8efdd', padding: { x: 6, y: 3 },
      }, y + 101).setOrigin(0.5)
      g.fillStyle(0x707575, 0.22)
      g.fillPoints([top, right, bottom, left], true)
    } else {
      this.addText(x + 115, y - 133, `NIV ${level}`, {
        fontFamily: 'DM Sans', fontSize: '8px', color: '#347866', fontStyle: 'bold',
        backgroundColor: '#f4fcf8dd', padding: { x: 5, y: 3 },
      }, y + 102).setOrigin(0.5)
    }
    const zone = this.add.zone(x, y, roomHalfWidth * 1.9, roomHalfHeight * 1.8).setInteractive({ useHandCursor: true })
    zone.on('pointerdown', () => {
      if (this.placementMode) return
      this.selectedRoom = roomId
      this.game.events.emit('hospital:room-selected', roomId)
      this.drawMap()
    })
    this.mapObjects.push(zone)
  }

  private drawRoomFurniture() {
    hospitalRooms.forEach(room => {
      if (!this.dataState.hospital.unlockedRooms.includes(room.id)) return
      const { x, y } = roomPositions[room.id]
      const decoration = this.dataState.hospital.decorations[room.id] ?? {}
      const g = this.addGraphics(y + 20)
      const bedStyle = decoration.bed ?? 'bed-basic'
      const chairStyle = decoration.chair ?? 'chair-basic'
      const tableStyle = decoration.table ?? 'table-basic'
      const plantStyle = decoration.plant ?? 'plant-basic'
      const placedCategories = new Set(this.dataState.hospital.furniture
        .filter(item => item.roomId === room.id)
        .map(item => hospitalItems.find(definition => definition.id === item.itemId)?.category))
      const hasBed = ['consultation', 'operating', 'recovery'].includes(room.id)
      if (hasBed && !placedCategories.has('bed')) this.drawBed(g, x - 4, y + 5, bedStyle)
      if (['reception', 'waiting', 'consultation'].includes(room.id) && !placedCategories.has('table')) this.drawTable(g, x - 100, y + 12, tableStyle)
      if (!placedCategories.has('chair') && (room.id === 'reception' || room.id === 'waiting' || room.id === 'recovery')) {
        this.drawChair(g, x + 79, y + 13, chairStyle)
        this.drawChair(g, x + 113, y + 2, chairStyle)
      } else if (!placedCategories.has('chair')) {
        this.drawChair(g, x + 86, y + 12, chairStyle)
      }
      if (['operating', 'consultation', 'corridor'].includes(room.id) && !placedCategories.has('table')) this.drawTable(g, x + 100, y + 4, tableStyle)
      if (!placedCategories.has('plant') && plantStyle !== 'plant-basic') this.drawPlant(g, x - 124, y + 25, plantStyle)
      else if (!placedCategories.has('plant') && (room.id === 'reception' || room.id === 'waiting')) this.drawPlant(g, x - 124, y + 25, plantStyle)
      if (!placedCategories.has('picture') && !placedCategories.has('light') && !placedCategories.has('decor')) {
        this.drawWallDecor(g, x, y, decoration.picture ?? 'picture-basic', decoration.light ?? 'light-soft', decoration.decor ?? 'decor-none')
      }
      if (room.id === 'operating') this.drawMonitor(g, x + 116, y - 12)
      if (room.id === 'recovery') this.drawRecoveryPillows(g, x + 108, y - 6)
    })
    this.drawPlacedFurniture()
  }

  private drawPlacedFurniture() {
    this.dataState.hospital.furniture.forEach(placement => {
      const item = hospitalItems.find(candidate => candidate.id === placement.itemId)
      if (!item) return
      const container = this.add.container(placement.x, placement.y).setDepth(placement.y + 20)
      const g = this.add.graphics()
      if (item.category === 'bed') this.drawBed(g, 0, 0, item.id)
      else if (item.category === 'chair') this.drawChair(g, 0, 0, item.id)
      else if (item.category === 'table') this.drawTable(g, 0, 0, item.id)
      else if (item.category === 'plant') this.drawPlant(g, 0, 0, item.id)
      else if (item.category === 'picture') {
        g.fillStyle(0x9b8064, 1)
        g.fillRoundedRect(-21, -16, 42, 32, 4)
        g.fillStyle(item.value === 'space' ? 0xb7abd9 : 0x9bcdb3, 1)
        g.fillRoundedRect(-17, -12, 34, 24, 3)
        g.fillCircle(0, -2, 6)
      } else if (item.category === 'light') {
        g.fillStyle(item.value === 'crystal' ? 0xd4c4ef : 0xf3d998, 0.9)
        g.fillEllipse(0, 0, 28, 20)
        g.lineStyle(2, 0x91a99d, 1)
        g.lineBetween(0, -12, 0, -25)
      } else if (item.category === 'decor') {
        g.lineStyle(2, 0x9f87c4, 1)
        g.lineBetween(-11, -18, 11, -18)
        g.lineBetween(-11, -18, -11, 0)
        g.lineBetween(11, -18, 11, 0)
        g.fillStyle(0xdac6ef, 1)
        g.fillCircle(-11, 2, 6)
        g.fillCircle(11, 2, 6)
      }
      container.add(g)
      container.setAngle(placement.rotation)
      this.mapObjects.push(container)
    })
  }

  private findPlacementRoom(x: number, y: number) {
    if (!this.placementMode) return null
    const targetRooms = this.placementMode.roomId ? [this.placementMode.roomId] : this.dataState.hospital.unlockedRooms
    for (const roomId of targetRooms) {
      const center = roomPositions[roomId]
      if (Math.abs(x - center.x) / 118 + Math.abs(y - center.y) / 58 > 1) continue
      if (!canPlaceHospitalFurniture(this.dataState.hospital, roomId, this.placementMode.itemId, x, y, this.placementMode.placementId)) continue
      return { roomId, x, y }
    }
    return null
  }

  private drawPlacementPreview(world?: { x: number; y: number }) {
    if (!this.placementMode) {
      this.placementPreview?.destroy()
      this.placementPreview = undefined
      return
    }
    this.placementPreview ??= this.add.graphics().setDepth(2000)
    this.placementPreview.clear()
    if (!world) return
    const candidate = this.findPlacementRoom(world.x, world.y)
    const color = candidate ? 0x42ae8e : 0xdf7777
    this.placementPreview.fillStyle(color, 0.22)
    this.placementPreview.lineStyle(3, color, 0.9)
    this.placementPreview.fillEllipse(world.x, world.y, 52, 30)
    this.placementPreview.strokeEllipse(world.x, world.y, 52, 30)
  }

  private drawBed(g: Phaser.GameObjects.Graphics, x: number, y: number, style: string) {
    g.fillStyle(0x759d8c, 0.24)
    g.fillEllipse(x, y + 26, 126, 28)
    g.fillStyle(0x789f8e, 1)
    g.fillPoints([{ x: x - 56, y: y }, { x, y: y - 25 }, { x: x + 56, y }, { x, y: y + 25 }], true)
    const cover = style === 'bed-star' ? 0xf2d99d : style === 'bed-cloud' ? 0xd9ecf6 : 0xf9fcfa
    g.fillStyle(cover, 1)
    g.fillPoints([{ x: x - 48, y: y - 2 }, { x, y: y - 22 }, { x: x + 48, y: y - 2 }, { x, y: y + 19 }], true)
    g.fillStyle(style === 'bed-star' ? 0xe6bd6c : 0xffffff, 1)
    g.fillPoints([{ x: x - 48, y: y - 2 }, { x: x - 28, y: y - 11 }, { x: x - 9, y: y - 2 }, { x: x - 28, y: y + 7 }], true)
    g.fillStyle(0x7d9e8e, 1)
    g.fillRect(x - 42, y + 14, 4, 16)
    g.fillRect(x + 37, y + 14, 4, 16)
  }

  private drawChair(g: Phaser.GameObjects.Graphics, x: number, y: number, style: string) {
    const fill = style === 'chair-lilac' ? 0xb7a6d7 : style === 'chair-cloud' ? 0x9bcfe0 : 0x93c6b5
    g.fillStyle(fill, 1)
    g.fillRoundedRect(x - 15, y - 17, 30, 23, 8)
    g.fillRoundedRect(x - 17, y + 2, 34, 8, 4)
    g.fillStyle(0x658d7c, 1)
    g.fillRect(x - 11, y + 10, 4, 12)
    g.fillRect(x + 7, y + 10, 4, 12)
  }

  private drawTable(g: Phaser.GameObjects.Graphics, x: number, y: number, style: string) {
    const fill = style === 'table-mint' ? 0x8bc4af : style === 'table-round' ? 0xd7b98c : 0xb7cfc4
    g.fillStyle(0x547b6d, 0.18)
    g.fillEllipse(x, y + 18, 72, 22)
    g.fillStyle(fill, 1)
    g.fillPoints([{ x: x - 32, y }, { x, y: y - 14 }, { x: x + 32, y }, { x, y: y + 14 }], true)
    g.fillStyle(0x789a89, 1)
    g.fillRect(x - 3, y + 8, 6, 21)
  }

  private drawPlant(g: Phaser.GameObjects.Graphics, x: number, y: number, style: string) {
    g.fillStyle(0xb98f81, 1)
    g.fillPoints([{ x: x - 12, y }, { x: x + 12, y }, { x: x + 8, y: y + 17 }, { x: x - 8, y: y + 17 }], true)
    g.lineStyle(3, 0x6d9d7e, 1)
    g.lineBetween(x, y, x, y - (style === 'plant-tall' ? 42 : 27))
    g.lineBetween(x, y - 10, x - 15, y - 23)
    g.lineBetween(x, y - 17, x + 15, y - 32)
    g.fillStyle(0x78b18d, 1)
    g.fillEllipse(x - 11, y - 23, 18, 9)
    g.fillEllipse(x + 12, y - 31, 20, 10)
    if (style === 'plant-flower') {
      g.fillStyle(0xe4a5bc, 1)
      g.fillCircle(x + 2, y - 39, 5)
      g.fillStyle(0xf3d78a, 1)
      g.fillCircle(x + 2, y - 39, 2)
    }
  }

  private drawWallDecor(g: Phaser.GameObjects.Graphics, x: number, y: number, picture: string, light: string, decor: string) {
    const lightColor = light === 'light-warm' ? 0xffe6a8 : light === 'light-crystal' ? 0xcfe8ff : 0xfff6d5
    g.fillStyle(lightColor, 0.14)
    g.fillEllipse(x, y - 49, 126, 58)
    g.fillStyle(0xffffff, 0.88)
    g.fillRoundedRect(x - 28, y - 83, 56, 32, 5)
    g.lineStyle(3, 0xc2d8cf, 1)
    g.strokeRoundedRect(x - 28, y - 83, 56, 32, 5)
    g.fillStyle(picture === 'picture-space' ? 0x9b8bc6 : 0x8ab69b, 1)
    g.fillCircle(x - 11, y - 68, 6)
    g.fillStyle(picture === 'picture-space' ? 0xf2d995 : 0xe3abc0, 1)
    g.fillCircle(x + 7, y - 65, 5)
    if (decor === 'decor-clock') {
      g.fillStyle(0xfff9ec, 1)
      g.fillCircle(x + 74, y - 52, 13)
      g.lineStyle(2, 0x917a9a, 1)
      g.strokeCircle(x + 74, y - 52, 13)
      g.lineBetween(x + 74, y - 52, x + 74, y - 59)
      g.lineBetween(x + 74, y - 52, x + 80, y - 50)
    } else if (decor === 'decor-mobile') {
      g.lineStyle(1.5, 0x9b88c9, 0.9)
      g.lineBetween(x + 67, y - 85, x + 67, y - 46)
      g.fillStyle(0x9b88c9, 1)
      g.fillPoints([{ x: x + 67, y: y - 82 }, { x: x + 72, y: y - 76 }, { x: x + 67, y: y - 70 }, { x: x + 62, y: y - 76 }], true)
      g.fillStyle(0xe2a9bf, 1)
      g.fillCircle(x + 54, y - 61, 4)
      g.fillCircle(x + 79, y - 57, 4)
    }
    if (light !== 'light-soft') {
      g.fillStyle(lightColor, 1)
      g.fillEllipse(x, y - 105, 50, 12)
      g.lineStyle(2, 0xc7d6ce, 1)
      g.lineBetween(x, y - 105, x, y - 117)
    }
  }

  private drawMonitor(g: Phaser.GameObjects.Graphics, x: number, y: number) {
    g.fillStyle(0x8ba99c, 1)
    g.fillRoundedRect(x - 20, y - 22, 40, 32, 5)
    g.fillStyle(0xf5fffb, 1)
    g.fillRoundedRect(x - 15, y - 18, 30, 19, 3)
    g.lineStyle(2, 0x58b995, 1)
    g.beginPath()
    g.moveTo(x - 12, y - 8)
    g.lineTo(x - 6, y - 8)
    g.lineTo(x - 3, y - 13)
    g.lineTo(x + 1, y - 4)
    g.lineTo(x + 4, y - 10)
    g.lineTo(x + 12, y - 10)
    g.strokePath()
  }

  private drawRecoveryPillows(g: Phaser.GameObjects.Graphics, x: number, y: number) {
    g.fillStyle(0xffffff, 0.95)
    g.fillRoundedRect(x - 10, y - 12, 24, 11, 5)
    g.fillStyle(0xf0d4df, 0.9)
    g.fillRoundedRect(x + 4, y - 1, 24, 11, 5)
  }

  private drawCharacters() {
    disposeCharacters(this.characters)
    this.characters.length = 0
    this.walkers.length = 0
    const unlocked = this.dataState.hospital.unlockedRooms
    const createCharacter = (
      appearance: Doctor | MedicalProfessional | Patient,
      role: string,
      x: number,
      y: number,
      animation: CharacterAnimation,
    ) => {
      const characterAppearance = 'age' in appearance
        ? {
          skin: appearance.skin,
          hair: appearance.hair,
          uniform: appearance.uniform,
          accessory: appearance.accessory,
          hairStyle: appearance.hairStyle,
        }
        : appearance
      const character = new CharacterSprite(this, {
        ...characterAppearance,
        name: appearance.name,
        role,
        skin: appearance.skin,
        hair: appearance.hair,
        uniform: appearance.uniform,
        accessory: appearance.accessory,
        gender: 'gender' in appearance ? appearance.gender : undefined,
        x,
        y,
      })
      character.root.setDepth(y)
      character.setAnimation(animation)
      this.characters.push(character)
      return character
    }
    const addWalker = (
      character: CharacterSprite,
      route: Array<{ x: number; y: number }>,
      after: CharacterAnimation,
    ) => this.walkers.push({ character, routes: [route], after })
    const latestCase = [...this.dataState.hospital.careQueue].sort((a, b) => b.updatedAt - a.updatedAt)[0]
    const teamReaction: CharacterAnimation = latestCase?.status === 'failed' ? 'sad'
      : latestCase?.status === 'recovery' ? 'happy' : 'idle'
    const doctor = createCharacter(this.dataState.doctor, 'DIRECCIÓN', 420, 406, teamReaction)
    addWalker(doctor, [{ x: 440, y: 401 }, { x: 420, y: 406 }, { x: 402, y: 410 }, { x: 420, y: 406 }], teamReaction)
    this.dataState.team.forEach((person, index) => {
      const x = 500 + index * 72
      const y = index % 2 ? 411 : 390
      const role = person.roles[0] === 'anesthesia' ? 'ANESTESIA'
        : person.roles[0] === 'instrument' ? 'INSTRUM.'
          : person.roles[0] === 'circulating' ? 'CIRC.' : 'ASIST.'
      const animation = teamReaction !== 'idle' ? teamReaction : index % 2 ? 'talk' : 'work'
      const character = createCharacter({ ...person, name: person.name.split(' ')[0] }, role, x, y, animation)
      addWalker(character, [{ x: x + 12, y }, { x, y }, { x: x - 12, y }, { x, y }], animation)
    })
    if (this.dataState.receptionist) {
      const receptionist = createCharacter(this.dataState.receptionist, 'RECEPCIÓN', 207, 208, 'work')
      addWalker(receptionist, [{ x: 219, y: 208 }, { x: 207, y: 208 }, { x: 195, y: 208 }, { x: 207, y: 208 }], 'work')
    }

    const patientRoom = (status: string): HospitalRoomId => {
      if (status === 'arrived') return 'reception'
      if (['consultation', 'preparation'].includes(status)) return 'consultation'
      if (status === 'surgery') return 'operating'
      if (['recovery', 'failed'].includes(status)) return 'recovery'
      return 'waiting'
    }
    const patientsByRoom = new Map<HospitalRoomId, Array<{ patient: Patient; status: string }>>()
    this.dataState.hospital.careQueue.forEach(care => {
      if (care.status === 'discharged') return
      const patient = this.dataState.patients.find(item => item.id === care.patientId)
      if (!patient) return
      const preferred = patientRoom(care.status)
      const room = unlocked.includes(preferred) ? preferred : unlocked.includes('waiting') ? 'waiting' : 'reception'
      const group = patientsByRoom.get(room) ?? []
      group.push({ patient, status: care.status })
      patientsByRoom.set(room, group)
    })
    patientsByRoom.forEach((group, room) => {
      const center = roomPositions[room]
      const layouts = group.length >= 5
        ? [{ x: -68, y: -22 }, { x: 68, y: -22 }, { x: 0, y: 0 }, { x: -45, y: 30 }, { x: 45, y: 30 }]
        : group.length === 4
          ? [{ x: -60, y: -20 }, { x: 60, y: -20 }, { x: -40, y: 30 }, { x: 40, y: 30 }]
          : group.length === 3
            ? [{ x: -48, y: -14 }, { x: 48, y: -14 }, { x: 0, y: 28 }]
            : group.length === 2
              ? [{ x: -38, y: 5 }, { x: 38, y: 5 }]
              : [{ x: 0, y: 5 }]
      group.forEach(({ patient, status }, index) => {
        const x = center.x + layouts[index].x
        const y = center.y + layouts[index].y
        const animation: CharacterAnimation = status === 'waiting' || status === 'recovery' ? 'rest'
          : status === 'consultation' || status === 'declined' ? 'talk'
            : status === 'failed' ? 'sad'
              : status === 'preparation' || status === 'surgery' ? 'work' : 'idle'
        const statusRole = status === 'arrived' ? 'LLEGADA'
          : status === 'waiting' ? 'ESPERA'
            : status === 'consultation' ? 'CONSULTA'
              : status === 'preparation' ? 'PREPARACIÓN'
                : status === 'surgery' ? 'CIRUGÍA'
                  : status === 'recovery' ? 'RECUPERACIÓN'
                    : status === 'failed' ? 'FALLO' : 'PAUSA'
        const character = createCharacter(patient, statusRole, x, y, animation)
        addWalker(character, [{ x: x - 10, y }, { x, y }, { x: x + 10, y }, { x, y }], animation)
      })
    })
  }

  private moveNextCharacter() {
    if (!this.walkers.length) return
    const walker = this.walkers[this.routeIndex % this.walkers.length]
    const path = walker.routes[this.routeIndex % walker.routes.length]
    walker.character.walkRoute([...path], walker.after)
    this.routeIndex += 1
  }

  private onShutdown() {
    if (this.stateListener) this.game.events.off('hospital:state', this.stateListener)
    if (this.zoomListener) this.game.events.off('hospital:zoom', this.zoomListener)
    if (this.resetListener) this.game.events.off('hospital:camera-reset', this.resetListener)
    if (this.placementModeListener) this.game.events.off('hospital:placement-mode', this.placementModeListener)
    if (this.roomPointerDown) this.input.off('pointerdown', this.roomPointerDown)
    if (this.roomPointerMove) this.input.off('pointermove', this.roomPointerMove)
    if (this.roomPointerUp) {
      this.input.off('pointerup', this.roomPointerUp)
      this.input.off('pointerupoutside', this.roomPointerUp)
    }
    if (this.wheelListener) this.input.off('wheel', this.wheelListener)
    if (this.resizeListener) this.scale.off(Phaser.Scale.Events.RESIZE, this.resizeListener)
    this.time.removeAllEvents()
    this.placementPreview?.destroy()
    this.placementPreview = undefined
    disposeCharacters(this.characters)
    this.mapObjects.forEach(object => object.destroy())
    this.mapObjects.length = 0
    this.walkers.length = 0
    this.stateListener = undefined
  }
}
