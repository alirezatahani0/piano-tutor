import { useState, useCallback, useEffect, useRef } from 'react'
import type { PlayerStatus, Song } from '../types/api'
import { apiClient } from '../utils/api'
import {
  mergePolledStatus,
  playbackIsBusy,
  previewStatusForSong,
} from '../utils/playerStatus'

export function usePlayer() {
  const [status, setStatus] = useState<PlayerStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const selectedSongRef = useRef<Song | null>(null)
  const statusRef = useRef<PlayerStatus | null>(null)
  const selectQueueRef = useRef<Promise<void>>(Promise.resolve())

  statusRef.current = status

  // Poll for status updates every 500ms
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>
    const poll = async () => {
      try {
        const newStatus = await apiClient.getStatus()
        setStatus(mergePolledStatus(newStatus, selectedSongRef.current))
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
  }, [])

  const play = useCallback(async (filename: string, options?: { countIn?: boolean }) => {
    try {
      await apiClient.play(filename, options)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Play failed')
    }
  }, [])

  const pause = useCallback(async () => {
    try {
      await apiClient.pause()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Pause failed')
    }
  }, [])

  const resume = useCallback(async () => {
    try {
      await apiClient.resume()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Resume failed')
    }
  }, [])

  const stop = useCallback(async () => {
    try {
      const stopped = await apiClient.stop()
      setStatus(mergePolledStatus(stopped, selectedSongRef.current))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Stop failed')
    }
  }, [])

  /**
   * Switch to a song: stop prior playback if needed, then reset UI state to the new piece.
   * Queued so rapid clicks don't race stop/select.
   */
  const selectSong = useCallback((song: Song) => {
    const run = async () => {
      const previous = selectedSongRef.current
      const switching = previous?.filename !== song.filename
      selectedSongRef.current = song

      if (!switching) return

      try {
        if (playbackIsBusy(statusRef.current)) {
          const stopped = await apiClient.stop()
          setStatus(previewStatusForSong(stopped, song))
        } else {
          setStatus((prev) => (prev ? previewStatusForSong(prev, song) : prev))
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to stop previous song')
        setStatus((prev) => (prev ? previewStatusForSong(prev, song) : prev))
      }
    }

    selectQueueRef.current = selectQueueRef.current.then(run).catch(() => {})
    return selectQueueRef.current
  }, [])

  const seek = useCallback(async (position: number) => {
    try {
      await apiClient.seek(position)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Seek failed')
    }
  }, [])

  const setTempo = useCallback(async (bpm: number) => {
    try {
      await apiClient.setTempo(Math.max(40, Math.min(180, bpm)))
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
