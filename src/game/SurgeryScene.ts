import Phaser from 'phaser'
import { CharacterSprite } from './CharacterSprite'
import { disposeCharacters } from './characterVisuals'
import type { Doctor, MedicalProfessional, Patient, SurgeryStatus } from '../types'

export interface SurgeryScenePeople {
  doctor: Doctor
  patient: Patient
  team: Array<{ person: MedicalProfessional; role: string }>
}

const color = (hex: string) => Number.parseInt(hex.replace('#', ''), 16)

export class SurgeryScene extends Phaser.Scene {
  private readonly people: SurgeryScenePeople
  private monitorGraphics?: Phaser.GameObjects.Graphics
  private monitorWave = 0
  private monitorFlat = false
  private readonly characters: CharacterSprite[] = []
  private stateListener?: (state: { status: SurgeryStatus; phase: number }) => void
  private readonly onReady?: () => void
  private readonly onError?: (message: string) => void

  constructor(people: SurgeryScenePeople, onReady?: () => void, onError?: (message: string) => void) {
    super({ key: 'SurgeryScene' })
    this.people = people
    this.onReady = onReady
    this.onError = onError
  }

  create() {
    try {
      this.createScene()
    } catch (error) {
      this.onError?.(error instanceof Error ? error.message : 'Error desconocido al dibujar la escena.')
    }
  }

