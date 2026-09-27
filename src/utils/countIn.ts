import type { PlayerStatus, Song } from '../types/api'

/** Beat length in ms from effective (tempo-adjusted) BPM. */
export function beatIntervalMs(bpm: number | null | undefined): number {
  const value = Number(bpm) || 120
  return Math.max(200, Math.round(60000 / value))
}

/** Beats in one bar for count-in (from status or song time signature). */
export function countInBeatsFor(status: PlayerStatus | null, song: Song | null): number {
  if (status?.count_beats && status.count_beats > 0) return status.count_beats
  if (status?.beats_per_bar && status.beats_per_bar > 0) return status.beats_per_bar
  const sig = song?.time_signature || status?.time_signature || '4/4'
  const numerator = Number(String(sig).split('/')[0])
  return Number.isFinite(numerator) && numerator > 0 ? numerator : 4
}

export function timeSignatureLabel(status: PlayerStatus | null, song: Song | null): string {
  return song?.time_signature || status?.time_signature || '4/4'
}
