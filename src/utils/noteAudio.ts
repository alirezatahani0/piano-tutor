import { getAudioContext } from './audioContext'

type Voice = { osc: OscillatorNode; gain: GainNode }

const voices = new Map<number, Voice>()

/** 0–1 master gain for MIDI note preview (from the volume slider). */
let previewGain = 0.72

export function setPreviewVolume(percent: number): void {
  previewGain = Math.max(0, Math.min(1, percent / 100))
  if (previewGain <= 0) stopAllVoices()
}

export function midiToHz(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12)
}

/** Soft triangle-wave preview for a MIDI note (matches the legacy app). */
export function startVoice(midi: number): void {
  if (previewGain <= 0) return
  stopVoice(midi, true)
  const ctx = getAudioContext()
  if (!ctx) return

  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'triangle'
  osc.frequency.value = midiToHz(midi)
  const peak = 0.12 * previewGain
  gain.gain.setValueAtTime(0.0001, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0001), ctx.currentTime + 0.02)
  osc.connect(gain).connect(ctx.destination)
  osc.start()
  voices.set(midi, { osc, gain })
}

export function stopVoice(midi: number, immediate = false): void {
  const voice = voices.get(midi)
  const ctx = getAudioContext()
  if (!voice || !ctx) return

  try {
    if (immediate) {
      voice.gain.gain.setValueAtTime(0.0001, ctx.currentTime)
      voice.osc.stop(ctx.currentTime + 0.01)
    } else {
      voice.gain.gain.cancelScheduledValues(ctx.currentTime)
      voice.gain.gain.setValueAtTime(Math.max(voice.gain.gain.value, 0.0001), ctx.currentTime)
      voice.gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18)
      voice.osc.stop(ctx.currentTime + 0.2)
    }
  } catch {
    /* already stopped */
  }
  voices.delete(midi)
}

export function stopAllVoices(): void {
  for (const midi of [...voices.keys()]) {
    stopVoice(midi, true)
  }
}
