import { bufferToWavBlob, saveBlob } from './utils.js'

const ctx = new (window.AudioContext || window.webkitAudioContext)()

let source = null

export function createBuffer(sampleCount) {
  return ctx.createBuffer(1, sampleCount, ctx.sampleRate)
}

export function play(arrayBuf) {
  if (source) return

  source = ctx.createBufferSource()
  source.buffer = arrayBuf
  source.connect(ctx.destination)
  source.loop = true
  source.start()
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
