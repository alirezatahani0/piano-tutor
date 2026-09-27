import Icon from './Icon'
import Cover from './Cover'
import type { Song } from '../types/api'

interface LibraryItemProps {
  song: Song
  selected: boolean
  onSelect: () => void
}

export default function LibraryItem({ song, selected, onSelect }: LibraryItemProps) {
  return (
    <button
      onClick={onSelect}
      className={`group flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left transition ${
        selected ? 'bg-[#f5f4ff]' : 'hover:bg-[#f8f9fa]'
      }`}
    >
      <Cover
        accent={song.metadata?.accent as string || '#d9d6ea'}
        mark={song.metadata?.mark as string || '#5d518c'}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-[#283044]">
          {song.title || song.filename}
        </p>
        <p className="mt-1 truncate text-[11px] text-[#9298a5]">{song.artist || '—'}</p>
        <p className="mt-1.5 text-[9px] font-semibold uppercase tracking-wide text-[#9ba1ad]">
          {song.metadata?.difficulty as string || 'Intermediate'} · {song.bpm || '—'} BPM
        </p>
      </div>
      <span
        className={`transition ${selected ? 'text-[#6458e8]' : 'text-[#b1b6c0] group-hover:translate-x-0.5'}`}
      >
        <Icon name="chevron" size={18} />
      </span>
    </button>
  )
}
