let filter = null
let gain = null
let source = null
let oldFilterCut = 0
let oldFilterQ = 0

const NEAR_ZERO = 0.00000001
const ctx = new AudioContext()

export function init(buff, filterCut, filterQ) {
  filter = ctx.createBiquadFilter()
  gain = ctx.createGain()
  filter.Q.value = filterQ
  filter.frequency.value = filterCut

  source = ctx.createBufferSource()
  source.buffer = buff
  source.loop = true
  gain.gain.value = 0
  source.connect(filter)
  filter.connect(gain)
  gain.connect(ctx.destination)
}

export function play() {
  oldFilterCut = filter.frequency.value
  oldFilterQ = filter.Q.value
  filter.frequency.value = 24000
  filter.Q.value = 0

  startAudio()
  gain.gain.value = 1
}

export function playNote(attackTime, releaseTime, sustainTime) {
  if (gain.gain.value == 1) {
    stop()
  }
  startAudio()
  const now = ctx.currentTime

  const at = attackTime / 1000
  const rt = releaseTime / 1000
  const st = sustainTime / 1000
  gain.gain.cancelScheduledValues(now)
  gain.gain.setValueAtTime(NEAR_ZERO, now)
  gain.gain.exponentialRampToValueAtTime(1, now + at)
  gain.gain.setValueAtTime(1, now + at + st)
  gain.gain.exponentialRampToValueAtTime(NEAR_ZERO, now + at + rt + st)
  gain.gain.setValueAtTime(0, now + at + rt + st + 0.0001)
}

export function stop() {
  gain.gain.value = 0.0
  filter.frequency.value = oldFilterCut
  filter.Q.value = oldFilterQ
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
