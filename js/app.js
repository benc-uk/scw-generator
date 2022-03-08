import * as audio from './audio.js'
import * as utils from './utils.js'
import Alpine from 'https://unpkg.com/alpinejs@3.7.0/dist/module.esm.js'
const VERSION = '0.0.2'

let buffer = null
let ctx = null
Alpine.data('app', () => ({
  version: VERSION,
  tab: 'simple',
  sampleRate: 0,
  sampleCount: 337,

  foldAmount: 35,
  smoothSize: 4,

  filterCut: 3000,
  filterQ: 0,
  releaseTime: 800,

  play: audio.play,
  stop: audio.stop,
  playSynth() {
    audio.playNote(this.releaseTime)
  },

  save() {
    utils.saveWav(buffer)
  },

  genSaw,
  genSine,
  genSquare,
  genNoise,
  genTriangle,

  modPitch,
  modAmp,
  modSmooth,
  modLoopClean,

  init() {
    ctx = new AudioContext()
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

function modPitch(freq) {
  const clone = ctx.createBuffer(1, this.sampleCount, ctx.sampleRate)
  for (var i = 0; i < buffer.length; i++) {
    clone.getChannelData(0)[i] = buffer.getChannelData(0)[i]
  }

  for (var i = 0; i < buffer.length; i++) {
    buffer.getChannelData(0)[i] = clone.getChannelData(0)[(i * freq) % buffer.length]
  }
  drawBuffer()
}

function modAmp(amount = 0, fold = false) {
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
  const size = 8
  buffer.getChannelData(0)[0] = 0.0
  buffer.getChannelData(0)[buffer.length - 1] = 0.0

  modSmooth(size, 0, size)
  modSmooth(size, buffer.length - size, buffer.length)

  buffer.getChannelData(0)[0] = 0.0
  buffer.getChannelData(0)[buffer.length - 1] = 0.0

  drawBuffer()
}

function genSaw() {
  for (var i = 0; i < buffer.length; i++) {
    buffer.getChannelData(0)[i] = (i / buffer.length) * 2 - 1
  }
  drawBuffer()
}

function genSquare() {
  for (var i = 0; i < buffer.length; i++) {
    buffer.getChannelData(0)[i] = i < buffer.length / 2 ? -1 : +1
  }
  drawBuffer()
}

function genTriangle() {
  for (var i = 0; i < buffer.length; i++) {
    let val = -1 + (i / buffer.length) * 4
    val = val > 1 ? 1 - (val - 1) : val
    buffer.getChannelData(0)[i] = val
  }
  drawBuffer()
}

function genNoise() {
  for (var i = 0; i < buffer.length; i++) {
    buffer.getChannelData(0)[i] = Math.random() * 2 - 1
  }
  drawBuffer()
}

function genSine() {
  for (var i = 0; i < buffer.length; i++) {
    buffer.getChannelData(0)[i] = Math.sin((1 * i * Math.PI * 2) / buffer.length)
  }
  drawBuffer()
}

function drawBuffer() {
  const canvas = document.getElementById('canvas')
  const ctx = canvas.getContext('2d')
  const width = canvas.width
  const height = canvas.height
  const data = buffer.getChannelData(0)

  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, width, height)

  ctx.strokeStyle = '#888888'
  ctx.beginPath()
  ctx.moveTo(0, height / 2)
  ctx.lineTo(width, height / 2)
  ctx.stroke()

  ctx.strokeStyle = '#00dd00'
  ctx.lineWidth = 2
  ctx.beginPath()
  for (var i = 0; i < buffer.length; i++) {
    const x = (i * width) / buffer.length
    let y = (1 - (data[i] + 1) / 2) * height
    ctx.lineTo(x, y)
    ctx.stroke()
    ctx.moveTo(x, y)
  }
}
