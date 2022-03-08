import * as audio from './audio.js'
import * as util from './utils.js'
import Alpine from 'https://unpkg.com/alpinejs@3.7.0/dist/module.esm.js'
const VERSION = '0.0.1'

const ctx = new (window.AudioContext || window.webkitAudioContext)()

let buffer = null
Alpine.data('app', () => ({
  version: VERSION,
  sampleCount: 337,
  foldAmount: 35,
  filterCut: 3000,
  filterQ: 0,
  sampleRate: ctx.sampleRate,

  play: (fq, fc) => {
    audio.play(buffer, fq, fc)
  },
  stop: () => {
    audio.stop()
  },
  save: () => {
    audio.saveWav(buffer)
  },

  saw,
  square,
  noise,
  sine,
  phase,
  amp,

  init() {
    buffer = audio.init(this.sampleCount, this.filterCut, this.filterQ)
    saw()

    this.$watch('sampleCount', () => {
      audio.stop()
      buffer = audio.createBuffer(this.sampleCount)
      this.saw()
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

function phase() {
  const clone = audio.createBuffer(buffer.length)
  for (var i = 0; i < buffer.length; i++) {
    clone.getChannelData(0)[i] = buffer.getChannelData(0)[i]
  }

  for (var i = 0; i < buffer.length; i++) {
    buffer.getChannelData(0)[i] = clone.getChannelData(0)[(i * 2) % buffer.length]
  }
  drawBuffer()
}

function amp(amount = 0, fold = false) {
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

function saw() {
  for (var i = 0; i < buffer.length; i++) {
    buffer.getChannelData(0)[i] = (i / buffer.length) * 2 - 1
  }
  drawBuffer()
}

function square() {
  for (var i = 0; i < buffer.length; i++) {
    buffer.getChannelData(0)[i] = i < buffer.length / 2 ? -1 : +1
  }
  drawBuffer()
}

function noise() {
  for (var i = 0; i < buffer.length; i++) {
    buffer.getChannelData(0)[i] = Math.random() * 2 - 1
  }
  drawBuffer()
}

function sine() {
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
