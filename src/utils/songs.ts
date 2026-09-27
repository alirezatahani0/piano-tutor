import type { Song } from '../types/api'

/** Raw file entry from GET /api/files (uses `name`, not `filename`). */
export type ApiSong = {
  name?: string
  filename?: string
  title?: string
  artist?: string
  key?: string | null
  bpm?: number
  time_signature?: string
  duration?: number
  metadata?: Record<string, unknown>
  [key: string]: unknown
}

/** Normalize API song records so the UI always has a stable `filename` id. */
export function normalizeSong(raw: ApiSong): Song {
  const filename = raw.filename ?? raw.name
  if (!filename) {
    throw new Error('Song is missing name/filename')
  }
  return {
    filename,
    title: raw.title || filename,
    artist: raw.artist,
    key: raw.key ?? undefined,
    bpm: raw.bpm,
    time_signature: raw.time_signature,
    duration: raw.duration,
    metadata: raw.metadata,
  }
}

export function normalizeSongs(raw: ApiSong[]): Song[] {
  return raw.map(normalizeSong)
}
