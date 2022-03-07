import * as audio from './audio.js'
import Alpine from 'https://unpkg.com/alpinejs@3.7.0/dist/module.esm.js'
const VERSION = '0.0.1'

const ctx = new (window.AudioContext || window.webkitAudioContext)()

let buffer = null
Alpine.data('app', () => ({
  version: VERSION,
  sampleCount: 337,
  buffer,
  audioRate: ctx.sampleRate,

  play: () => {
    audio.play(buffer)
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

  init() {
    buffer = audio.createBuffer(this.sampleCount)
    saw()

    this.$watch('sampleCount', () => {
      audio.stop()
      buffer = audio.createBuffer(this.sampleCount)
      this.saw()
    })
  },
}))

Alpine.start()

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

// draw buffer content on the canvas
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
  ctx.beginPath()
  for (var i = 0; i < buffer.length; i++) {
    const x = (i * width) / buffer.length
    let y = (1 - (data[i] + 1) / 2) * height
    ctx.lineTo(x, y)
    ctx.stroke()
    ctx.moveTo(x, y)
  }
}