  private createScene() {
    this.cameras.main.setBackgroundColor('#f6eadb')
    this.cameras.main.setZoom(1.32)
    this.cameras.main.centerOn(500, 285)
    this.drawRoom()
    this.drawEquipment()
    this.drawBedAndPatient()
    this.drawTeam()
    this.drawFirstPersonArms()
    this.drawLights()
    this.monitorGraphics = this.add.graphics().setDepth(10)
    this.stateListener = ({ status, phase }) => {
      this.monitorFlat = status === 'FAILURE'
      this.drawMonitor()
      this.characters.forEach(character => character.setForSurgery(status, phase))
    }
    this.game.events.on('surgery:state', this.stateListener)
    this.game.events.emit('surgery:scene-ready')
    this.time.addEvent({
      delay: 130,
      loop: true,
      callback: () => {
        this.monitorWave = (this.monitorWave + 1) % 70
        this.drawMonitor()
      },
    })
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this)
    this.events.once(Phaser.Scenes.Events.DESTROY, this.onShutdown, this)
    this.onReady?.()
  }

  private onShutdown() {
    if (this.stateListener) this.game.events.off('surgery:state', this.stateListener)
    disposeCharacters(this.characters)
    this.stateListener = undefined
  }

  update() {
    this.characters.forEach(character => character.setDepthFromY())
  }

  private drawRoom() {
    const g = this.add.graphics()
    g.fillStyle(0xffe6bf, 1)
    g.fillRect(0, 0, 1000, 285)
    g.fillStyle(0xf4c982, 1)
    g.fillPoints([{ x: 0, y: 285 }, { x: 1000, y: 285 }, { x: 920, y: 560 }, { x: 80, y: 560 }], true)
    g.lineStyle(3, 0xd79255, 1)
    g.lineBetween(0, 285, 1000, 285)
    g.lineStyle(1, 0xffe6b9, 0.46)
    for (let index = 0; index <= 8; index += 1) {
      const bottomX = 80 + index * 105
      const horizonX = 500 + (bottomX - 500) * 0.08
      g.lineBetween(horizonX, 285, bottomX, 560)
    }
    for (const ratio of [0.18, 0.4, 0.65, 0.88]) {
      const y = 285 + 275 * ratio
      g.lineBetween(80 * ratio, y, 1000 - 80 * ratio, y)
    }
    g.fillStyle(0xe79055, 0.22)
    g.fillRoundedRect(32, 58, 110, 82, 12)
    g.lineStyle(3, 0xe9b26d, 0.8)
    g.strokeRoundedRect(32, 58, 110, 82, 12)
    g.fillStyle(0xfff0d7, 0.4)
    g.fillRoundedRect(148, 183, 104, 7, 4)
    g.fillRoundedRect(148, 199, 72, 5, 3)
    g.fillStyle(0xd27d49, 1)
    g.fillRoundedRect(148, 150, 42, 27, 8)
    g.fillStyle(0xfff3da, 1)
    g.fillCircle(169, 163, 8)
    g.fillStyle(0x5cae9d, 1)
    g.fillRect(167, 158, 4, 10)
    g.fillRect(164, 161, 10, 4)
    g.lineStyle(3, 0xc97443, 0.82)
    g.lineBetween(100, 375, 500, 550)
    this.add.text(205, 120, 'QUIRÓFANO', {
      fontFamily: 'Nunito, sans-serif', fontSize: '18px', color: '#885837', fontStyle: 'bold',
    }).setDepth(2)
    this.add.text(207, 142, 'AVENTURA DE EQUIPO', {
      fontFamily: 'Nunito, sans-serif', fontSize: '10px', color: '#a07858', fontStyle: 'bold',
    }).setDepth(2)
  }

  private drawBedAndPatient() {
    const shadow = this.add.ellipse(505, 358, 365, 116, 0x739b8b, 0.13).setDepth(2)
    const bed = this.add.container(505, 329).setDepth(5)
    const base = this.add.graphics()
    base.fillStyle(0x7ca997, 1)
    base.fillPoints([{ x: -178, y: -7 }, { x: 0, y: -77 }, { x: 178, y: -7 }, { x: 0, y: 64 }], true)
    base.fillStyle(0xa6cbbb, 1)
    base.fillPoints([{ x: -160, y: -14 }, { x: 0, y: -76 }, { x: 160, y: -14 }, { x: 0, y: 48 }], true)
    base.fillStyle(0xfafdfb, 1)
    base.fillPoints([{ x: -145, y: -21 }, { x: 0, y: -76 }, { x: 145, y: -21 }, { x: 0, y: 34 }], true)
    base.fillStyle(0xe2eee8, 1)
    base.fillPoints([{ x: -91, y: 6 }, { x: 0, y: -34 }, { x: 91, y: 6 }, { x: 0, y: 48 }], true)
    base.fillStyle(color(this.people.patient.uniform), 1)
    base.fillRoundedRect(-48, -39, 96, 65, 24)
    base.fillStyle(0xf8e8d9, 0.9)
    base.fillRoundedRect(-18, -38, 36, 10, 5)
    base.fillStyle(color(this.people.patient.skin), 1)
    base.fillEllipse(0, -78, 48, 40)
    base.fillStyle(color(this.people.patient.hair), 1)
    if (this.people.patient.hairStyle === 'curly') {
      base.fillCircle(-19, -88, 10)
      base.fillCircle(-7, -96, 10)
      base.fillCircle(7, -96, 10)
      base.fillCircle(19, -88, 10)
    } else {
      base.fillEllipse(-4, -88, 42, 19)
      if (this.people.patient.hairStyle === 'long' || this.people.patient.hairStyle === 'bob') {
        base.fillRoundedRect(-26, -88, 10, this.people.patient.hairStyle === 'long' ? 34 : 24, 5)
        base.fillRoundedRect(16, -88, 10, this.people.patient.hairStyle === 'long' ? 34 : 24, 5)
      }
      if (this.people.patient.hairStyle === 'bun') base.fillCircle(-4, -102, 9)
    }
    if (this.people.patient.expression) {
      base.lineStyle(2, 0x9a5d69, 0.9)
      base.beginPath()
      base.arc(0, -69, 7, Math.PI * 0.1, Math.PI * 0.9, false)
      base.strokePath()
    }
    if (this.people.patient.accessory === 'gorra' || this.people.patient.accessory === 'surgical-cap') {
      base.fillStyle(0xf8fbf8, 1)
      base.fillRoundedRect(-23, -105, 46, 10, 5)
      base.fillStyle(0x86c9b8, 1)
      base.fillRect(-13, -94, 26, 2)
    } else if (this.people.patient.accessory === 'headband') {
      base.lineStyle(2, 0xf1c3a8, 1)
      base.beginPath()
      base.arc(-1, -78, 23, Math.PI * 1.15, Math.PI * 1.85)
      base.strokePath()
    } else if (this.people.patient.accessory === 'glasses') {
      base.lineStyle(1.5, 0x58736c, 1)
      base.strokeCircle(-9, -76, 6)
      base.strokeCircle(9, -76, 6)
      base.lineBetween(-3, -76, 3, -76)
    }
    base.fillStyle(0x475f5a, 1)
    base.fillCircle(-8, -76, 2.4)
    base.fillCircle(8, -76, 2.4)
    bed.add(base)
    bed.add(this.add.text(0, 88, this.people.patient.name, { fontFamily: 'Nunito, sans-serif', fontSize: '11px', color: '#52756c', fontStyle: 'bold' }).setOrigin(0.5))
    this.tweens.add({ targets: bed, y: 326, duration: 1550, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
    shadow.setDepth(1)
  }

  private drawTeam() {
    const roleLabels: Record<string, string> = {
      anesthesia: 'ANESTESIA',
      instrument: 'INSTRUMENTACIÓN',
      circulating: 'ENFERMERÍA',
      assistant: 'ASISTENCIA',
      team: 'EQUIPO MÉDICO',
    }
    const rolePositions: Record<string, { x: number; y: number }> = {
      anesthesia: { x: 815, y: 303 },
      instrument: { x: 245, y: 305 },
      circulating: { x: 730, y: 421 },
      assistant: { x: 270, y: 421 },
      team: { x: 650, y: 320 },
    }
    const people = this.people.team.map(({ person, role }) => ({
      ...person,
      name: person.name,
      role: roleLabels[role] ?? roleLabels.team,
      position: rolePositions[role] ?? rolePositions.team,
      roleKey: role,
    }))
    people.forEach((person) => {
      const { x, y } = person.position
      const character = new CharacterSprite(this, {
        ...person,
        name: person.name,
        role: person.role,
        skin: person.skin,
        hair: person.hair,
        hairStyle: person.hairStyle,
        uniform: person.uniform,
        accessory: person.accessory,
        gender: 'gender' in person ? person.gender : undefined,
        eyes: 'eyes' in person ? person.eyes : undefined,
        x,
        y,
      })
      character.root.setDepth(y)
      this.characters.push(character)
    })
  }

  private drawFirstPersonArms() {
    const g = this.add.graphics().setDepth(900)
    g.lineStyle(78, color(this.people.doctor.uniform), 1)
    g.lineBetween(185, 590, 390, 438)
    g.lineBetween(815, 590, 610, 438)
    g.fillStyle(color(this.people.doctor.uniform), 1)
    g.fillCircle(185, 590, 39)
    g.fillCircle(390, 438, 39)
    g.fillCircle(815, 590, 39)
    g.fillCircle(610, 438, 39)
    g.lineStyle(23, 0xf7fbf8, 1)
    g.lineBetween(387, 442, 411, 424)
    g.lineBetween(613, 442, 589, 424)
    g.fillStyle(color(this.people.doctor.skin), 1)
    g.fillEllipse(426, 413, 33, 25)
    g.fillEllipse(574, 413, 33, 25)
  }

  private drawLights() {
    const g = this.add.graphics().setDepth(3)
    g.lineStyle(15, 0x647477, 1)
    g.lineBetween(500, 60, 646, 72)
    g.lineStyle(10, 0x849194, 1)
    g.lineBetween(646, 72, 658, 145)
    g.fillStyle(0x5b6d72, 1)
    g.fillRoundedRect(481, 47, 38, 27, 11)
    g.fillRoundedRect(633, 59, 27, 25, 10)
    g.fillStyle(0x5b6d72, 1)
    g.fillEllipse(500, 142, 156, 72)
    g.fillStyle(0xd7e2dc, 1)
    g.fillEllipse(500, 137, 146, 63)
    g.fillStyle(0x76868a, 1)
    g.fillEllipse(500, 132, 127, 48)
    ;[[-39, -5], [-20, -14], [0, -17], [21, -12], [39, -2], [0, 7]].forEach(([x, y]) => {
      g.fillStyle(0xfff0c4, 1)
      g.fillCircle(500 + x, 132 + y, 9)
    })
    ;[390, 610].forEach((x, index) => {
      const y = index === 0 ? 190 : 220
      g.fillStyle(0x658778, 0.12)
      g.fillEllipse(x, y + 29, 122, 34)
      g.fillStyle(0xffffff, 0.95)
      g.fillEllipse(x, y, 100, 25)
      g.lineStyle(3, 0xc3dcd1, 1)
      g.strokeEllipse(x, y, 100, 25)
      g.fillStyle(0xfff0c4, 0.5)
      g.fillEllipse(x, y + 4, 68, 13)
      g.lineStyle(2, 0xa2beb1, 1)
      g.lineBetween(x, y - 38, x, y - 12)
      g.fillStyle(0xa2beb1, 1)
      g.fillCircle(x, y - 40, 4)
    })
  }

  private drawEquipment() {
    const g = this.add.graphics().setDepth(4)
    g.fillStyle(0x91b7a8, 1)
    g.fillRoundedRect(151, 287, 72, 54, 7)
    g.fillStyle(0xeaf8f1, 1)
    g.fillRoundedRect(159, 294, 56, 36, 5)
    g.fillStyle(0x9bd5be, 1)
    g.fillCircle(187, 311, 7)
    g.fillStyle(0xf2e5ad, 1)
    g.fillCircle(187, 311, 3)
    g.fillStyle(0x668d7b, 1)
    g.fillRoundedRect(175, 340, 24, 38, 4)
    g.fillRoundedRect(162, 375, 50, 5, 2)
    this.add.text(145, 385, 'EQUIPO', { fontFamily: 'DM Sans', fontSize: '8px', color: '#739286' }).setDepth(4)

    g.fillStyle(0x84a997, 1)
    g.fillPoints([{ x: 743, y: 359 }, { x: 806, y: 337 }, { x: 850, y: 354 }, { x: 786, y: 379 }], true)
    g.fillStyle(0xb7d4c8, 1)
    g.fillPoints([{ x: 748, y: 352 }, { x: 806, y: 331 }, { x: 844, y: 347 }, { x: 786, y: 370 }], true)
    g.fillStyle(0xf9fcfa, 1)
    g.fillPoints([{ x: 757, y: 347 }, { x: 806, y: 330 }, { x: 835, y: 343 }, { x: 786, y: 360 }], true)
    g.fillStyle(0x6d7779, 1)
    g.fillRoundedRect(797, 260, 24, 76, 6)
    g.fillRoundedRect(770, 332, 78, 9, 4)
    g.fillStyle(0x4d6269, 1)
    g.fillRoundedRect(750, 167, 118, 105, 11)
    g.fillStyle(0x263e43, 1)
    g.fillRoundedRect(759, 176, 100, 78, 7)
    g.fillStyle(0x315e5c, 1)
    g.fillRoundedRect(765, 182, 88, 66, 4)
    g.fillStyle(0x6dd6c2, 1)
    g.fillRoundedRect(835, 184, 12, 3, 1)
    g.fillRoundedRect(835, 191, 8, 3, 1)
    this.add.text(761, 152, 'MONITOR', { fontFamily: 'DM Sans', fontSize: '9px', color: '#80562f', fontStyle: 'bold' }).setDepth(4)
    for (let index = 0; index < 3; index += 1) {
      g.fillStyle([0xf5e2e8, 0xe2eff5, 0xf6edcf][index], 1)
      g.fillRoundedRect(706 + index * 26, 359 - index * 4, 20, 27, 4)
      g.lineStyle(1, 0xa6cbbb, 1)
      g.strokeRoundedRect(706 + index * 26, 359 - index * 4, 20, 27, 4)
    }
    this.add.text(704, 390, 'MATERIALES', { fontFamily: 'DM Sans', fontSize: '8px', color: '#739286' }).setDepth(4)
  }

  private drawMonitor() {
    if (!this.monitorGraphics) return
    const g = this.monitorGraphics
    g.clear()
    g.fillStyle(0x315e5c, 1)
    g.fillRoundedRect(765, 182, 88, 66, 4)
    g.lineStyle(2, this.monitorFlat ? 0xd9898a : 0x58b995, 1)
    const centerY = 216
    const points: Phaser.Geom.Point[] = []
    for (let index = 0; index < 76; index += 1) {
      const x = 770 + index
      const pulse = this.monitorFlat ? 0 : Math.sin((index + this.monitorWave) * 0.22) * (index % 13 === 7 ? 8 : 2)
      points.push(new Phaser.Geom.Point(x, centerY + pulse))
    }
    g.strokePoints(points, false)
  }
}
