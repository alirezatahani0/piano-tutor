/** Shared Web Audio context for metronome clicks and note preview. */
export function getAudioContext(): AudioContext | null {
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  if (!AudioCtx) return null

  const w = window as unknown as { __pianoLedAudio?: AudioContext }
  if (!w.__pianoLedAudio) {
    w.__pianoLedAudio = new AudioCtx()
  }
  const ctx = w.__pianoLedAudio
  if (ctx.state === 'suspended') {
    void ctx.resume()
  }
  return ctx
}
