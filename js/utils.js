export const $ = function (selector, parent) {
  return (parent ? parent : document).querySelector(selector)
}

export function bufferToWavBlob(abuffer, len) {
  var numOfChan = abuffer.numberOfChannels,
    length = len * numOfChan * 2 + 44,
    buffer = new ArrayBuffer(length),
    view = new DataView(buffer),
    channels = [],
    i,
    sample,
    offset = 0,
    pos = 0

  // write WAVE header
  setUint32(0x46464952) // "RIFF"
  setUint32(length - 8) // file length - 8
  setUint32(0x45564157) // "WAVE"

  setUint32(0x20746d66) // "fmt " chunk
  setUint32(16) // length = 16
  setUint16(1) // PCM (uncompressed)
  setUint16(numOfChan)
  setUint32(abuffer.sampleRate)
  setUint32(abuffer.sampleRate * 2 * numOfChan) // avg. bytes/sec
  setUint16(numOfChan * 2) // block-align
  setUint16(16) // 16-bit (hardcoded in this demo)

  setUint32(0x61746164) // "data" - chunk
  setUint32(length - pos - 4) // chunk length

  // write interleaved data
  for (i = 0; i < abuffer.numberOfChannels; i++) channels.push(abuffer.getChannelData(i))

  while (pos < length) {
    for (i = 0; i < numOfChan; i++) {
      // interleave channels
      sample = Math.max(-1, Math.min(1, channels[i][offset])) // clamp
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0 // scale to 16-bit signed int
      view.setInt16(pos, sample, true) // write 16-bit sample
      pos += 2
    }
    offset++ // next source sample
  }

  // create Blob
  return new Blob([buffer], { type: 'audio/wav' })

  function setUint16(data) {
    view.setUint16(pos, data, true)
    pos += 2
  }

  function setUint32(data) {
    view.setUint32(pos, data, true)
    pos += 4
  }
}

export function saveBlob(blob, name) {
  var a = document.createElement('a')
  document.body.appendChild(a)
  a.style = 'display: none'
  const url = window.URL.createObjectURL(blob)
  a.href = url
  a.download = name
  a.click()
  window.URL.revokeObjectURL(url)
}

export function cloneBuffer(buffer) {
  const clone = audio.createBuffer(buffer.length)

  for (var i = 0; i < buffer.length; i++) {
    clone.getChannelData(0)[i] = buffer.getChannelData(0)[i]
  }

  return clone
}

export function foldClamp(val, fold = true) {
  if (fold) {
    if (val > 1) return 1 - (val - 1)
    if (val < -1) return -(val + 2)
  } else {
    return Math.min(1, Math.max(-1, val))
  }
  return val
}

export function saveWav(arrayBuf, name) {
  const blob = bufferToWavBlob(arrayBuf, arrayBuf.length)
  saveBlob(blob, `${name}.wav`)
}

export function blend(buffer, amount, blendBuffer, fold, inverted) {
  for (var i = 0; i < buffer.length; i++) {
    let newVal = inverted ? buffer.getChannelData(0)[i] - blendBuffer[i] * amount : buffer.getChannelData(0)[i] + blendBuffer[i] * amount
    buffer.getChannelData(0)[i] = foldClamp(newVal, fold)
  }
}
