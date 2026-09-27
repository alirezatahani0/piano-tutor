/** Short metronome click for count-in accents. */
export function playMetronomeClick(accent = false): void {
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  if (!AudioCtx) return

  // Reuse one context across clicks
  const w = window as unknown as { __pianoLedAudio?: AudioContext }
  if (!w.__pianoLedAudio) {
    w.__pianoLedAudio = new AudioCtx()
  }
  const ctx = w.__pianoLedAudio
  if (ctx.state === 'suspended') {
    void ctx.resume()
  }

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
