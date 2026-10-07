import { useState, useCallback, useEffect, useRef } from 'react'
import type { PlayerStatus, Song } from '../types/api'
import { apiClient } from '../utils/api'
import {
  mergePolledStatus,
  playbackIsBusy,
  previewStatusForSong,
} from '../utils/playerStatus'

function clampTempo(bpm: number): number {
  return Math.max(40, Math.min(180, Math.round(bpm)))
}

export function usePlayer() {
  const [status, setStatus] = useState<PlayerStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const selectedSongRef = useRef<Song | null>(null)
  const statusRef = useRef<PlayerStatus | null>(null)
  const selectQueueRef = useRef<Promise<void>>(Promise.resolve())
  /** Bumps on every select/play so a stale stop() cannot clobber newer playback. */
  const playbackEpochRef = useRef(0)
  /** Integer BPM shown in the UI; polls must not overwrite this with float server math. */
  const tempoBpmRef = useRef<number | null>(null)

  statusRef.current = status

  const applyTempoOverlay = useCallback((raw: PlayerStatus): PlayerStatus => {
    const selected = selectedSongRef.current
    const original = Number(selected?.bpm) || Number(raw.bpm) || 120
    if (tempoBpmRef.current == null) {
      tempoBpmRef.current = clampTempo(Number(raw.effective_bpm) || original)
    }
    const effective = tempoBpmRef.current
    return {
      ...raw,
      bpm: original,
      effective_bpm: effective,
      tempo_rate: effective / (original > 0 ? original : 120),
    }
  }, [])

  const commitStatus = useCallback(
    (raw: PlayerStatus) => {
      const merged = mergePolledStatus(raw, selectedSongRef.current)
      setStatus(applyTempoOverlay(merged))
    },
    [applyTempoOverlay]
  )

  // Poll for status updates every 500ms
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>
    const poll = async () => {
      try {
        const newStatus = await apiClient.getStatus()
        commitStatus(newStatus)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Status update failed')
      } finally {
        setLoading(false)
      }
    }

    poll()
    interval = setInterval(poll, 500)
    return () => clearInterval(interval)
  }, [commitStatus])

  const play = useCallback(async (filename: string, options?: { countIn?: boolean }) => {
    const epoch = ++playbackEpochRef.current
    try {
      const next = await apiClient.play(filename, options)
      if (playbackEpochRef.current !== epoch) return
      setStatus(applyTempoOverlay(next))
      setError(null)
    } catch (err) {
      if (playbackEpochRef.current !== epoch) return
      setError(err instanceof Error ? err.message : 'Play failed')
    }
  }, [applyTempoOverlay])

  const pause = useCallback(async () => {
    try {
      const next = await apiClient.pause()
      setStatus(applyTempoOverlay(next))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Pause failed')
    }
  }, [applyTempoOverlay])

  const resume = useCallback(async () => {
    try {
      const next = await apiClient.resume()
      setStatus(applyTempoOverlay(next))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Resume failed')
    }
  }, [applyTempoOverlay])

  const stop = useCallback(async () => {
    playbackEpochRef.current += 1
    try {
      const stopped = await apiClient.stop()
      commitStatus(stopped)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Stop failed')
    }
  }, [commitStatus])

  const selectSong = useCallback((song: Song) => {
    const run = async () => {
      const previous = selectedSongRef.current
      const switching = previous?.filename !== song.filename
      selectedSongRef.current = song

      if (!switching) return

      // New song → snap UI tempo back to that piece's original BPM
      tempoBpmRef.current = clampTempo(song.bpm ?? 120)
      const epoch = ++playbackEpochRef.current

      try {
        if (playbackIsBusy(statusRef.current)) {
          const stopped = await apiClient.stop()
          // A play()/newer select started while we awaited stop — do not clobber it.
          if (playbackEpochRef.current !== epoch) return
          if (selectedSongRef.current?.filename !== song.filename) return
          setStatus(applyTempoOverlay(previewStatusForSong(stopped, song, { resetTempo: true })))
        } else {
          setStatus((prev) =>
            prev
              ? applyTempoOverlay(previewStatusForSong(prev, song, { resetTempo: true }))
              : prev
          )
        }
      } catch (err) {
        if (playbackEpochRef.current !== epoch) return
        setError(err instanceof Error ? err.message : 'Failed to stop previous song')
        setStatus((prev) =>
          prev
            ? applyTempoOverlay(previewStatusForSong(prev, song, { resetTempo: true }))
            : prev
        )
      }
    }

    selectQueueRef.current = selectQueueRef.current.then(run).catch(() => {})
    return selectQueueRef.current
  }, [applyTempoOverlay])

  const seek = useCallback(async (position: number) => {
    try {
      await apiClient.seek(position)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Seek failed')
    }
  }, [])

  const setTempo = useCallback(async (bpm: number) => {
    const target = clampTempo(bpm)
    tempoBpmRef.current = target

    const original =
      Number(selectedSongRef.current?.bpm) ||
      Number(statusRef.current?.bpm) ||
      120
    const rate = target / (original > 0 ? original : 120)

    // Optimistic UI update immediately
    setStatus((prev) =>
      prev
        ? {
            ...prev,
            bpm: original,
            effective_bpm: target,
            tempo_rate: rate,
          }
        : prev
    )

    try {
      await apiClient.setTempoRate(rate)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tempo change failed')
    }
  }, [])

  return {
    status,
    loading,
    error,
    play,
    pause,
    resume,
    stop,
    selectSong,
    seek,
    setTempo,
  }
}
