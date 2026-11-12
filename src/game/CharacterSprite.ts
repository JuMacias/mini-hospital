import Phaser from 'phaser'
import { createCharacterLayers, type LayeredAppearance } from './characterVisuals'
import { animationForSurgeryStatus, movementOffset } from './characterVisuals'
import type { CharacterAnimation, SurgeryStatus } from '../types'

export interface CharacterSpriteConfig extends LayeredAppearance {
  name: string
  role: string
  x: number
  y: number
  gender?: 'doctor' | 'doctora'
}

const hexColor = (value: string) => Number.parseInt(value.replace('#', ''), 16)

export class CharacterSprite {
  readonly root: Phaser.GameObjects.Container
  readonly name: string
  readonly role: string
  private readonly scene: Phaser.Scene
  private readonly home: { x: number; y: number }
  private readonly legs: Phaser.GameObjects.Graphics
  private readonly torso: Phaser.GameObjects.Container
  private readonly head: Phaser.GameObjects.Container
  private readonly leftArm: Phaser.GameObjects.Container
  private readonly rightArm: Phaser.GameObjects.Container
  private readonly mouth: Phaser.GameObjects.Graphics
  private readonly brows: Phaser.GameObjects.Graphics
  private readonly appearance: ReturnType<typeof createCharacterLayers>
  private animation: CharacterAnimation = 'idle'
  private moveTween?: Phaser.Tweens.Tween
  private poseTweens: Phaser.Tweens.Tween[] = []

  constructor(scene: Phaser.Scene, config: CharacterSpriteConfig) {
    this.scene = scene
    this.name = config.name
    this.role = config.role
    this.home = { x: config.x, y: config.y }
    this.appearance = createCharacterLayers(config)
    this.root = scene.add.container(config.x, config.y).setDepth(config.y)

    const shadow = scene.add.ellipse(0, 27, 86, 24, 0x527b6b, 0.15)
    this.legs = scene.add.graphics()
    this.legs.fillStyle(0x77998b, 1)
    this.legs.fillRoundedRect(-15, 27, 12, 16, 5)
    this.legs.fillRoundedRect(3, 27, 12, 16, 5)
    this.legs.fillStyle(hexColor(this.appearance.shoeColor), 1)
    this.legs.fillRoundedRect(-17, 39, 15, 7, 3)
    this.legs.fillRoundedRect(2, 39, 15, 7, 3)
    this.torso = scene.add.container(0, 0)
    const coat = scene.add.graphics()
    coat.fillStyle(hexColor(this.appearance.uniform), 1)
    coat.fillRoundedRect(-23, -10, 46, 48, 15)
    if (this.appearance.uniformStyle === 'coat') {
      coat.fillStyle(hexColor(this.appearance.uniform), 0.96)
      coat.fillPoints([{ x: -18, y: -7 }, { x: -9, y: -12 }, { x: 0, y: 1 }, { x: -8, y: 15 }], true)
      coat.fillPoints([{ x: 18, y: -7 }, { x: 9, y: -12 }, { x: 0, y: 1 }, { x: 8, y: 15 }], true)
      coat.fillStyle(hexColor(this.appearance.uniform), 1)
      coat.fillRoundedRect(-17, 11, 34, 26, 3)
      coat.fillStyle(0xdfe9e5, 1)
      coat.lineBetween(0, 1, 0, 37)
    } else {
      coat.fillStyle(0xf6fbf8, 0.95)
      coat.fillPoints([{ x: -9, y: -10 }, { x: 0, y: 1 }, { x: 9, y: -10 }, { x: 4, y: 6 }, { x: -4, y: 6 }], true)
      if (this.appearance.uniformStyle === 'jacket') {
        coat.lineStyle(2, 0xffffff, 0.7)
        coat.lineBetween(-14, 17, 14, 17)
      }
    }
    coat.fillStyle(0xf4d99e, 1)
    coat.fillRoundedRect(8, 9, 8, 8, 2)
    coat.fillStyle(0x557c7b, 1)
    coat.fillCircle(12, 13, 1.8)
    if (this.appearance.stethoscope) {
      coat.lineStyle(2, 0xb88749, 1)
      coat.beginPath()
      coat.arc(0, 5, 10, 0.05, Math.PI - 0.05, false)
      coat.strokePath()
      coat.fillStyle(0xe5c47c, 1)
      coat.fillCircle(0, 15, 3)
    }
    this.torso.add(coat)

    this.leftArm = this.createArm(-1)
    this.rightArm = this.createArm(1)
    this.head = scene.add.container(0, -23)
    const hairBack = this.createHairLayer(true)
    const face = this.createFace()
    const hairFront = this.createHairLayer(false)
    const accessories = this.createAccessoryLayer()
    const faceDetails = this.createFaceDetails()
    this.brows = scene.add.graphics()
    this.drawBrows(false)
    this.mouth = scene.add.graphics()
    this.drawMouth('idle')

    this.head.add([hairBack, face, this.createBeardLayer(), hairFront, accessories, faceDetails, this.brows, this.mouth])
    const label = scene.add.text(0, 54, config.name.length > 15 ? `${config.name.slice(0, 14)}…` : config.name, {
      fontFamily: 'Nunito, sans-serif', fontSize: '10px', color: '#385a50', fontStyle: 'bold',
      backgroundColor: '#f7fffbcc', padding: { x: 5, y: 2 },
    }).setOrigin(0.5)
    const roleLabel = scene.add.text(0, 69, config.role.toLocaleUpperCase(), {
      fontFamily: 'DM Sans, sans-serif', fontSize: '7px', color: '#68877c',
      backgroundColor: '#f7fffbad', padding: { x: 4, y: 1 },
    }).setOrigin(0.5)
    this.root.add([shadow, this.legs, this.torso, this.leftArm, this.rightArm, this.head, label, roleLabel])
    this.setAnimation('idle')
  }

