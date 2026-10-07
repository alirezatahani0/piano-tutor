import type { PlayerStatus, Song } from '../types/api'

/** True when playback is active and must be stopped before switching songs. */
export function playbackIsBusy(status: PlayerStatus | null | undefined): boolean {
  if (!status) return false
  return Boolean(status.playing || status.paused || status.counting_in)
}

/**
 * Idle UI status for a newly selected song.
 * `resetTempo` (default true) snaps playback speed back to the song's original BPM.
 */
export function previewStatusForSong(
  base: PlayerStatus,
  song: Song,
  options?: { resetTempo?: boolean }
): PlayerStatus {
  const songBpm = song.bpm ?? 120
  const resetTempo = options?.resetTempo ?? true
  const rate = resetTempo ? 1 : Number(base.tempo_rate) || 1
  const effective = resetTempo
    ? songBpm
    : Number(base.effective_bpm) || songBpm * rate

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
    bpm: songBpm,
    effective_bpm: effective,
    tempo_rate: rate,
    key: song.key ?? null,
    time_signature: song.time_signature ?? '4/4',
  }
}

/**
 * After a status poll, overlay selected-song metadata when the server still
 * holds a different idle file — but keep the server's tempo_rate / effective_bpm
 * so tempo steppers don't jump to song.bpm * rate against the wrong base.
 */
export function mergePolledStatus(
  polled: PlayerStatus,
  selected: Song | null
): PlayerStatus {
  if (!selected) return polled
  if (polled.playing || polled.paused || polled.counting_in) return polled
  if (polled.file === selected.filename) return polled

  const preview = previewStatusForSong(polled, selected, { resetTempo: false })
  return {
    ...preview,
    bpm: selected.bpm ?? preview.bpm,
    effective_bpm: polled.effective_bpm,
    tempo_rate: polled.tempo_rate,
  }
}
