import { useState, useCallback, useEffect } from 'react'
import type { PlayerStatus } from '../types/api'
import { apiClient } from '../utils/api'

export function usePlayer() {
  const [status, setStatus] = useState<PlayerStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Poll for status updates every 500ms
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>
    const poll = async () => {
      try {
        const newStatus = await apiClient.getStatus()
        setStatus(newStatus)
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

  const play = useCallback(async (filename: string) => {
    try {
      await apiClient.play(filename)
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

  const stop = useCallback(async () => {
    try {
      await apiClient.stop()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Stop failed')
    }
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
    stop,
    seek,
    setTempo,
  }
}