  setForSurgery(status: SurgeryStatus, phase: number) {
    const next = animationForSurgeryStatus(status)
    if (status === 'IN_PROGRESS') {
      const offset = movementOffset(this.role, phase)
      this.walkTo(this.home.x + offset.x, this.home.y + offset.y, 'work')
      return
    }
    if (status === 'COMPLICATION' || status === 'STABILIZED' || status === 'READY') {
      this.walkTo(this.home.x, this.home.y, next)
      return
    }
    this.moveTween?.stop()
    this.moveTween = undefined
    this.setAnimation(next)
  }

  setAnimation(animation: CharacterAnimation) {
    this.stopPoseTweens()
    this.animation = animation
    this.drawMouth(animation)
    this.drawBrows(animation === 'alert' || animation === 'sad')
    if (animation === 'idle') {
      this.addPoseTween(this.scene.tweens.add({ targets: this.torso, y: -2, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }))
    } else if (animation === 'work') {
      this.addPoseTween(this.scene.tweens.add({ targets: this.rightArm, angle: -17, duration: 360, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }))
      this.addPoseTween(this.scene.tweens.add({ targets: this.torso, y: -1.5, duration: 540, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }))
    } else if (animation === 'walk') {
      this.addPoseTween(this.scene.tweens.add({ targets: this.leftArm, angle: -12, duration: 150, yoyo: true, repeat: -1 }))
      this.addPoseTween(this.scene.tweens.add({ targets: this.rightArm, angle: 12, duration: 150, yoyo: true, repeat: -1 }))
      this.addPoseTween(this.scene.tweens.add({ targets: this.legs, angle: 2, duration: 150, yoyo: true, repeat: -1 }))
    } else if (animation === 'talk') {
      this.addPoseTween(this.scene.tweens.add({ targets: this.mouth, scaleY: 1.45, duration: 180, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }))
      this.addPoseTween(this.scene.tweens.add({ targets: this.head, angle: -2, duration: 550, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }))
    } else if (animation === 'alert') {
      this.addPoseTween(this.scene.tweens.add({ targets: this.root, angle: -1.4, duration: 100, yoyo: true, repeat: 5 }))
      this.addPoseTween(this.scene.tweens.add({ targets: this.head, y: -27, duration: 140, yoyo: true, repeat: 3 }))
    } else if (animation === 'happy') {
      this.addPoseTween(this.scene.tweens.add({ targets: this.root, y: this.home.y - 7, duration: 260, yoyo: true, repeat: 3, ease: 'Back.easeOut' }))
      this.addPoseTween(this.scene.tweens.add({ targets: this.leftArm, angle: 28, duration: 220, yoyo: true, repeat: 5 }))
      this.addPoseTween(this.scene.tweens.add({ targets: this.rightArm, angle: -28, duration: 220, yoyo: true, repeat: 5 }))
    } else if (animation === 'rest') {
      this.root.setY(this.home.y + 2)
      this.torso.setY(3)
      this.legs.setScale(1, 0.62).setY(10)
      this.leftArm.setAngle(-7)
      this.rightArm.setAngle(7)
      this.addPoseTween(this.scene.tweens.add({ targets: this.torso, y: 1.5, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }))
    } else if (animation === 'sad') {
      this.head.setAngle(8).setY(-20)
      this.torso.setY(3)
    }
  }

