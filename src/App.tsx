import { useState } from 'react'
import { usePlayer } from './hooks/usePlayer'
import { useLibrary } from './hooks/useLibrary'

export default function App() {
  const [activePage, setActivePage] = useState<'library' | 'settings'>('library')

  const player = usePlayer()
  const library = useLibrary()

  if (player.loading || library.loading) {
    return <div className="min-h-screen bg-[#f6f7f9] flex items-center justify-center">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-[#f6f7f9] text-[#172033]">
      <div className="p-8">
        <h1 className="text-2xl font-bold">Piano LED</h1>
        <p className="mt-2 text-gray-600">React app initialized - components loading</p>
        <div className="mt-4 space-y-2 text-sm">
          <p>Player status: {player.status?.file ? `Playing ${player.status.file}` : 'No file'}</p>
          <p>Songs loaded: {library.songs.length}</p>
          <p>Current page: {activePage}</p>
        </div>
      </div>
    </div>
  )
}
