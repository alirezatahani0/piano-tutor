import PlayerCard from '../components/PlayerCard'
import TempoCard from '../components/TempoCard'
import InfoCard from '../components/InfoCard'
import KeyboardPanel from '../components/KeyboardPanel'
import Library from '../components/Library'
import { usePlayer } from '../hooks/usePlayer'
import { useLibrary } from '../hooks/useLibrary'

interface LibraryPageProps {
  player: ReturnType<typeof usePlayer>
  library: ReturnType<typeof useLibrary>
  libraryCollapsed: boolean
  setLibraryCollapsed: (collapsed: boolean) => void
}

export default function LibraryPage({
  player,
  library,
  libraryCollapsed,
  setLibraryCollapsed,
}: LibraryPageProps) {
  return (
    <>
      <section className="app-content min-w-0 space-y-5 lg:p-6 xl:p-8">
        <PlayerCard
          status={player.status}
          song={library.selected}
          onPlay={() => library.selected && player.play(library.selected.filename)}
          onPause={player.pause}
          onSeek={player.seek}
          onSkip={(dir) => {
            const current = library.songs.findIndex(s => s.filename === library.selectedId)
            const next = library.songs[(current + dir + library.songs.length) % library.songs.length]
            if (next) library.setSelectedId(next.filename)
          }}
        />

        <KeyboardPanel status={player.status} leftColor="#7067E8" rightColor="#ED5B4D" />

        <div className="grid gap-5 lg:grid-cols-3">
          <TempoCard status={player.status} onTempoChange={player.setTempo} />
          <InfoCard status={player.status} song={library.selected} />
        </div>
      </section>

      <Library
        songs={library.songs}
        selectedId={library.selectedId}
        onSelect={library.setSelectedId}
        search={library.search}
        onSearchChange={library.setSearch}
        difficulty={library.difficulty}
        onDifficultyChange={library.setDifficulty}
        collapsed={libraryCollapsed}
        onToggleCollapsed={() => setLibraryCollapsed(!libraryCollapsed)}
      />
    </>
  )
}
