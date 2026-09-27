import Icon from './Icon'
import LibraryItem from './LibraryItem'
import type { Song } from '../types/api'

interface LibraryProps {
  songs: Song[]
  selectedId: string | null
  onSelect: (filename: string) => void
  search: string
  onSearchChange: (value: string) => void
  difficulty: string
  onDifficultyChange: (value: string) => void
  collapsed: boolean
  onToggleCollapsed: () => void
}

export default function Library({
  songs,
  selectedId,
  onSelect,
  search,
  onSearchChange,
  difficulty,
  onDifficultyChange,
  collapsed,
  onToggleCollapsed,
}: LibraryProps) {
  return (
    <aside className="relative self-start rounded-[20px] border border-[#e5e7ec] bg-white shadow-[0_8px_28px_rgba(23,32,51,0.03)] lg:sticky lg:top-0 lg:col-start-2 lg:row-start-1 lg:h-[calc(100vh-76px)] lg:rounded-none lg:border-y-0 lg:border-r-0 lg:shadow-none">
      <button
        onClick={onToggleCollapsed}
        className="absolute -left-3 top-6 z-10 hidden h-7 w-7 items-center justify-center rounded-full border border-[#e1e4e9] bg-white text-[#747c8d] shadow-sm transition hover:text-[#6458e8] lg:flex"
        aria-label={collapsed ? 'Expand song library' : 'Collapse song library'}
        title={collapsed ? 'Expand song library' : 'Collapse song library'}
      >
        <span className={`transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`}>
          <Icon name="chevron" size={15} />
        </span>
      </button>

      {collapsed && (
        <div className="hidden h-full flex-col items-center py-5 lg:flex">
          <span className="mt-12 text-[#6458e8]">
            <Icon name="library" size={21} />
          </span>
          <span className="mt-4 [writing-mode:vertical-rl] text-[11px] font-bold uppercase tracking-[0.12em] text-[#7e8594]">
            Song library
          </span>
          <span className="mt-auto flex h-7 min-w-7 items-center justify-center rounded-full bg-[#f1efff] px-2 text-[10px] font-bold text-[#6458e8]">
            {songs.length}
          </span>
        </div>
      )}

      <div className={collapsed ? 'lg:hidden' : ''}>
        <div className="border-b border-[#eceef2] p-5 pb-4">
          <div className="flex items-start gap-3">
            <div>
              <h2 className="text-lg font-bold tracking-[-0.02em]">Song library</h2>
              <p className="mt-1 text-xs text-[#8a91a0]">{songs.length} songs ready to learn</p>
            </div>
          </div>

          <label className="relative mt-4 block">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#979daa]">
              <Icon name="search" size={17} />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search songs"
              className="h-10 w-full rounded-xl border border-[#e3e5e9] bg-[#fafbfc] pl-9 pr-3 text-xs outline-none transition focus:border-[#9188ed] focus:ring-2 focus:ring-[#eceaff]"
            />
          </label>

          <select
            value={difficulty}
            onChange={(e) => onDifficultyChange(e.target.value)}
            className="mt-2.5 h-10 w-full rounded-xl border border-[#e3e5e9] bg-[#fafbfc] px-3 text-xs font-medium text-[#666e7d] outline-none"
          >
            <option>All levels</option>
            <option>Beginner</option>
            <option>Intermediate</option>
            <option>Advanced</option>
          </select>
        </div>

        <div className="divide-y divide-[#eef0f3] p-2 lg:max-h-[calc(100vh-252px)] lg:overflow-y-auto">
          {songs.length === 0 ? (
            <p className="py-10 text-center text-sm text-[#8a91a0]">No songs match your search.</p>
          ) : (
            songs.map(song => (
              <LibraryItem
                key={song.filename}
                song={song}
                selected={selectedId === song.filename}
                onSelect={() => onSelect(song.filename)}
              />
            ))
          )}
        </div>
      </div>
    </aside>
  )
}
