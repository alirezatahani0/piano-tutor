import { useEffect, useRef, useState } from 'react'
import Icon from './Icon'
import Cover from './Cover'
import { formatTime } from '../utils/format'
import { beatIntervalMs, countInBeatsFor, timeSignatureLabel } from '../utils/countIn'
import { playMetronomeClick } from '../utils/metronome'
import { setPreviewVolume } from '../utils/noteAudio'
import type { PlayerStatus, Song } from '../types/api'

interface PlayerCardProps {
  status: PlayerStatus | null
  song: Song | null
  onPlay: () => void
  onPause: () => void
  onResume: () => void
  onSeek: (pos: number) => void
  onSkip: (direction: 1 | -1) => void
  /** Reports 1-based count-in beat (or null when idle) for tempo-column sync. */
  onCountInBeatChange?: (beat: number | null) => void
}

export default function PlayerCard({
  status,
  song,
  onPlay,
  onPause,
  onResume,
  onSeek,
  onSkip,
  onCountInBeatChange,
}: PlayerCardProps) {
  const [volume, setVolume] = useState(72)
  /** Remaining beats in the local count-in; null when idle. */
  const [countdown, setCountdown] = useState<number | null>(null)

  useEffect(() => {
    setPreviewVolume(volume)
  }, [volume])
  const onPlayRef = useRef(onPlay)
  onPlayRef.current = onPlay
  /** Locked when count-in starts so status polls cannot restart the timer. */
  const countInIntervalRef = useRef(500)

  const countInBeats = countInBeatsFor(status, song)
  const beatInterval = beatIntervalMs(status?.effective_bpm || song?.bpm)
  const timeSignature = timeSignatureLabel(status, song)
  const countInBeat = countdown === null ? null : countInBeats - countdown + 1
  const isPlaying = Boolean(status?.playing && !status?.paused && !status?.counting_in)
  const onCountInBeatChangeRef = useRef(onCountInBeatChange)
  onCountInBeatChangeRef.current = onCountInBeatChange

  // Clear count-in when the selected song changes.
  useEffect(() => {
    setCountdown(null)
  }, [song?.filename])

  // Keep tempo columns in sync with the local count-in.
  useEffect(() => {
    onCountInBeatChangeRef.current?.(countInBeat)
  }, [countInBeat])

  // Advance count-in on the song's beat grid (interval locked at start).
  useEffect(() => {
    if (countdown === null) return
    const interval = countInIntervalRef.current
    const timer = window.setTimeout(() => {
      if (countdown > 1) {
        playMetronomeClick(false)
        setCountdown(countdown - 1)
      } else {
        setCountdown(null)
        onPlayRef.current()
      }
    }, interval)
    return () => window.clearTimeout(timer)
  }, [countdown])

  if (!status || !song) {
    return (
      <div className="rounded-[20px] border border-[#e5e7ec] bg-white p-5 shadow-[0_8px_28px_rgba(23,32,51,0.04)] sm:p-7">
        <p className="text-center text-sm text-[#8a91a0]">No song selected</p>
      </div>
    )
  }

  const progress = Math.min(100, (status.elapsed / (status.duration || 1)) * 100)

  const handlePlay = () => {
    if (countdown !== null) {
      setCountdown(null)
      return
    }
    if (isPlaying) {
      onPause()
      return
    }
    if (status.paused) {
      onResume()
      return
    }
    countInIntervalRef.current = beatInterval
    setCountdown(countInBeats)
    playMetronomeClick(true)
  }

  return (
    <div className="relative rounded-[20px] border border-[#e5e7ec] bg-white p-5 shadow-[0_8px_28px_rgba(23,32,51,0.04)] sm:p-7">
      {countdown !== null && countInBeat !== null && (
        <div
          className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-[20px] bg-white/90 backdrop-blur-[2px]"
          aria-live="assertive"
          aria-label={`Count-in beat ${countInBeat} of ${countInBeats}`}
        >
          <div
            key={countdown}
            className="countdown-blink text-center"
            style={{ animationDuration: `${beatInterval}ms` }}
          >
            <span className="block text-[82px] font-extrabold leading-none tracking-[-0.08em] text-[#6458e8]">
              {countInBeat}
            </span>
            <span className="mt-4 block text-[11px] font-bold uppercase tracking-[0.16em] text-[#777f90]">
              Get ready · {timeSignature}
            </span>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <Cover
          accent={(song.metadata?.accent as string) || '#d9d6ea'}
          mark={(song.metadata?.mark as string) || '#5d518c'}
          large
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="rounded-full bg-[#f0eefc] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#6559d9]">
                {countdown !== null ? 'Count in' : 'Now learning'}
              </span>
              <h2 className="mt-3 text-2xl font-bold tracking-[-0.04em] sm:text-[28px]">
                {song.title || song.filename}
              </h2>
              <p className="mt-1 text-sm text-[#788091]">{song.artist || '—'}</p>
            </div>
            <button
              className="rounded-full p-2.5 text-[#9ba1ae] transition hover:bg-[#f7f7fa]"
              aria-label="Toggle favorite"
            >
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
              <input
                type="range"
                min={0}
                max={100}
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="volume-slider w-full"
                aria-label="Volume"
                style={{ ['--volume' as string]: `${volume}%` }}
              />
            </div>

            <div className="flex items-center gap-4 sm:gap-6">
              <button
                onClick={() => onSkip(-1)}
                className="text-[#51596a] transition hover:text-[#6458e8]"
                aria-label="Previous"
              >
                <Icon name="back" size={21} />
              </button>
              <button
                onClick={handlePlay}
                className="flex h-[54px] w-[54px] items-center justify-center rounded-full bg-[#6458e8] text-white shadow-[0_8px_20px_rgba(100,88,232,0.28)] transition hover:bg-[#574bd8]"
                aria-label={
                  countdown !== null ? 'Cancel count-in' : isPlaying ? 'Pause' : 'Play'
                }
              >
                <Icon
                  name={countdown !== null || isPlaying ? 'pause' : 'play'}
                  size={23}
                  filled={countdown === null && !isPlaying}
                />
              </button>
              <button
                onClick={() => onSkip(1)}
                className="text-[#51596a] transition hover:text-[#6458e8]"
                aria-label="Next"
              >
                <Icon name="forward" size={21} />
              </button>
            </div>

            <div className="flex w-[84px] justify-end">
              <span className="rounded-md bg-[#f3f2fb] px-2 py-1 text-[10px] font-bold text-[#6559d9]">
                LED GUIDE
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
