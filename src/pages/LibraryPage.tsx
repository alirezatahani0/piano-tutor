import { useEffect, useState } from 'react'
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
  const [countInBeat, setCountInBeat] = useState<number | null>(null)

  // Keep player preview in sync when library selection changes (including initial load).
  useEffect(() => {
    if (library.selected) {
      void player.selectSong(library.selected)
    }
    // selectSong is stable; key off the selected id only.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- avoid re-running on new player object identity
  }, [library.selectedId, player.selectSong])

  const handleSelect = (filename: string) => {
    const song = library.songs.find((s) => s.filename === filename)
    if (!song) return
    library.setSelectedId(filename)
    void player.selectSong(song)
  }

  const handleSkip = (dir: number) => {
    const current = library.songs.findIndex((s) => s.filename === library.selectedId)
    if (current < 0 || library.songs.length === 0) return
    const next = library.songs[(current + dir + library.songs.length) % library.songs.length]
    if (!next) return
    library.setSelectedId(next.filename)
    void player.selectSong(next)
  }

  return (
    <>
      <section className="app-content min-w-0 space-y-5 lg:p-6 xl:p-8">
        <PlayerCard
          status={player.status}
          song={library.selected || null}
          onPlay={() => library.selected && player.play(library.selected.filename, { countIn: false })}
          onPause={player.pause}
          onResume={player.resume}
          onSeek={player.seek}
          onSkip={handleSkip}
          onCountInBeatChange={setCountInBeat}
        />

        <KeyboardPanel status={player.status} leftColor="#7067E8" rightColor="#ED5B4D" />

        <div className="grid gap-5 lg:grid-cols-3">
          <TempoCard
            status={player.status}
            song={library.selected || null}
            onTempoChange={player.setTempo}
            countInBeat={countInBeat}
          />
          <InfoCard status={player.status} song={library.selected || null} />
        </div>
      </section>

      <Library
        songs={library.songs}
        selectedId={library.selectedId}
        onSelect={handleSelect}
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
