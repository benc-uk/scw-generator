import * as audio from './audio.js'
import * as utils from './utils.js'
import * as midi from './midi.js'
import { generateName } from './names.js'

import Alpine from 'https://unpkg.com/alpinejs@3.7.0/dist/module.esm.js'
const VERSION = '0.0.6'
const MAX_UNDO = 30

let ctx = null
let canvas = null

Alpine.data('app', () => ({
  version: VERSION,
  tab: 'simple',
  sampleRate: 0,
  buffSize: 337,
  drawing: false,
  folding: true,
  flipBlend: false,
  midiDevice: null,
  buffer: null,
  undoBuffers: [],

  ampAmount: 35,
  roughAmount: 0.3,
  blendAmount: 20,
  smoothReduceSize: 4,

  mainVol: 70,
  filterCut: 700,
  filterQ: 6,
  releaseTime: 2500,
  attackTime: 1,
  sustainTime: 100,
  filterEnv: true,
  reverb: true,
  noteNum: 48,

  async init() {
    ctx = new AudioContext()
    this.sampleRate = ctx.sampleRate
    canvas = document.getElementById('canvas')

    this.buffer = ctx.createBuffer(1, this.buffSize, ctx.sampleRate)
    audio.init(this.buffer, this.filterCut, this.filterQ)
    this.genSaw()

    this.$watch('buffSize', () => {
      audio.stop()
      buffer = ctx.createBuffer(1, this.buffSize, ctx.sampleRate)
      audio.init(buffer, this.filterCut, this.filterQ)
      this.genSaw()
    })

    this.$watch('filterCut', () => {
      audio.setFilterParams(this.filterQ, this.filterCut)
    })
    this.$watch('filterQ', () => {
      audio.setFilterParams(this.filterQ, this.filterCut)
    })
    this.$watch('mainVol', () => {
      audio.setVolume(this.mainVol / 100)
    })

    // Really simple MIDI support
    midi.getAccess().then((access) => {
      if (!access) return
      this.midiDevice = access.inputs.values().next().value
      if (!this.midiDevice) return
      console.log(`Found MIDI! Using device: ${this.midiDevice.name}`)
      // Listen for note on messages from all channels
      this.midiDevice.onmidimessage = (e) => {
        if (e.data[0] == 148 && e.data[2] > 0) {
          audio.playNote(e.data[1], this.attackTime, this.releaseTime, this.sustainTime, this.filterEnv)
        }
      }
    })
  },

  // test() {
  //   const count = 120
  //   const bigBuffer = ctx.createBuffer(1, this.buffSize * count, ctx.sampleRate)
  //   this.blendAmount = 3
  //   for (let i = 0; i < count; i++) {
  //     for (let j = 0; j < this.buffSize; j++) {
  //       bigBuffer.getChannelData(0)[i * this.buffSize + j] = this.buffer.getChannelData(0)[j]
  //     }
  //     this.modSine()
  //   }
  //   utils.saveWav(bigBuffer, generateName())
  // },

  // ============= Playback functions ================

  play() {
    audio.play(this.mainVol / 100)
  },

  stop: audio.stop,

  playSynth() {
    audio.playNote(this.noteNum, this.attackTime, this.releaseTime, this.sustainTime, this.filterEnv, this.reverb)
  },

  // ============= General UX functions ================

  exportWav() {
    utils.saveWav(this.buffer, generateName())
  },

  // ============= Generator functions ================

  genSaw() {
    this.saveUndoBuffer()
    for (var i = 0; i < this.buffSize; i++) {
      this.buffer.getChannelData(0)[i] = (i / this.buffSize) * 2 - 1
    }
    this.drawBuffer()
  },

  genSquare() {
    this.saveUndoBuffer()
    for (var i = 0; i < this.buffSize; i++) {
      this.buffer.getChannelData(0)[i] = i < this.buffSize / 2 ? -1 : +1
    }
    this.drawBuffer()
  },

  genTriangle() {
    this.saveUndoBuffer()
    for (var i = 0; i < this.buffSize; i++) {
      let val = -1 + (i / this.buffSize) * 4
      val = val > 1 ? 1 - (val - 1) : val
      this.buffer.getChannelData(0)[i] = val
    }
    this.drawBuffer()
  },

  genNoise() {
    this.saveUndoBuffer()
    for (var i = 0; i < this.buffSize; i++) {
      this.buffer.getChannelData(0)[i] = Math.random() * 2 - 1
    }
    this.drawBuffer()
  },

  genSine() {
    this.saveUndoBuffer()
    for (var i = 0; i < this.buffSize; i++) {
      this.buffer.getChannelData(0)[i] = Math.sin((1 * i * Math.PI * 2) / this.buffSize)
    }
    this.drawBuffer()
  },

  // ============= Modifier functions ================

  modPitch(freq) {
    this.saveUndoBuffer()
    const clone = []
    for (var i = 0; i < this.buffSize; i++) {
      clone[i] = this.buffer.getChannelData(0)[i]
    }

    for (var i = 0; i < this.buffSize; i++) {
      this.buffer.getChannelData(0)[i] = clone[(i * freq) % this.buffSize]
    }
    this.drawBuffer()
  },

  modAmp() {
    this.saveUndoBuffer()
    for (var i = 0; i < this.buffSize; i++) {
      let newVal = this.buffer.getChannelData(0)[i] * (1 + this.ampAmount / 100)
      newVal = this.buffer.getChannelData(0)[i] = utils.foldClamp(newVal, this.folding)
    }
    this.drawBuffer()
  },

  modOffset() {
    this.saveUndoBuffer()
    for (var i = 0; i < this.buffSize; i++) {
      let newVal = this.buffer.getChannelData(0)[i] + this.ampAmount / 100
      newVal = this.buffer.getChannelData(0)[i] = utils.foldClamp(newVal, this.folding)
    }
    this.drawBuffer()
  },

  modReduce() {
    this.saveUndoBuffer()
    for (var i = 0; i < this.buffSize; i += this.smoothReduceSize) {
      let val = this.buffer.getChannelData(0)[i]
      for (var j = 0; j < this.smoothReduceSize; j++) {
        if (j + i < 0 || j + i >= this.buffSize) {
          continue
        }
        this.buffer.getChannelData(0)[(i + j) % this.buffSize] = val
      }
    }
    this.drawBuffer()
  },

  modLoopClean() {
    this.saveUndoBuffer()

    this.buffer.getChannelData(0)[0] = 0.0
    this.buffer.getChannelData(0)[this.buffSize - 1] = 0.0

    this.modSmooth(0, this.smoothReduceSize)
    this.modSmooth(this.buffSize - this.smoothReduceSize, this.buffSize)

    this.buffer.getChannelData(0)[0] = 0.0
    this.buffer.getChannelData(0)[this.buffSize - 1] = 0.0

    this.drawBuffer()
  },

  modRoughen() {
    this.saveUndoBuffer()
    for (var i = 0; i < this.buffSize; i++) {
      const roughness = Math.random() * this.roughAmount - this.roughAmount / 2
      let newVal = this.buffer.getChannelData(0)[i] + roughness
      this.buffer.getChannelData(0)[i] = utils.foldClamp(newVal, this.folding)
    }
    this.drawBuffer()
  },

  modSmooth(start = 0, end = this.buffSize) {
    this.saveUndoBuffer()
    let clone = []
    for (var i = 0; i < this.buffSize; i++) {
      clone[i] = this.buffer.getChannelData(0)[i]
    }

    const halfWindow = this.smoothReduceSize / 2

    for (var i = start; i < end; i++) {
      let avg = 0
      for (var j = -halfWindow; j < halfWindow; j++) {
        if (j + i < 0 || j + i >= this.buffSize) {
          continue
        }
        avg += clone[(i + j) % this.buffSize] / this.smoothReduceSize
      }
      this.buffer.getChannelData(0)[i] = avg
    }
    this.drawBuffer()
  },

  // ============= Blending functions ================

  modSquare() {
    this.saveUndoBuffer()
    let blendBuffer = []
    for (var i = 0; i < this.buffSize; i++) {
      blendBuffer[i] = i < this.buffSize / 2 ? -1 : +1
    }
    utils.blend(this.buffer, this.blendAmount / 100, blendBuffer, this.folding, this.flipBlend)
    this.drawBuffer()
  },

  modSaw() {
    this.saveUndoBuffer()
    let blendBuffer = []
    for (var i = 0; i < this.buffSize; i++) {
      blendBuffer[i] = (i / this.buffSize) * 2 - 1
    }
    utils.blend(this.buffer, this.blendAmount / 100, blendBuffer, this.folding, this.flipBlend)
    this.drawBuffer()
  },

  modTriangle() {
    this.saveUndoBuffer()
    let blendBuffer = []
    for (var i = 0; i < this.buffSize; i++) {
      let val = -1 + (i / this.buffSize) * 4
      val = val > 1 ? 1 - (val - 1) : val
      blendBuffer[i] = val
    }
    utils.blend(this.buffer, this.blendAmount / 100, blendBuffer, this.folding, this.flipBlend)
    this.drawBuffer()
  },

  modSine() {
    this.saveUndoBuffer()
    let blendBuffer = []
    for (var i = 0; i < this.buffSize; i++) {
      blendBuffer[i] = Math.sin((1 * i * Math.PI * 2) / this.buffSize)
    }
    utils.blend(this.buffer, this.blendAmount / 100, blendBuffer, this.folding, this.flipBlend)
    this.drawBuffer()
  },

  // ============= Rendering & drawing functions ================

  mouseDraw(evt) {
    if (!this.drawing) return

    const x = evt.offsetX / canvas.getBoundingClientRect().width
    const y = evt.offsetY / canvas.getBoundingClientRect().height
    const i = Math.ceil(x * this.buffSize)
    const drawSize = Math.ceil(this.buffSize / 150)
    const newVal = (1 - y) * 2 - 1

    for (let j = 0; j < drawSize; j++) {
      this.buffer.getChannelData(0)[i + j] = newVal
    }

    this.drawBuffer()
  },

  drawBuffer() {
    const canvasCtx = canvas.getContext('2d')
    const width = canvas.width
    const height = canvas.height
    const data = this.buffer.getChannelData(0)

    canvasCtx.fillStyle = '#000000'
    canvasCtx.fillRect(0, 0, width, height)
    canvasCtx.fillStyle = '#00DD00'
    canvasCtx.strokeStyle = '#888888'
    canvasCtx.beginPath()
    canvasCtx.moveTo(0, height / 2)
    canvasCtx.lineTo(width, height / 2)
    canvasCtx.stroke()

    canvasCtx.strokeStyle = '#00DD00'
    canvasCtx.lineWidth = 1.0
    canvasCtx.beginPath()

    for (var i = 0; i < this.buffSize; i++) {
      const x = (i * width) / this.buffSize
      let y = (1 - (data[i] + 1) / 2) * height
      canvasCtx.lineTo(x, y)
      canvasCtx.stroke()
      canvasCtx.moveTo(x, y)
    }
  },

  // ============= Undo/redo functions ================
  saveUndoBuffer() {
    let buff = []
    this.undoBuffers.push(buff)
    for (var i = 0; i < this.buffSize; i++) {
      buff[i] = this.buffer.getChannelData(0)[i]
    }
    if (this.undoBuffers.length > MAX_UNDO) {
      this.undoBuffers.shift()
    }
  },

  undo() {
    if (this.undoBuffers.length < 2) {
      return
    }
    let buff = this.undoBuffers.pop()
    if (!buff) return
    for (var i = 0; i < this.buffSize; i++) {
      this.buffer.getChannelData(0)[i] = buff[i]
    }
    this.drawBuffer()
  },
}))

Alpine.start()
