import { getAudioContext } from './audioContext'

/** Short metronome click for count-in accents. */
export function playMetronomeClick(accent = false): void {
  const ctx = getAudioContext()
  if (!ctx) return

  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'square'
  osc.frequency.value = accent ? 1320 : 880
  const now = ctx.currentTime
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(accent ? 0.18 : 0.1, now + 0.005)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05)
  osc.connect(gain).connect(ctx.destination)
  osc.start(now)
  osc.stop(now + 0.06)
}