  walkRoute(points: Array<{ x: number; y: number }>, after: CharacterAnimation = 'idle') {
    const [next, ...remaining] = points
    if (!next) {
      this.moveTween = undefined
      this.setAnimation(after)
      return
    }
    this.moveTween?.stop()
    this.setAnimation('walk')
    this.moveTween = this.scene.tweens.add({
      targets: this.root,
      x: next.x,
      y: next.y,
      duration: 450,
      ease: 'Sine.easeInOut',
      onUpdate: () => this.root.setDepth(this.root.y),
      onComplete: () => {
        this.moveTween = undefined
        this.walkRoute(remaining, after)
      },
    })
  }

  private walkTo(x: number, y: number, after: CharacterAnimation) {
    if (Math.abs(this.root.x - x) < 1 && Math.abs(this.root.y - y) < 1) {
      this.setAnimation(after)
      return
    }
    this.moveTween?.stop()
    this.setAnimation('walk')
    this.moveTween = this.scene.tweens.add({
      targets: this.root,
      x,
      y,
      duration: 350,
      ease: 'Sine.easeInOut',
      onUpdate: () => this.root.setDepth(this.root.y),
      onComplete: () => {
        this.setAnimation(after)
      },
    })
  }

  private createArm(direction: -1 | 1) {
    const arm = this.scene.add.container(direction * 17, -4)
    const shape = this.scene.add.graphics()
    shape.fillStyle(hexColor(this.appearance.uniform), 1)
    shape.fillRoundedRect(direction < 0 ? -8 : -2, 0, 10, 27, 5)
    shape.fillStyle(hexColor(this.appearance.skin), 1)
    shape.fillCircle(direction < 0 ? -3 : 3, 26, 5)
    arm.add(shape)
    return arm
  }

  private createFace() {
    const face = this.scene.add.graphics()
    face.fillStyle(hexColor(this.appearance.skin), 1)
    if (this.appearance.faceShape === 'square') face.fillRoundedRect(-19, -20, 38, 45, 12)
    else if (this.appearance.faceShape === 'oval') face.fillEllipse(0, 2, 36, 48)
    else if (this.appearance.faceShape === 'heart') face.fillPoints([{ x: -20, y: -14 }, { x: -10, y: -22 }, { x: 0, y: -15 }, { x: 10, y: -22 }, { x: 20, y: -14 }, { x: 17, y: 8 }, { x: 0, y: 25 }, { x: -17, y: 8 }], true)
    else face.fillEllipse(0, 2, 39, 45)
    face.fillStyle(0xffffff, 0.22)
    face.fillEllipse(-8, -5, 9, 13)
    face.fillStyle(hexColor(this.appearance.skin), 1)
    face.fillCircle(-19, 3, 5)
    face.fillCircle(19, 3, 5)
    return face
  }

