import { useEffect, useRef, useState } from 'react'
import Icon from './Icon'
import { formatBpm, tempoMarking } from '../utils/format'
import { beatIntervalMs, countInBeatsFor } from '../utils/countIn'
import { playMetronomeClick } from '../utils/metronome'
import type { PlayerStatus, Song } from '../types/api'

const MIN_BPM = 40
const MAX_BPM = 180

interface TempoCardProps {
  status: PlayerStatus | null
  song: Song | null
  onTempoChange: (bpm: number) => void
  /** 1-based beat during local count-in; null when not counting in. */
  countInBeat?: number | null
}

function clampBpm(value: number): number {
  return Math.max(MIN_BPM, Math.min(MAX_BPM, Math.round(value)))
}

export default function TempoCard({
  status,
  song,
  onTempoChange,
  countInBeat = null,
}: TempoCardProps) {
  const tempo = clampBpm(Number(status?.effective_bpm) || song?.bpm || 120)
  const original = clampBpm(Number(status?.bpm) || song?.bpm || tempo)
  const marking = tempoMarking(tempo)
  const beatsPerBar = countInBeatsFor(status, song)
  const beatInterval = beatIntervalMs(tempo)

  const [draft, setDraft] = useState(() => String(tempo))
  const [editing, setEditing] = useState(false)
  const [metronomeOn, setMetronomeOn] = useState(false)
  /** 1-based active column; null = none highlighted. */
  const [activeBeat, setActiveBeat] = useState<number | null>(null)
  const lastBeatRef = useRef(-1)
  const draftRef = useRef(draft)
  const skipBlurCommitRef = useRef(false)
  const lastSyncedTempoRef = useRef(tempo)
  draftRef.current = draft

  // Sync input from player tempo only when the committed value changes (not while typing).
  useEffect(() => {
    if (editing) return
    if (lastSyncedTempoRef.current === tempo) return
    lastSyncedTempoRef.current = tempo
    setDraft(String(tempo))
    draftRef.current = String(tempo)
  }, [tempo, editing])

  // Mirror count-in beats onto the columns.
  useEffect(() => {
    if (countInBeat != null && countInBeat > 0) {
      setActiveBeat(((countInBeat - 1) % beatsPerBar) + 1)
      return
    }
    if (!metronomeOn || !status?.playing || status.paused) {
      if (countInBeat == null) setActiveBeat(null)
      lastBeatRef.current = -1
    }
  }, [countInBeat, beatsPerBar, metronomeOn, status?.playing, status?.paused])

  // Playback metronome + column sync (song-time, tempo-aware).
  useEffect(() => {
    const countingIn = countInBeat != null
    if (!metronomeOn || countingIn || !status?.playing || status.paused || status.counting_in) {
      if (!countingIn && (!metronomeOn || !status?.playing || status?.paused)) {
        lastBeatRef.current = -1
      }
      return
    }

    const baseBpm = Number(status.bpm) || original || 120
    const rate = Number(status.tempo_rate) || 1
    const beatPeriod = 60 / baseBpm
    const songElapsedAt = Number(status.elapsed) || 0
    const wallAt = performance.now()

    const tick = () => {
      if (beatPeriod <= 0) return
      const elapsed = songElapsedAt + ((performance.now() - wallAt) / 1000) * rate
      if (elapsed < 0) return
      const beatIndex = Math.floor(elapsed / beatPeriod)
      if (beatIndex <= lastBeatRef.current) return
      if (beatIndex > lastBeatRef.current + 1) {
        lastBeatRef.current = beatIndex - 1
      }
      lastBeatRef.current = beatIndex
      const beatInBar = (beatIndex % beatsPerBar) + 1
      setActiveBeat(beatInBar)
      playMetronomeClick(beatInBar === 1)
    }

    tick()
    const id = window.setInterval(tick, 25)
    return () => window.clearInterval(id)
  }, [
    metronomeOn,
    countInBeat,
    status?.playing,
    status?.paused,
    status?.counting_in,
    status?.elapsed,
    status?.bpm,
    status?.tempo_rate,
    beatsPerBar,
    original,
  ])

  if (!status) return null

  const commit = (raw: string) => {
    if (skipBlurCommitRef.current) {
      skipBlurCommitRef.current = false
      return
    }
    const parsed = Number.parseInt(String(raw).replace(/[^\d]/g, ''), 10)
    setEditing(false)
    if (!Number.isFinite(parsed)) {
      setDraft(String(tempo))
      draftRef.current = String(tempo)
      return
    }
    const next = clampBpm(parsed)
    setDraft(String(next))
    draftRef.current = String(next)
    lastSyncedTempoRef.current = next
    if (next !== tempo) onTempoChange(next)
  }

  const stepTempo = (delta: number) => {
    const current = Number.parseInt(String(draftRef.current).replace(/[^\d]/g, ''), 10)
    const base = Number.isFinite(current) ? current : tempo
    const next = clampBpm(base + delta)
    if (next === base) return
    setEditing(false)
    setDraft(String(next))
    draftRef.current = String(next)
    lastSyncedTempoRef.current = next
    onTempoChange(next)
  }

  const measureLabel = `${beatsPerBar} beat measure`

  return (
    <div className="relative rounded-[20px] border border-[#e5e7ec] bg-white p-5 shadow-[0_8px_28px_rgba(23,32,51,0.03)] sm:p-6 lg:col-span-1 lg:row-start-1">
      <div className="flex items-center gap-2.5">
        <span className="text-[#6458e8]">
          <Icon name="metronome" size={20} />
        </span>
        <h2 className="font-bold">Tempo</h2>
      </div>

      <div className="mt-6">
        <div className="flex h-16 w-full overflow-hidden rounded-xl border border-[#dfe2e7] bg-[#fafbfc] transition focus-within:border-[#6458e8] focus-within:ring-2 focus-within:ring-[#eceaff]">
          <div className="flex min-w-0 flex-1 items-end px-3 pb-2">
            <input
              type="number"
              min={MIN_BPM}
              max={MAX_BPM}
              step={1}
              value={draft}
              className="tempo-input min-w-0 flex-1 bg-transparent text-[40px] font-bold leading-none tracking-[-0.06em] outline-none"
              aria-label="Tempo in beats per minute"
              onFocus={(e) => {
                setEditing(true)
                e.currentTarget.select()
              }}
              onChange={(e) => {
                const next = e.target.value.replace(/[^\d]/g, '')
                setDraft(next)
                draftRef.current = next
              }}
              onBlur={() => commit(draftRef.current)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur()
                } else if (e.key === 'Escape') {
                  setDraft(String(tempo))
                  draftRef.current = String(tempo)
                  setEditing(false)
                  e.currentTarget.blur()
                }
              }}
            />
            <span className="mb-1.5 ml-1 text-xs font-bold uppercase text-[#959ba7]">BPM</span>
          </div>
          <div className="flex w-10 shrink-0 flex-col border-l border-[#dfe2e7]">
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                skipBlurCommitRef.current = true
                stepTempo(1)
              }}
              className="flex flex-1 items-center justify-center text-base font-semibold leading-none text-[#626a7a] transition hover:bg-[#f2f0ff] hover:text-[#6458e8]"
              aria-label="Increase tempo"
            >
              +
            </button>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                skipBlurCommitRef.current = true
                stepTempo(-1)
              }}
              className="flex flex-1 items-center justify-center border-t border-[#dfe2e7] text-base font-semibold leading-none text-[#626a7a] transition hover:bg-[#f2f0ff] hover:text-[#6458e8]"
              aria-label="Decrease tempo"
            >
              −
            </button>
          </div>
        </div>

        <span className="absolute right-5 top-5 rounded-full bg-[#edf8f3] px-2.5 py-1 text-[10px] font-bold text-[#42966f] sm:right-6 sm:top-6">
          {marking}
        </span>
      </div>

      <div className="mt-4">
        <div
          className="flex h-9 items-end gap-1.5"
          aria-label={`${beatsPerBar} beat metronome indicator`}
        >
          {Array.from({ length: beatsPerBar }, (_, index) => {
            const beat = index + 1
            const isActive = metronomeOn && activeBeat === beat
            return (
              <span
                key={`${beatsPerBar}-${beat}-${isActive ? activeBeat : 'idle'}`}
                className={`h-full min-w-0 flex-1 rounded-md ${
                  isActive ? 'beat-column-active bg-[#6458e8]' : 'bg-[#e8e8f0]'
                }`}
                style={isActive ? { animationDuration: `${beatInterval}ms` } : undefined}
              />
            )
          })}
        </div>
        <p className="mt-1.5 text-center text-[9px] font-bold uppercase tracking-[0.1em] text-[#999fac]">
          {measureLabel}
        </p>
      </div>

      <p className="mt-3 text-[10px] font-medium text-[#9298a5]">
        Original tempo: {formatBpm(original)} BPM
      </p>

      <button
        type="button"
        aria-pressed={metronomeOn}
        onClick={() => {
          setMetronomeOn((on) => {
            const next = !on
            if (next) playMetronomeClick(true)
            else setActiveBeat(null)
            return next
          })
        }}
        className={`mt-4 flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-xs font-semibold transition ${
          metronomeOn
            ? 'border-[#c9c5f8] bg-[#f2f0ff] text-[#5f54dc]'
            : 'border-[#e3e5e9] bg-[#fafbfc] text-[#626a79] hover:border-[#c9c5f8]'
        }`}
      >
        <span className="flex items-center gap-2">
          <Icon name="metronome" size={16} />
          Metronome
        </span>
        <span
          className={`relative h-5 w-9 rounded-full transition ${
            metronomeOn ? 'bg-[#6458e8]' : 'bg-[#d5d8de]'
          }`}
        >
          <span
            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
              metronomeOn ? '-translate-x-4' : 'translate-x-0'
            }`}
          />
        </span>
      </button>
    </div>
  )
}
