import { useState } from 'react'
import { usePlayer } from './hooks/usePlayer'
import { useLibrary } from './hooks/useLibrary'
import { useNotePreview } from './hooks/useNotePreview'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import LibraryPage from './pages/LibraryPage'
import SettingsPage from './pages/SettingsPage'

export default function App() {
  const [activePage, setActivePage] = useState<'library' | 'settings'>('library')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const [libraryCollapsed, setLibraryCollapsed] = useState(true)

  const player = usePlayer()
  const library = useLibrary()
  // Soft Web Audio preview of MIDI notes (LEDs are separate / need Arduino).
  useNotePreview(activePage === 'library')

  return (
    <div className="min-h-screen bg-[#f6f7f9] text-[#172033]">
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
      />

      <main
        className={`transition-[margin] duration-300 ${
          sidebarCollapsed ? 'lg:ml-[82px]' : 'lg:ml-[220px]'
        }`}
      >
        <Topbar activePage={activePage} />

        <div
          className={`app-workspace grid gap-5 p-4 transition-[grid-template-columns] duration-300 sm:p-6 lg:gap-0 lg:p-0 ${
            libraryCollapsed
              ? 'lg:grid-cols-[minmax(0,1fr)_76px]'
              : 'lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_360px]'
          }`}
        >
          {activePage === 'library' ? (
            <LibraryPage
              player={player}
              library={library}
              libraryCollapsed={libraryCollapsed}
              setLibraryCollapsed={setLibraryCollapsed}
            />
          ) : (
            <SettingsPage />
          )}
        </div>
      </main>
    </div>
  )
}
