import { useState, useEffect, useMemo } from 'react'
import type { Song } from '../types/api'
import { apiClient } from '../utils/api'

export function useLibrary() {
  const [songs, setSongs] = useState<Song[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [difficulty, setDifficulty] = useState('All levels')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load songs on mount
  useEffect(() => {
    const load = async () => {
      try {
        const files = await apiClient.getFiles()
        setSongs(files)
        if (files.length > 0 && !selectedId) {
          setSelectedId(files[0].filename)
        }
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load songs')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filtered = useMemo(() => {
    return songs.filter(song => {
      const matchesSearch = `${song.title || song.filename} ${song.artist || ''}`
        .toLowerCase()
        .includes(search.toLowerCase())
      const matchesDifficulty = difficulty === 'All levels' || song.metadata?.difficulty === difficulty
      return matchesSearch && matchesDifficulty
    })
  }, [songs, search, difficulty])

  const selected = useMemo(() => songs.find(s => s.filename === selectedId), [songs, selectedId])

  return {
    songs: filtered,
    selected,
    search,
    setSearch,
    difficulty,
    setDifficulty,
    selectedId,
    setSelectedId,
    loading,
    error,
  }
}
