let filter = null
let gain = null
let source = null
let oldFilterCut = 0
let oldFilterQ = 0
let baseFilterCut = 0

const MAX_OPEN_FREQ = 22050
const FILTER_EG = 1200
const NEAR_ZERO = 0.00000001
const ctx = new AudioContext()

export function init(buff, filterCut, filterQ) {
  filter = ctx.createBiquadFilter()
  gain = ctx.createGain()
  filter.Q.value = filterQ
  filter.frequency.value = filterCut
  baseFilterCut = filterCut

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
  filter.frequency.value = MAX_OPEN_FREQ
  filter.Q.value = 0

  startAudio()
  gain.gain.setValueAtTime(1, ctx.currentTime)
}

export function playNote(attackTime, releaseTime, sustainTime, filterEnv = true) {
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
  gain.gain.linearRampToValueAtTime(1, now + at)
  gain.gain.setValueAtTime(1, now + at + st)
  gain.gain.exponentialRampToValueAtTime(NEAR_ZERO, now + at + rt + st)
  gain.gain.setValueAtTime(0, now + at + rt + st + 0.0001)

  if (filterEnv) {
    const cutoffStart = baseFilterCut
    const cutoffMax = baseFilterCut + FILTER_EG
    filter.frequency.cancelScheduledValues(now)
    filter.frequency.setValueAtTime(cutoffStart, now)
    filter.frequency.linearRampToValueAtTime(cutoffMax, now + at)
    filter.frequency.setValueAtTime(cutoffMax, now + at + st)
    filter.frequency.exponentialRampToValueAtTime(cutoffStart, now + at + rt + st)
    filter.frequency.setValueAtTime(cutoffStart, now + at + rt + st + 0.0001)
  }
}

export function stop() {
  gain.gain.setValueAtTime(0, ctx.currentTime)
  filter.frequency.value = oldFilterCut
  filter.Q.value = oldFilterQ
  ctx.suspend()
}

export function setFilterParams(filterQ, filterCut) {
  filter.Q.value = filterQ
  filter.frequency.value = filterCut
  baseFilterCut = filterCut
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
