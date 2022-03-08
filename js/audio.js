let filter
let gainNode
let source = null

const ctx = new AudioContext()

export function init(buff, filterCut, filterQ) {
  filter = ctx.createBiquadFilter()
  gainNode = ctx.createGain()
  filter.Q.value = filterQ
  filter.frequency.value = filterCut

  source = ctx.createBufferSource()
  source.buffer = buff
  source.loop = true
  gainNode.gain.value = 0
  source.connect(filter)
  filter.connect(gainNode)
  gainNode.connect(ctx.destination)
}

export function play() {
  startAudio()
  gainNode.gain.value = 1
}

export function playNote(releaseTime) {
  const t = releaseTime / 1000
  startAudio()
  playing = true
  gainNode.gain.cancelAndHoldAtTime(ctx.currentTime)
  gainNode.gain.setValueAtTime(1, ctx.currentTime)
  gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t)
  gainNode.gain.setValueAtTime(0, ctx.currentTime + t + 0.001)
}

export function stop() {
  gainNode.gain.value = 0.0
  ctx.suspend()
}

export function setFilterParams(filterQ, filterCut) {
  filter.Q.value = filterQ
  filter.frequency.value = filterCut
}

function startAudio() {
  if (ctx.state != 'running') {
    ctx.resume()
  }

  try {
    source.start()
  } catch (e) {
    // suppress error
  }
}