  private createFaceDetails() {
    const details = this.scene.add.graphics()
    if (this.appearance.eyeStyle === 'sleepy') {
      details.lineStyle(2, hexColor(this.appearance.eyes), 1)
      details.beginPath()
      details.arc(-7, 0, 4, 0.15, Math.PI - 0.15, false)
      details.arc(7, 0, 4, 0.15, Math.PI - 0.15, false)
      details.strokePath()
    } else {
      details.fillStyle(0xffffff, 0.97)
      details.fillEllipse(-7, -1, this.appearance.eyeStyle === 'almond' ? 8 : 9, 7)
      details.fillEllipse(7, -1, this.appearance.eyeStyle === 'almond' ? 8 : 9, 7)
      details.fillStyle(hexColor(this.appearance.eyes), 1)
      details.fillCircle(-7, 0, 2.8)
      details.fillCircle(7, 0, 2.8)
      details.fillStyle(0x263336, 1)
      details.fillCircle(-7, 0, 1.4)
      details.fillCircle(7, 0, 1.4)
      details.fillStyle(0xffffff, 1)
      details.fillCircle(-6, -1, 0.8)
      details.fillCircle(8, -1, 0.8)
    }
    if (this.appearance.noseStyle === 'small') {
      details.lineStyle(1.2, 0xb77964, 0.8)
      details.lineBetween(0, 6, 0, 9)
    } else {
      details.fillStyle(0xb77964, 0.8)
      details.fillCircle(0, 7, this.appearance.noseStyle === 'button' ? 2.2 : 1.2)
    }
    return details
  }

  private createBeardLayer() {
    const beard = this.scene.add.graphics()
    const fill = hexColor(this.appearance.beardColor)
    if (this.appearance.beardStyle === 'stubble' || this.appearance.beardStyle === 'beard') {
      beard.fillStyle(fill, this.appearance.beardStyle === 'stubble' ? 0.38 : 0.95)
      beard.fillPoints([{ x: -16, y: 7 }, { x: -14, y: 17 }, { x: 0, y: 23 }, { x: 14, y: 17 }, { x: 16, y: 7 }, { x: 10, y: 12 }, { x: 0, y: 15 }, { x: -10, y: 12 }], true)
    }
    if (this.appearance.beardStyle === 'mustache' || this.appearance.beardStyle === 'goatee' || this.appearance.beardStyle === 'beard') {
      beard.fillStyle(fill, 1)
      beard.fillPoints([{ x: -10, y: 9 }, { x: -5, y: 6 }, { x: 0, y: 9 }, { x: 5, y: 6 }, { x: 10, y: 9 }, { x: 7, y: 13 }, { x: 0, y: 11 }, { x: -7, y: 13 }], true)
    }
    if (this.appearance.beardStyle === 'goatee') {
      beard.fillStyle(fill, 1)
      beard.fillRoundedRect(-4, 13, 8, 9, 3)
    }
    return beard
  }

