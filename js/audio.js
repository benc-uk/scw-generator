import { bufferToWavBlob, saveBlob } from './utils.js'

const ctx = new (window.AudioContext || window.webkitAudioContext)()

let source = null
let filter = null

export function init(sampleCount, filterCut, filterQ) {
  filter = ctx.createBiquadFilter()
  filter.Q.value = filterQ
  filter.frequency.value = filterCut
  return createBuffer(sampleCount)
}

export function createBuffer(sampleCount) {
  return ctx.createBuffer(1, sampleCount, ctx.sampleRate)
}

export function play(arrayBuf) {
  if (source) return

  source = ctx.createBufferSource()
  source.buffer = arrayBuf
  source.loop = true

  source.connect(filter)
  filter.connect(ctx.destination)

  source.start()
}

export function playNote(arrayBuf) {
  if (source) return

  source = ctx.createBufferSource()
  source.buffer = arrayBuf
  source.loop = true

  const gainNode = ctx.createGain()
  gainNode.gain.value = 1
  gainNode.gain.exponentialRampToValueAtTime(0.0000001, ctx.currentTime + 0.8)

  setTimeout(() => {
    source.stop()
    source = null
  }, 810)

  source.connect(filter)
  filter.connect(gainNode)
  gainNode.connect(ctx.destination)

  source.start()
}

export function setFilterParams(filterQ, filterCut) {
  filter.Q.value = filterQ
  filter.frequency.value = filterCut
}

export function stop() {
  if (!source) return
  source.stop()
  source = null
}

// Exporting functions
export function saveWav(arrayBuf) {
  const blob = bufferToWavBlob(arrayBuf, arrayBuf.length)
  saveBlob(blob, 'output.wav')
}
