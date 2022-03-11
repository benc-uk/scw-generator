let access

// ===============================================================================
// Attempt to get MIDI access and hold it globally
// ===============================================================================
export async function getAccess(stateChangeCallback) {
  if (!navigator.requestMIDIAccess) {
    console.error('No MIDI support, try using HTTPS and a browser that supports WebMIDI API')
    return
  }

  try {
    if (!access) {
      access = await navigator.requestMIDIAccess()
    }

    if (stateChangeCallback) access.onstatechange = () => stateChangeCallback()

    return access
  } catch (err) {
    console.error('MIDI getAccess failed', err)
  }
}

// ===============================================================================
// Direct access to MIDI access inputs map https://tinyurl.com/394y49b8
// ===============================================================================
export function getInputDevices() {
  if (!access) {
    console.error('MIDI getInputDevices failed: no access')
    return null
  }
  return access.inputs
}

// =================================================================================
// Split a byte into two nibbles
// =================================================================================
export function byteToNibbles(byte) {
  const high = byte & 0xf
  const low = byte >> 4
  return [low, high]
}