  private createHairLayer(back: boolean) {
    const hair = this.scene.add.graphics()
    const { hairStyle, hair: hairColor } = this.appearance
    hair.fillStyle(hexColor(hairColor), 1)
    if (back) {
      if (['long', 'bob', 'wavy', 'braids'].includes(hairStyle)) {
        const length = hairStyle === 'long' || hairStyle === 'wavy' ? 39 : hairStyle === 'braids' ? 31 : 27
        hair.fillRoundedRect(-20, -8, 10, length, 6)
        hair.fillRoundedRect(10, -8, 10, length, 6)
      }
      if (hairStyle === 'bun') hair.fillCircle(0, -21, 10)
      if (hairStyle === 'ponytail') hair.fillRoundedRect(14, -8, 12, 34, 7)
      if (hairStyle === 'braids') {
        hair.fillPoints([{ x: -17, y: -7 }, { x: -22, y: 2 }, { x: -16, y: 29 }, { x: -10, y: 25 }], true)
        hair.fillPoints([{ x: 17, y: -7 }, { x: 22, y: 2 }, { x: 16, y: 29 }, { x: 10, y: 25 }], true)
      }
      if (hairStyle === 'curly' || hairStyle === 'afro') {
        const radius = hairStyle === 'afro' ? 9 : 7
        for (const [x, y] of [[-15, -12], [-5, -20], [7, -21], [16, -12], [-19, -4], [19, -4], [-10, -24], [12, -24]]) hair.fillCircle(x, y, radius)
      } else hair.fillEllipse(0, -11, hairStyle === 'pixie' ? 38 : 42, 27)
      return hair
    }
    if (hairStyle === 'curly' || hairStyle === 'afro') {
      const radius = hairStyle === 'afro' ? 8 : 6
      for (const [x, y] of [[-15, -12], [-7, -20], [3, -22], [13, -17], [18, -8]]) hair.fillCircle(x, y, radius)
    } else {
      hair.fillEllipse(-1, -14, 42, hairStyle === 'long' || hairStyle === 'wavy' ? 26 : 23)
      if (hairStyle === 'short' || hairStyle === 'pixie') hair.fillRoundedRect(-15, -9, 30, 7, 4)
      if (hairStyle === 'bob') hair.fillRoundedRect(-17, -9, 34, 15, 6)
      if (hairStyle === 'side-part') {
        hair.fillEllipse(-8, -11, 24, 16)
        hair.fillEllipse(7, -17, 24, 12)
      }
      if (hairStyle === 'spiky') {
        hair.fillPoints([{ x: -17, y: -13 }, { x: -15, y: -27 }, { x: -6, y: -16 }, { x: 0, y: -31 }, { x: 7, y: -16 }, { x: 17, y: -25 }, { x: 16, y: -10 }], true)
      }
      if (hairStyle === 'wavy') {
        hair.lineStyle(4, hexColor(hairColor), 1)
        hair.beginPath()
        hair.arc(-16, -1, 6, Math.PI * 1.15, Math.PI * 1.85)
        hair.arc(16, 2, 6, Math.PI * 1.15, Math.PI * 1.85)
        hair.strokePath()
      }
      if (hairStyle === 'ponytail') hair.fillRoundedRect(-14, -10, 29, 6, 4)
      if (hairStyle === 'braids') hair.fillRoundedRect(-15, -10, 30, 6, 4)
      if (hairStyle === 'bun' || hairStyle === 'long') hair.fillEllipse(-1, -15, 42, 25)
    }
    return hair
  }

  private createAccessoryLayer() {
    const accessory = this.scene.add.graphics()
    if (this.appearance.hatStyle !== 'none') {
      accessory.fillStyle(hexColor(this.appearance.hatColor), 1)
      if (this.appearance.hatStyle === 'headband') {
        accessory.lineStyle(3, hexColor(this.appearance.hatColor), 1)
        accessory.beginPath()
        accessory.arc(0, 2, 21, Math.PI * 1.12, Math.PI * 1.88)
        accessory.strokePath()
      } else {
        accessory.fillRoundedRect(-18, -23, 36, this.appearance.hatStyle === 'beanie' ? 17 : 12, 7)
        accessory.fillStyle(0xffffff, 0.8)
        if (this.appearance.hatPattern === 'dots') {
          accessory.fillCircle(-8, -18, 1.5)
          accessory.fillCircle(0, -16, 1.5)
          accessory.fillCircle(8, -18, 1.5)
        } else if (this.appearance.hatPattern === 'crosses') {
          accessory.fillRect(-8, -20, 2, 6)
          accessory.fillRect(-10, -18, 6, 2)
          accessory.fillCircle(7, -18, 2)
        } else if (this.appearance.hatPattern === 'stars') {
          accessory.fillPoints([{ x: -7, y: -21 }, { x: -5, y: -18 }, { x: -2, y: -17 }, { x: -5, y: -16 }, { x: -7, y: -13 }, { x: -9, y: -16 }, { x: -12, y: -17 }, { x: -9, y: -18 }], true)
          accessory.fillCircle(8, -18, 1.5)
        }
        accessory.fillStyle(hexColor(this.appearance.hatColor), 1)
        accessory.fillRoundedRect(-18, -13, 36, 4, 2)
      }
    }
    if (this.appearance.glassesStyle !== 'none') {
      accessory.lineStyle(2, hexColor(this.appearance.glassesColor), 1)
      if (this.appearance.glassesStyle === 'cat-eye') {
        accessory.strokePoints([{ x: -14, y: -3 }, { x: -8, y: -8 }, { x: 1, y: -6 }, { x: 0, y: 4 }, { x: -10, y: 4 }], true)
        accessory.strokePoints([{ x: 14, y: -3 }, { x: 8, y: -8 }, { x: -1, y: -6 }, { x: 0, y: 4 }, { x: 10, y: 4 }], true)
      } else {
        const radius = this.appearance.glassesStyle === 'round' ? 6 : 5
        accessory.strokeRoundedRect(-14, -6, 12, 12, radius)
        accessory.strokeRoundedRect(2, -6, 12, 12, radius)
      }
      accessory.lineBetween(-2, 0, 2, 0)
    }
    if (this.appearance.mask) {
      accessory.fillStyle(0x65c2b9, 1)
      accessory.fillRoundedRect(-17, 4, 34, 12, 4)
      accessory.lineStyle(1, 0xe7fbf7, 0.8)
      accessory.lineBetween(-11, 8, 11, 8)
      accessory.lineBetween(-11, 12, 11, 12)
    }
    return accessory
  }

