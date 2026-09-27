import type { PlayerStatus, Song } from '../types/api'

/** True when the player has active or leftover playback state that must be cleared. */
export function playbackIsBusy(status: PlayerStatus | null | undefined): boolean {
  if (!status) return false
  return Boolean(
    status.playing ||
      status.paused ||
      status.counting_in ||
      Number(status.elapsed) > 0
  )
}

/**
 * Idle UI status for a newly selected song (matches legacy selectFile finishSelect).
 * Keeps device/LED config from `base`, clears playback, and applies song metadata.
 */
export function previewStatusForSong(base: PlayerStatus, song: Song): PlayerStatus {
  const bpm = song.bpm ?? 120
  const rate = Number(base.tempo_rate) || 1
  return {
    ...base,
    playing: false,
    paused: false,
    counting_in: false,
    count_beat: 0,
    count_beats: 0,
    elapsed: 0,
    file: null,
    title: song.title || song.filename,
    duration: song.duration || 0,
    bpm,
    effective_bpm: bpm * rate,
    key: song.key ?? null,
    time_signature: song.time_signature ?? '4/4',
  }
}

/** After a status poll, prefer selected-song preview when the server still holds a different file idle. */
export function mergePolledStatus(
  polled: PlayerStatus,
  selected: Song | null
): PlayerStatus {
  if (!selected) return polled
  if (polled.playing || polled.paused || polled.counting_in) return polled
  if (polled.file === selected.filename) return polled
  return previewStatusForSong(polled, selected)
}
