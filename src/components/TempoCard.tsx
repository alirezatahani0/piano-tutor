import Icon from './Icon'
import { tempoMarking } from '../utils/format'
import type { PlayerStatus } from '../types/api'

interface TempoCardProps {
  status: PlayerStatus | null
  onTempoChange: (bpm: number) => void
}

export default function TempoCard({ status, onTempoChange }: TempoCardProps) {
  if (!status) return null

  const tempo = status.effective_bpm
  const marking = tempoMarking(tempo)

  return (
    <div className="relative rounded-[20px] border border-[#e5e7ec] bg-white p-5 shadow-[0_8px_28px_rgba(23,32,51,0.03)] sm:p-6 lg:col-span-1 lg:row-start-1">
      <div className="flex items-center gap-2.5">
        <span className="text-[#6458e8]">
          <Icon name="metronome" size={20} />
        </span>
        <h2 className="font-bold">Tempo</h2>
      </div>

      <div className="mt-6 flex items-center">
        <div className="flex items-center gap-3">
          <div>
            <span className="text-[40px] font-bold leading-none tracking-[-0.06em]">{tempo}</span>
            <span className="ml-2 text-xs font-bold uppercase text-[#959ba7]">BPM</span>
          </div>
          <div className="flex flex-col gap-1">
            <button
              onClick={() => onTempoChange(Math.min(180, tempo + 1))}
              className="flex h-7 w-8 items-center justify-center rounded-md border border-[#e2e4e9] bg-[#fafbfc] text-base font-semibold leading-none text-[#626a7a] transition hover:border-[#aaa3ef] hover:bg-[#f2f0ff] hover:text-[#6458e8]"
              aria-label="Increase tempo"
            >
              +
            </button>
            <button
              onClick={() => onTempoChange(Math.max(40, tempo - 1))}
              className="flex h-7 w-8 items-center justify-center rounded-md border border-[#e2e4e9] bg-[#fafbfc] text-base font-semibold leading-none text-[#626a7a] transition hover:border-[#aaa3ef] hover:bg-[#f2f0ff] hover:text-[#6458e8]"
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

      <p className="mt-5 text-[10px] font-medium text-[#9298a5]">Original tempo: {status.bpm} BPM</p>
    </div>
  )
}