  private drawMouth(animation: CharacterAnimation) {
    this.mouth.clear()
    this.mouth.fillStyle(0x9c5e62, 1)
    if (animation === 'happy') {
      this.mouth.fillEllipse(0, 11, 10, 5)
    } else if (animation === 'sad') {
      this.mouth.fillEllipse(0, 13, 9, 4)
      this.mouth.fillStyle(hexColor(this.appearance.skin), 1)
      this.mouth.fillEllipse(0, 15, 11, 4)
    } else if (animation === 'talk' || animation === 'alert') {
      this.mouth.fillEllipse(0, 10, animation === 'alert' ? 6 : 5, animation === 'alert' ? 7 : 5)
    } else if (this.appearance.expression === 'surprised' || this.appearance.mouthStyle === 'open') {
      this.mouth.fillEllipse(0, 10, 5, 6)
    } else if (this.appearance.expression === 'cheerful' || this.appearance.mouthStyle === 'smile') {
      this.mouth.fillEllipse(0, 11, 9, 5)
      this.mouth.fillStyle(hexColor(this.appearance.skin), 1)
      this.mouth.fillEllipse(0, 9, 11, 5)
    } else {
      this.mouth.fillRoundedRect(-4, 9, 8, 2, 1)
    }
  }

  private drawBrows(raised: boolean) {
    this.brows.clear()
    this.brows.lineStyle(this.appearance.eyebrowStyle === 'bold' ? 3 : 2, hexColor(this.appearance.hair), 0.9)
    const shift = raised ? -2 : 0
    if (this.appearance.eyebrowStyle === 'straight') {
      this.brows.lineBetween(-11, -7 + shift, -4, -7 + shift)
      this.brows.lineBetween(4, -7 + shift, 11, -7 + shift)
    } else {
      this.brows.lineBetween(-11, -7 + shift, -4, -8 - shift)
      this.brows.lineBetween(4, -8 - shift, 11, -7 + shift)
    }
  }

  private addPoseTween(tween: Phaser.Tweens.Tween) {
    this.poseTweens.push(tween)
  }

  private stopPoseTweens() {
    this.poseTweens.forEach(tween => tween.stop())
    this.poseTweens = []
    this.head.setAngle(0).setY(-23)
    this.torso.setY(0)
    this.leftArm.setAngle(0)
    this.rightArm.setAngle(0)
    this.legs.setAngle(0).setScale(1).setPosition(0, 0)
    this.root.setAngle(0)
  }

  getAnimation(): CharacterAnimation {
    return this.animation
  }

  setDepthFromY() {
    if (this.root.depth !== this.root.y) this.root.setDepth(this.root.y)
  }

  destroy() {
    this.moveTween?.stop()
    this.stopPoseTweens()
    this.root.destroy(true)
  }
}
