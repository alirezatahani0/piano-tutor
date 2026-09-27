import type { PlayerStatus, Song } from '../types/api'

/** Beat length in ms from effective (tempo-adjusted) BPM. */
export function beatIntervalMs(bpm: number | null | undefined): number {
  const value = Number(bpm) || 120
  return Math.max(200, Math.round(60000 / value))
}

/** Numerator of a time signature like "3/4" → 3. */
export function beatsFromTimeSignature(sig: string | null | undefined): number | null {
  if (!sig) return null
  const numerator = Number(String(sig).split('/')[0])
  return Number.isFinite(numerator) && numerator > 0 ? numerator : null
}

/**
 * Beats in one bar for count-in — always driven by the selected song's time
 * signature (2/4 → 2, 3/4 → 3, 4/4 → 4). Falls back to status, then 4.
 */
export function countInBeatsFor(status: PlayerStatus | null, song: Song | null): number {
  const fromSongSig = beatsFromTimeSignature(song?.time_signature)
  if (fromSongSig != null) return fromSongSig

  if (song?.beats_per_bar && song.beats_per_bar > 0) return song.beats_per_bar

  const fromStatusSig = beatsFromTimeSignature(status?.time_signature)
  if (fromStatusSig != null) return fromStatusSig

  if (status?.beats_per_bar && status.beats_per_bar > 0) return status.beats_per_bar
  if (status?.count_beats && status.count_beats > 0) return status.count_beats
  return 4
}

export function timeSignatureLabel(status: PlayerStatus | null, song: Song | null): string {
  return song?.time_signature || status?.time_signature || '4/4'
}
