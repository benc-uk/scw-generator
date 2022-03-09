import * as audio from './audio.js'
import * as utils from './utils.js'
import Alpine from 'https://unpkg.com/alpinejs@3.7.0/dist/module.esm.js'
const VERSION = '0.0.3'
const MAX_UNDO = 30

let buffer = null
let ctx = null
let canvas = null
let undoBuffers = []

Alpine.data('app', () => ({
  version: VERSION,
  tab: 'simple',
  sampleRate: 0,
  sampleCount: 337,
  drawing: false,
  folding: true,

  ampAmount: 35,
  roughAmount: 0.1,
  smoothSize: 4,

  filterCut: 3000,
  filterQ: 0,
  releaseTime: 800,
  attackTime: 100,
  sustainTime: 500,

  play: audio.play,
  stop: audio.stop,
  playSynth() {
    audio.playNote(this.attackTime, this.releaseTime, this.sustainTime)
  },

  save() {
    utils.saveWav(buffer)
  },
  saveUndoBuffer,
  undo,

  genSaw,
  genSine,
  genSquare,
  genNoise,
  genTriangle,

  modMouseDraw,
  modPitch,
  modAmp,
  modSmooth,
  modLoopClean,
  modRoughen,

  init() {
    ctx = new AudioContext()
    canvas = document.getElementById('canvas')

    buffer = ctx.createBuffer(1, this.sampleCount, ctx.sampleRate)
    audio.init(buffer, this.filterCut, this.filterQ)
    this.sampleRate = ctx.sampleRate
    genSaw()

    this.$watch('sampleCount', () => {
      audio.stop()
      buffer = ctx.createBuffer(1, this.sampleCount, ctx.sampleRate)
      this.genSaw()
    })

    this.$watch('filterCut', () => {
      audio.setFilterParams(this.filterQ, this.filterCut)
    })
    this.$watch('filterQ', () => {
      audio.setFilterParams(this.filterQ, this.filterCut)
    })
  },
}))

Alpine.start()

function modMouseDraw(evt) {
  if (!this.drawing) return

  const x = evt.offsetX / canvas.getBoundingClientRect().width
  const y = evt.offsetY / canvas.getBoundingClientRect().height
  const i = Math.ceil(x * buffer.length)
  buffer.getChannelData(0)[i] = (1 - y) * 2 - 1
  buffer.getChannelData(0)[i + 1] = (1 - y) * 2 - 1
  drawBuffer()
}

function modPitch(freq) {
  saveUndoBuffer()
  const clone = []
  for (var i = 0; i < buffer.length; i++) {
    clone[i] = buffer.getChannelData(0)[i]
  }

  for (var i = 0; i < buffer.length; i++) {
    buffer.getChannelData(0)[i] = clone[(i * freq) % buffer.length]
  }
  drawBuffer()
}

function modAmp(amount = 0, fold = false) {
  saveUndoBuffer()
  for (var i = 0; i < buffer.length; i++) {
    let newVal = buffer.getChannelData(0)[i] * (1 + amount / 100)
    if (fold) {
      newVal = newVal > 1 ? 1 - (newVal - 1) : newVal
      newVal = newVal < -1 ? -(newVal + 2) : newVal
    } else {
      newVal = Math.min(1, Math.max(-1, newVal))
    }
    buffer.getChannelData(0)[i] = newVal
  }
  drawBuffer()
}

function modSmooth(windowSize = 8, start = 0, end = buffer.length) {
  saveUndoBuffer()
  let clone = []
  for (var i = 0; i < buffer.length; i++) {
    clone[i] = buffer.getChannelData(0)[i]
  }

  const halfWindow = windowSize / 2

  for (var i = start; i < end; i++) {
    let avg = 0
    for (var j = -halfWindow; j < halfWindow; j++) {
      if (j + i < 0 || j + i >= buffer.length) {
        continue
      }
      avg += clone[(i + j) % buffer.length] / windowSize
    }
    buffer.getChannelData(0)[i] = avg
  }
  drawBuffer()
}

function modLoopClean() {
  saveUndoBuffer()
  const size = 8
  buffer.getChannelData(0)[0] = 0.0
  buffer.getChannelData(0)[buffer.length - 1] = 0.0

  modSmooth(size, 0, size)
  modSmooth(size, buffer.length - size, buffer.length)

  buffer.getChannelData(0)[0] = 0.0
  buffer.getChannelData(0)[buffer.length - 1] = 0.0

  drawBuffer()
}

function modRoughen(amount = 0.3, fold = false) {
  saveUndoBuffer()
  for (var i = 0; i < buffer.length; i++) {
    const roughness = Math.random() * amount - amount / 2
    let newVal = buffer.getChannelData(0)[i] + roughness
    if (fold) {
      newVal = newVal > 1 ? 1 - (newVal - 1) : newVal
      newVal = newVal < -1 ? -(newVal + 2) : newVal
    } else {
      newVal = Math.min(1, Math.max(-1, newVal))
    }

    buffer.getChannelData(0)[i] = newVal
  }
  drawBuffer()
}

function genSaw() {
  saveUndoBuffer()
  for (var i = 0; i < buffer.length; i++) {
    buffer.getChannelData(0)[i] = (i / buffer.length) * 2 - 1
  }
  drawBuffer()
}

function genSquare() {
  saveUndoBuffer()
  for (var i = 0; i < buffer.length; i++) {
    buffer.getChannelData(0)[i] = i < buffer.length / 2 ? -1 : +1
  }
  drawBuffer()
}

function genTriangle() {
  saveUndoBuffer()
  for (var i = 0; i < buffer.length; i++) {
    let val = -1 + (i / buffer.length) * 4
    val = val > 1 ? 1 - (val - 1) : val
    buffer.getChannelData(0)[i] = val
  }
  drawBuffer()
}

function genNoise() {
  saveUndoBuffer()
  for (var i = 0; i < buffer.length; i++) {
    buffer.getChannelData(0)[i] = Math.random() * 2 - 1
  }
  drawBuffer()
}

function genSine() {
  saveUndoBuffer()
  for (var i = 0; i < buffer.length; i++) {
    buffer.getChannelData(0)[i] = Math.sin((1 * i * Math.PI * 2) / buffer.length)
  }
  drawBuffer()
}

function drawBuffer() {
  const canvasCtx = canvas.getContext('2d')
  const width = canvas.width
  const height = canvas.height
  const data = buffer.getChannelData(0)

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
  for (var i = 0; i < buffer.length; i++) {
    const x = (i * width) / buffer.length
    let y = (1 - (data[i] + 1) / 2) * height
    canvasCtx.lineTo(x, y)
    canvasCtx.stroke()
    canvasCtx.moveTo(x, y)
  }
}

function saveUndoBuffer() {
  let buff = []
  undoBuffers.push(buff)
  for (var i = 0; i < buffer.length; i++) {
    buff[i] = buffer.getChannelData(0)[i]
  }
  if (undoBuffers.length > MAX_UNDO) {
    undoBuffers.shift()
  }
}

function undo() {
  if (undoBuffers.length < 2) {
    return
  }
  let buff = undoBuffers.pop()
  if (!buff) return
  for (var i = 0; i < buffer.length; i++) {
    buffer.getChannelData(0)[i] = buff[i]
  }
  drawBuffer()
}
