import { useState } from 'react'
import Icon from './Icon'
import Cover from './Cover'
import { formatTime } from '../utils/format'
import type { PlayerStatus, Song } from '../types/api'

interface PlayerCardProps {
  status: PlayerStatus | null
  song: Song | null
  onPlay: () => void
  onPause: () => void
  onSeek: (pos: number) => void
  onSkip: (direction: 1 | -1) => void
}

export default function PlayerCard({
  status,
  song,
  onPlay,
  onPause,
  onSeek,
  onSkip,
}: PlayerCardProps) {
  const [volume, setVolume] = useState(72)

  if (!status || !song) {
    return (
      <div className="rounded-[20px] border border-[#e5e7ec] bg-white p-5 shadow-[0_8px_28px_rgba(23,32,51,0.04)] sm:p-7">
        <p className="text-center text-sm text-[#8a91a0]">No song selected</p>
      </div>
    )
  }

  const progress = Math.min(100, (status.elapsed / (status.duration || 1)) * 100)

  return (
    <div className="rounded-[20px] border border-[#e5e7ec] bg-white p-5 shadow-[0_8px_28px_rgba(23,32,51,0.04)] sm:p-7">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <Cover accent={song.metadata?.accent as string || '#d9d6ea'} mark={song.metadata?.mark as string || '#5d518c'} large />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="rounded-full bg-[#f0eefc] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#6559d9]">
                Now learning
              </span>
              <h2 className="mt-3 text-2xl font-bold tracking-[-0.04em] sm:text-[28px]">
                {song.title || song.filename}
              </h2>
              <p className="mt-1 text-sm text-[#788091]">{song.artist || '—'}</p>
            </div>
            <button className="rounded-full p-2.5 transition hover:bg-[#f7f7fa] text-[#9ba1ae]" aria-label="Toggle favorite">
              <Icon name="heart" size={21} />
            </button>
          </div>

          <div className="mt-6">
            <button
              className="group relative block h-2 w-full overflow-hidden rounded-full bg-[#eceef2]"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect()
                const newPos = ((e.clientX - rect.left) / rect.width) * (status.duration || 0)
                onSeek(newPos)
              }}
              aria-label="Seek through song"
            >
              <span
                className="absolute inset-y-0 left-0 rounded-full bg-[#6458e8]"
                style={{ width: `${progress}%` }}
              />
            </button>
            <div className="mt-2 flex justify-between text-[11px] font-medium tabular-nums text-[#8b92a1]">
              <span>{formatTime(status.elapsed)}</span>
              <span>-{formatTime(Math.max(0, (status.duration || 0) - status.elapsed))}</span>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="flex w-[84px] items-center gap-2 text-[#858c9b]">
              <Icon name="volume" size={18} />
              <input type="range" min="0" max="100" value={volume} onChange={(e) => setVolume(Number(e.target.value))} className="w-full" aria-label="Volume" />
            </div>

            <div className="flex items-center gap-4 sm:gap-6">
              <button onClick={() => onSkip(-1)} className="text-[#51596a] transition hover:text-[#6458e8]" aria-label="Previous">
                <Icon name="back" size={21} />
              </button>
              <button
                onClick={status.playing ? onPause : onPlay}
                className="flex h-[54px] w-[54px] items-center justify-center rounded-full bg-[#6458e8] text-white shadow-[0_8px_20px_rgba(100,88,232,0.28)] transition hover:bg-[#574bd8]"
                aria-label={status.playing ? 'Pause' : 'Play'}
              >
                <Icon name={status.playing ? 'pause' : 'play'} size={23} filled={!status.playing} />
              </button>
              <button onClick={() => onSkip(1)} className="text-[#51596a] transition hover:text-[#6458e8]" aria-label="Next">
                <Icon name="forward" size={21} />
              </button>
            </div>

            <div className="flex w-[84px] justify-end">
              <span className="rounded-md bg-[#f3f2fb] px-2 py-1 text-[10px] font-bold text-[#6559d9]">LED GUIDE</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
