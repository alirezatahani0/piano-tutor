import Icon from './Icon'
import { formatBpm, formatTime } from '../utils/format'
import type { PlayerStatus, Song } from '../types/api'

interface InfoCardProps {
  status: PlayerStatus | null
  song: Song | null
}

export default function InfoCard({ status, song }: InfoCardProps) {
  if (!status || !song) return null

  return (
    <div className="rounded-[20px] border border-[#e5e7ec] bg-white p-5 shadow-[0_8px_28px_rgba(23,32,51,0.03)] sm:p-6 lg:col-span-2 lg:col-start-2 lg:row-start-1">
      <div className="flex items-center gap-2.5">
        <span className="text-[#7c84a0]">
          <Icon name="info" size={19} />
        </span>
        <h2 className="font-bold">Song information</h2>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-x-5 gap-y-5">
        {[
          ['Key', song.key || '—'],
          ['Original tempo', `${formatBpm(status.bpm)} BPM`],
          ['Duration', formatTime(status.duration || 0)],
          ['Difficulty', (song.metadata?.difficulty as string) || 'Intermediate'],
          ['Time signature', status.time_signature || '4/4'],
          ['Hand position', 'Dynamic'],
        ].map(([label, value]) => (
          <div key={label}>
            <dt className="text-[10px] font-bold uppercase tracking-[0.06em] text-[#9aa0ac]">{label}</dt>
            <dd className="mt-1.5 text-xs font-semibold text-[#394155]">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
