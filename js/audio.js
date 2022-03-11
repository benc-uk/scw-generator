let filter = null
let synthGain = null
let basicGain = null
let source = null
let synthWet = null
let synthDry = null
let baseFilterCut = 0
let playing = false

const ctx = new AudioContext()
const FILTER_EG = 1200
const NEAR_ZERO = 0.00000001
const REVERB_WETDRY = 0.4

export async function init(buff, filterCut, filterQ) {
  filter = ctx.createBiquadFilter()
  synthGain = ctx.createGain()
  basicGain = ctx.createGain()
  filter.Q.value = filterQ
  filter.frequency.value = filterCut
  baseFilterCut = filterCut

  // load impulse response from file
  const reverb = ctx.createConvolver()
  const verbResp = await fetch('assets/reverb.wav')
  const verbBuffer = await verbResp.arrayBuffer()
  reverb.buffer = await ctx.decodeAudioData(verbBuffer)

  source = ctx.createBufferSource()
  source.buffer = buff
  source.loop = true
  synthGain.gain.value = 0
  basicGain.gain.value = 0
  source.connect(synthGain)
  source.connect(basicGain)
  synthGain.connect(filter)
  basicGain.connect(ctx.destination)

  synthDry = ctx.createGain()
  synthDry.connect(ctx.destination)
  synthWet = ctx.createGain()
  synthWet.connect(ctx.destination)
  synthWet.gain.value = 0
  synthDry.gain.value = 1
  filter.connect(synthDry)
  filter.connect(reverb)
  reverb.connect(synthWet)
}

export function play(volume) {
  basicGain.gain.setValueAtTime(volume, ctx.currentTime)
  startAudio()
  playing = true
}

export function setVolume(volume) {
  basicGain.gain.setValueAtTime(volume, ctx.currentTime)
}

export function playNote(noteNum, attackTime, releaseTime, sustainTime, filterEnv = true, reverb = true) {
  if (playing) {
    stop()
  }
  startAudio()
  const now = ctx.currentTime
  const at = attackTime / 1000
  const rt = releaseTime / 1000
  const st = sustainTime / 1000

  if (reverb) {
    synthWet.gain.value = REVERB_WETDRY
    synthDry.gain.value = 0.99 - REVERB_WETDRY
  } else {
    synthWet.gain.value = 0
    synthDry.gain.value = 0.99
  }

  // We assume the sample buffer is at C3 (note num 48)
  source.detune.setValueAtTime((noteNum - 48) * 100, now)

  synthGain.gain.cancelScheduledValues(now)
  synthGain.gain.setValueAtTime(NEAR_ZERO, now)
  synthGain.gain.linearRampToValueAtTime(1, now + at)
  synthGain.gain.setValueAtTime(1, now + at + st)
  synthGain.gain.exponentialRampToValueAtTime(NEAR_ZERO, now + at + rt + st)
  synthGain.gain.setValueAtTime(0, now + at + rt + st + 0.0001)

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
  basicGain.gain.setValueAtTime(0, ctx.currentTime)
  ctx.suspend()
  playing = false
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
