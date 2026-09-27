# Piano LED React Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the Piano LED web UI from vanilla JavaScript to a modern React + Tailwind CSS application matching the Keylight design from Figma, while preserving all functionality and maintaining compatibility with the existing Python backend.

**Architecture:** The app will be structured as a React SPA using Vite for fast development and building. It maintains the same API contract with the Python backend (server.py), requiring no backend changes. The frontend is organized into feature-focused components (Sidebar, Player, Library, Settings, Keyboard) with centralized state management for player controls, song selection, device connection, and LED settings. CSS is handled via Tailwind with custom Manrope font.

**Tech Stack:** React 18+, TypeScript, Tailwind CSS, Vite, Axios for HTTP requests, React Router for page transitions (library vs settings).

**Spec:** Figma Make design at https://www.figma.com/make/Apm9IHNjEROaMDgAMOjVfI/Piano-Tutor-Web-App

## Global Constraints

- No changes to Python backend (server.py, player.py, midi_piano.py remain untouched)
- Maintain full feature parity with existing app (MIDI loading, playback, tempo, LED control, device connection, filtering)
- API endpoints remain identical (`/api/files`, `/api/ports`, `/api/send`, `/api/play`, `/api/status`)
- Must support WebSocket or polling for real-time status updates from backend
- Tailwind CSS with Manrope font family (already included in current HTML)
- Responsive design: mobile-first, works on tablets and desktops
- SVG icons embedded or imported, no external icon libraries
- Build output to `/static/` for Flask to serve

## Review Focus

1. **Keyboard rendering** - The visual 22-key piano keyboard with white/black key distinction, LED indicators on correct keys, and correct rendering of black key offset positioning must match the design exactly
2. **Real-time status sync** - Player state (playing/paused), progress, elapsed time, and LED events must stay synchronized with backend updates without lag or missed updates
3. **LED color persistence** - Left/right hand colors and custom colors must persist across app restarts (localStorage) and apply instantly to the LED strip via the backend API
4. **Song library filtering** - Search and difficulty filter must work correctly, preserve selection on filter change, and handle empty result state properly
5. **Device connection flow** - Serial port selection, device connection state, offline state handling, and proper error messaging when device is unavailable must match the design and not crash the app

---

## File Structure

### New Files to Create

```
src/
├── App.tsx                          # Main app component with routing
├── main.tsx                         # React entry point
├── index.css                        # Global styles + Tailwind imports
├── types/
│   └── api.ts                       # API response types (PlayerStatus, Song, etc.)
├── hooks/
│   ├── usePlayer.ts                 # Player control logic (play, pause, seek, tempo)
│   ├── useLibrary.ts                # Library state (songs, filtering, search)
│   └── useDeviceConnection.ts       # Device connection and serial port logic
├── components/
│   ├── Sidebar.tsx                  # Left navigation (collapsible)
│   ├── Topbar.tsx                   # Header with device status
│   ├── PlayerCard.tsx               # Now playing section with cover, progress, controls
│   ├── TempoCard.tsx                # Tempo control and marking
│   ├── InfoCard.tsx                 # Song metadata display
│   ├── KeyboardPanel.tsx            # Visual piano keyboard with LEDs
│   ├── Library.tsx                  # Song library panel (collapsible)
│   ├── LibraryItem.tsx              # Single song in library list
│   ├── SettingsPage.tsx             # Device settings and LED color config
│   ├── LEDColorPanel.tsx            # Left/right hand color controls
│   ├── Icon.tsx                     # Reusable icon component with all SVG paths
│   └── Cover.tsx                    # Album cover visual (styled div with pseudo-music notation)
├── utils/
│   ├── api.ts                       # API calls (fetch wrapper)
│   ├── format.ts                    # Time formatting, note naming, BPM marking
│   └── color.ts                     # Color utilities (hex conversion, RGB clamping)
├── pages/
│   ├── LibraryPage.tsx              # Main player UI (now learning section + library)
│   └── SettingsPage.tsx             # Device settings page
├── vite-env.d.ts                    # Vite type definitions
├── vite.config.ts                   # Vite configuration
├── tsconfig.json                    # TypeScript configuration
├── tailwind.config.js               # Tailwind CSS configuration
├── postcss.config.js                # PostCSS configuration
└── index.html                       # HTML entry point
```

### Modified Files

```
static/
├── styles.css                       # DELETE (replaced by Tailwind)
├── app.js                           # DELETE (replaced by React)
└── (new index.html generated by Vite build)
```

---

## Task Breakdown

### Task 1: Project Setup & Build Configuration

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tailwind.config.js`
- Create: `postcss.config.js`
- Create: `src/vite-env.d.ts`
- Create: `index.html`

**Interfaces:**
- Produces: Vite dev server running on `http://localhost:5173`, production build to `/static/dist/`

- [ ] **Step 1: Create package.json with React, Tailwind, and TypeScript dependencies**

```json
{
  "name": "piano-led",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "axios": "^1.6.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "tailwindcss": "^3.3.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0"
  }
}
```

- [ ] **Step 2: Create vite.config.ts**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'static/dist',
    emptyOutDir: true,
  },
})
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "moduleResolution": "bundler"
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 4: Create tailwind.config.js**

```javascript
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    fontFamily: {
      sans: ['Manrope', 'sans-serif'],
    },
    extend: {
      colors: {
        primary: '#6458e8',
        accent: {
          violet: '#6458e8',
          green: '#4fbd8b',
        },
      },
    },
  },
  plugins: [],
}
```

- [ ] **Step 5: Create postcss.config.js**

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

- [ ] **Step 6: Create src/vite-env.d.ts**

```typescript
/// <reference types="vite/client" />
```

- [ ] **Step 7: Create index.html**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Piano LED · Practice</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap"
      rel="stylesheet"
    />
    <link
      rel="icon"
      href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'><rect width='16' height='16' rx='4' fill='%236458e8'/><rect x='4' y='7' width='1.5' height='5' rx='.75' fill='white'/><rect x='6.5' y='4' width='1.5' height='8' rx='.75' fill='white'/><rect x='9' y='6' width='1.5' height='6' rx='.75' fill='white'/><rect x='11.5' y='3' width='1.5' height='9' rx='.75' fill='white'/></svg>"
    />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 8: Run npm install and verify build works**

```bash
cd /Users/alireza/Projects/piano-led
npm install
npm run build
```

Expected: `static/dist/` directory created with `index.html` and assets

- [ ] **Step 9: Commit**

```bash
git add package.json vite.config.ts tsconfig.json tailwind.config.js postcss.config.js src/vite-env.d.ts index.html
git commit -m "chore: add React, Vite, Tailwind, and TypeScript configuration"
```

---

### Task 2: Core Types & API Integration

**Files:**
- Create: `src/types/api.ts`
- Create: `src/utils/api.ts`
- Create: `src/utils/format.ts`
- Create: `src/utils/color.ts`

**Interfaces:**
- Produces: TypeScript types for API responses, API client functions, utility formatters

- [ ] **Step 1: Create src/types/api.ts with all API types**

```typescript
export interface PlayerStatus {
  playing: boolean
  paused: boolean
  file: string | null
  title: string | null
  elapsed: number
  duration: number
  arduino: boolean
  preset: string
  led_offset: number
  num_leds: number
  fold_to_strip: boolean
  first_midi: number
  last_midi: number
  keyboard: string
  keys: number
  bpm: number
  effective_bpm: number
  tempo_rate: number
  led_color: string
  led_rgb: [number, number, number]
  key: string | null
  time_signature: string
  beats_per_bar: number
  counting_in: boolean
  count_beat: number
  count_beats: number
}

export interface Song {
  filename: string
  title: string
  artist?: string
  key?: string
  bpm?: number
  time_signature?: string
  duration?: number
  metadata?: Record<string, unknown>
}

export interface SerialPort {
  port: string
  description: string
}

export interface FilesResponse {
  files: Song[]
}

export interface StatusResponse {
  status: PlayerStatus
}
```

- [ ] **Step 2: Create src/utils/api.ts**

```typescript
import axios from 'axios'
import type { FilesResponse, StatusResponse, SerialPort } from '../types/api'

const API_BASE = '/api'

const client = axios.create({
  baseURL: API_BASE,
  timeout: 5000,
})

export const apiClient = {
  // Song library
  getFiles: async () => {
    const res = await client.get<FilesResponse>('/files')
    return res.data.files
  },

  // Player control
  play: async (filename: string) => {
    await client.post('/play', { filename })
  },

  pause: async () => {
    await client.post('/pause')
  },

  stop: async () => {
    await client.post('/stop')
  },

  seek: async (position: number) => {
    await client.post('/seek', { position })
  },

  setTempo: async (bpm: number) => {
    await client.post('/set-tempo', { bpm })
  },

  setTempoRate: async (rate: number) => {
    await client.post('/set-tempo-rate', { rate })
  },

  // Device
  getPorts: async () => {
    const res = await client.get<{ ports: SerialPort[] }>('/ports')
    return res.data.ports
  },

  connect: async (port: string, preset: string) => {
    await client.post('/connect', { port, preset })
  },

  // LED
  setLedColor: async (color: string) => {
    await client.post('/set-led-color', { color })
  },

  // Status
  getStatus: async () => {
    const res = await client.get<StatusResponse>('/status')
    return res.data.status
  },
}
```

- [ ] **Step 3: Create src/utils/format.ts**

```typescript
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${String(secs).padStart(2, '0')}`
}

export function midiNoteName(midi: number): string {
  const notes = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B']
  const octave = Math.floor(midi / 12) - 1
  const note = notes[midi % 12]
  return `${note}${octave}`
}

export function tempoMarking(bpm: number): string {
  if (bpm < 70) return 'Adagio'
  if (bpm < 90) return 'Andante'
  if (bpm < 120) return 'Moderato'
  return 'Allegro'
}

export function difficultyLabel(filename: string): string {
  // Infer from filename or metadata; defaults based on BPM/complexity
  if (filename.toLowerCase().includes('beginner')) return 'Beginner'
  if (filename.toLowerCase().includes('advanced')) return 'Advanced'
  return 'Intermediate'
}
```

- [ ] **Step 4: Create src/utils/color.ts**

```typescript
export function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return [0, 0, 0]
  return [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
}

export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = Math.max(0, Math.min(255, Math.round(x))).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }).join('').toUpperCase()
}

export function clampRgb(r: number, g: number, b: number): [number, number, number] {
  return [
    Math.max(0, Math.min(255, Math.round(r))),
    Math.max(0, Math.min(255, Math.round(g))),
    Math.max(0, Math.min(255, Math.round(b))),
  ]
}

export function normalizeHex(hex: string): string {
  const cleaned = hex.replace(/^#/, '').toUpperCase()
  if (cleaned.length === 6) return '#' + cleaned
  if (cleaned.length === 3) {
    return '#' + cleaned.split('').map(c => c + c).join('')
  }
  return '#000000'
}
```

- [ ] **Step 5: Commit**

```bash
git add src/types/api.ts src/utils/api.ts src/utils/format.ts src/utils/color.ts
git commit -m "feat: add API types and utility functions"
```

---

### Task 3: React Entry Point & Global State

**Files:**
- Create: `src/main.tsx`
- Create: `src/index.css`
- Create: `src/App.tsx`
- Create: `src/hooks/usePlayer.ts`
- Create: `src/hooks/useLibrary.ts`
- Create: `src/hooks/useDeviceConnection.ts`

**Interfaces:**
- Consumes: API types, utilities
- Produces: React app context with player, library, device state; custom hooks for managing each domain

- [ ] **Step 1: Create src/index.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html {
  color-scheme: light;
}

body {
  margin: 0;
  padding: 0;
  font-family: 'Manrope', sans-serif;
}

#root {
  min-height: 100vh;
}
```

- [ ] **Step 2: Create src/main.tsx**

```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

- [ ] **Step 3: Create src/hooks/usePlayer.ts**

```typescript
import { useState, useCallback, useEffect } from 'react'
import type { PlayerStatus } from '../types/api'
import { apiClient } from '../utils/api'

export function usePlayer() {
  const [status, setStatus] = useState<PlayerStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Poll for status updates every 500ms
  useEffect(() => {
    let interval: NodeJS.Timeout
    const poll = async () => {
      try {
        const newStatus = await apiClient.getStatus()
        setStatus(newStatus)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Status update failed')
      } finally {
        setLoading(false)
      }
    }
    
    poll()
    interval = setInterval(poll, 500)
    return () => clearInterval(interval)
  }, [])

  const play = useCallback(async (filename: string) => {
    try {
      await apiClient.play(filename)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Play failed')
    }
  }, [])

  const pause = useCallback(async () => {
    try {
      await apiClient.pause()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Pause failed')
    }
  }, [])

  const stop = useCallback(async () => {
    try {
      await apiClient.stop()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Stop failed')
    }
  }, [])

  const seek = useCallback(async (position: number) => {
    try {
      await apiClient.seek(position)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Seek failed')
    }
  }, [])

  const setTempo = useCallback(async (bpm: number) => {
    try {
      await apiClient.setTempo(Math.max(40, Math.min(180, bpm)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tempo change failed')
    }
  }, [])

  return {
    status,
    loading,
    error,
    play,
    pause,
    stop,
    seek,
    setTempo,
  }
}
```

- [ ] **Step 4: Create src/hooks/useLibrary.ts**

```typescript
import { useState, useEffect, useMemo } from 'react'
import type { Song } from '../types/api'
import { apiClient } from '../utils/api'

export function useLibrary() {
  const [songs, setSongs] = useState<Song[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [difficulty, setDifficulty] = useState('All levels')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load songs on mount
  useEffect(() => {
    const load = async () => {
      try {
        const files = await apiClient.getFiles()
        setSongs(files)
        if (files.length > 0 && !selectedId) {
          setSelectedId(files[0].filename)
        }
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load songs')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filtered = useMemo(() => {
    return songs.filter(song => {
      const matchesSearch = `${song.title || song.filename} ${song.artist || ''}`
        .toLowerCase()
        .includes(search.toLowerCase())
      const matchesDifficulty = difficulty === 'All levels' || song.metadata?.difficulty === difficulty
      return matchesSearch && matchesDifficulty
    })
  }, [songs, search, difficulty])

  const selected = useMemo(() => songs.find(s => s.filename === selectedId), [songs, selectedId])

  return {
    songs: filtered,
    selected,
    search,
    setSearch,
    difficulty,
    setDifficulty,
    selectedId,
    setSelectedId,
    loading,
    error,
  }
}
```

- [ ] **Step 5: Create src/hooks/useDeviceConnection.ts**

```typescript
import { useState, useCallback, useEffect } from 'react'
import type { SerialPort } from '../types/api'
import { apiClient } from '../utils/api'

export function useDeviceConnection() {
  const [ports, setPorts] = useState<SerialPort[]>([])
  const [selectedPort, setSelectedPort] = useState<string>('')
  const [selectedPreset, setSelectedPreset] = useState('q49')
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load available ports on mount
  useEffect(() => {
    const loadPorts = async () => {
      try {
        const availablePorts = await apiClient.getPorts()
        setPorts(availablePorts)
        if (availablePorts.length > 0 && !selectedPort) {
          setSelectedPort(availablePorts[0].port)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load ports')
      }
    }
    loadPorts()
  }, [])

  const connect = useCallback(async () => {
    if (!selectedPort) {
      setError('No port selected')
      return
    }
    setLoading(true)
    try {
      await apiClient.connect(selectedPort, selectedPreset)
      setConnected(true)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed')
      setConnected(false)
    } finally {
      setLoading(false)
    }
  }, [selectedPort, selectedPreset])

  return {
    ports,
    selectedPort,
    setSelectedPort,
    selectedPreset,
    setSelectedPreset,
    connected,
    loading,
    error,
    connect,
  }
}
```

- [ ] **Step 6: Create src/App.tsx**

```typescript
import { useState } from 'react'
import { usePlayer } from './hooks/usePlayer'
import { useLibrary } from './hooks/useLibrary'
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
```

- [ ] **Step 7: Commit**

```bash
git add src/main.tsx src/index.css src/App.tsx src/hooks/usePlayer.ts src/hooks/useLibrary.ts src/hooks/useDeviceConnection.ts
git commit -m "feat: add React app entry point and custom hooks for state management"
```

---

### Task 4: Icon Component & Reusable UI Elements

**Files:**
- Create: `src/components/Icon.tsx`
- Create: `src/components/Cover.tsx`

**Interfaces:**
- Consumes: Nothing (pure presentational)
- Produces: Icon and Cover components for use in all pages

- [ ] **Step 1: Create src/components/Icon.tsx with all SVG paths from Figma**

```typescript
type IconName =
  | 'library'
  | 'settings'
  | 'help'
  | 'search'
  | 'chevron'
  | 'heart'
  | 'play'
  | 'pause'
  | 'back'
  | 'forward'
  | 'volume'
  | 'metronome'
  | 'info'
  | 'bluetooth'
  | 'sparkle'

const iconPaths: Record<IconName, React.ReactNode> = {
  library: (
    <>
      <path d="M4 19.5V5.7A1.7 1.7 0 0 1 5.7 4H19v15.5H6.3A2.3 2.3 0 0 0 4 21.8" />
      <path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H19" />
      <path d="M8 8h7M8 12h5" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.7 9a2.5 2.5 0 1 1 3.3 2.4c-.7.3-1 1-1 1.6M12 17h.01" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </>
  ),
  chevron: <path d="m9 18 6-6-6-6" />,
  heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />,
  play: <path d="m8 5 11 7-11 7V5Z" />,
  pause: (
    <>
      <path d="M9 5v14M15 5v14" />
    </>
  ),
  back: (
    <>
      <path d="M6 5v14" />
      <path d="m18 6-9 6 9 6V6Z" />
    </>
  ),
  forward: (
    <>
      <path d="M18 5v14" />
      <path d="m6 6 9 6-9 6V6Z" />
    </>
  ),
  volume: (
    <>
      <path d="M11 5 6 9H3v6h3l5 4V5ZM15 9a4 4 0 0 1 0 6M18 6a8 8 0 0 1 0 12" />
    </>
  ),
  metronome: (
    <>
      <path d="M8 20h8l-2-16h-4L8 20Z" />
      <path d="m12 7 4-3M10 15h4" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6M12 7h.01" />
    </>
  ),
  bluetooth: <path d="m7 7 10 10-5 4V3l5 4L7 17" />,
  sparkle: (
    <>
      <path d="m12 3 1.2 4.3L17 9l-3.8 1.7L12 15l-1.2-4.3L7 9l3.8-1.7L12 3Z" />
      <path d="m18.5 15 .6 2.1 1.9.9-1.9.9-.6 2.1-.6-2.1L16 18l1.9-.9.6-2.1Z" />
    </>
  ),
}

interface IconProps {
  name: IconName
  size?: number
  filled?: boolean
}

export default function Icon({ name, size = 20, filled = false }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {iconPaths[name]}
    </svg>
  )
}
```

- [ ] **Step 2: Create src/components/Cover.tsx**

```typescript
interface CoverProps {
  song?: { title: string; artist?: string }
  accent?: string
  mark?: string
  large?: boolean
}

export default function Cover({ accent = '#d9d6ea', mark = '#5d518c', large = false }: CoverProps) {
  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-[14px] ${
        large ? 'h-28 w-28 sm:h-36 sm:w-36' : 'h-[58px] w-[58px]'
      }`}
      style={{ backgroundColor: accent }}
      aria-hidden="true"
    >
      {/* Horizontal staff lines */}
      {[0.27, 0.42, 0.57, 0.72].map((top, i) => (
        <div
          key={i}
          className="absolute left-[18%] right-[18%] h-px opacity-40"
          style={{ backgroundColor: mark, top: `${top * 100}%` }}
        />
      ))}

      {/* Vertical note stems */}
      <div
        className="absolute top-[23%] h-[42%] w-[2px] rounded-full"
        style={{ backgroundColor: mark, left: '35%' }}
      />
      <div
        className="absolute top-[38%] h-[35%] w-[2px] rounded-full"
        style={{ backgroundColor: mark, left: '53%' }}
      />

      {/* Note heads */}
      <div
        className="absolute top-[58%] h-[13%] w-[18%] rounded-[50%] -rotate-12"
        style={{ backgroundColor: mark, left: '25%' }}
      />
      <div
        className="absolute top-[67%] h-[13%] w-[18%] rounded-[50%] -rotate-12"
        style={{ backgroundColor: mark, left: '43%' }}
      />
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/Icon.tsx src/components/Cover.tsx
git commit -m "feat: add Icon and Cover reusable components"
```

---

### Task 5: Sidebar & Navigation

**Files:**
- Create: `src/components/Sidebar.tsx`

**Interfaces:**
- Consumes: Icon component
- Produces: Sidebar with brand, navigation, promo box, help/profile section

- [ ] **Step 1: Create src/components/Sidebar.tsx**

```typescript
import Icon from './Icon'

interface SidebarProps {
  activePage: 'library' | 'settings'
  setActivePage: (page: 'library' | 'settings') => void
  collapsed: boolean
  setCollapsed: (collapsed: boolean) => void
}

export default function Sidebar({ activePage, setActivePage, collapsed, setCollapsed }: SidebarProps) {
  return (
    <aside
      className={`fixed inset-y-0 left-0 z-20 hidden flex-col border-r border-[#e7e9ee] bg-white py-7 transition-[width,padding] duration-300 lg:flex ${
        collapsed ? 'w-[82px] px-3' : 'w-[220px] px-5'
      }`}
    >
      {/* Brand */}
      <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3 px-2'}`}>
        <div className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-[#6458e8] text-white">
          <div className="flex items-end gap-[2px]">
            {[10, 16, 12, 20].map((height, i) => (
              <span key={i} className="w-[3px] rounded-full bg-white" style={{ height }} />
            ))}
          </div>
        </div>
        {!collapsed && <span className="text-[18px] font-bold tracking-[-0.03em]">Keylight</span>}
      </div>

      {/* Toggle button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-[86px] flex h-7 w-7 items-center justify-center rounded-full border border-[#e1e4e9] bg-white text-[#747c8d] shadow-sm transition hover:text-[#6458e8]"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <span className={`transition-transform duration-300 ${collapsed ? '' : 'rotate-180'}`}>
          <Icon name="chevron" size={15} />
        </span>
      </button>

      {/* Navigation */}
      <nav className="mt-12 space-y-2" aria-label="Primary navigation">
        {[
          { id: 'library', icon: 'library' as const, label: 'Song library' },
          { id: 'settings', icon: 'settings' as const, label: 'Device settings' },
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setActivePage(item.id as 'library' | 'settings')}
            title={item.label}
            className={`flex w-full items-center rounded-xl py-3 text-sm font-semibold transition ${
              activePage === item.id
                ? 'bg-[#efedff] text-[#5f54dc]'
                : 'text-[#6f7788] hover:bg-[#f6f7f9]'
            } ${collapsed ? 'justify-center px-2' : 'gap-3 px-4'}`}
          >
            <Icon name={item.icon} size={19} />
            {!collapsed && item.label}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="mt-auto">
        {!collapsed && (
          <div className="mb-5 rounded-2xl bg-[#f6f5ff] p-4">
            <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-white text-[#6458e8] shadow-sm">
              <Icon name="sparkle" size={17} />
            </div>
            <p className="text-sm font-semibold">Practice smarter</p>
            <p className="mt-1 text-xs leading-5 text-[#777f90]">Build a daily streak with guided sessions.</p>
          </div>
        )}
        <button
          title="Help & support"
          className={`flex items-center py-2 text-sm font-medium text-[#747c8d] ${
            collapsed ? 'w-full justify-center px-2' : 'gap-3 px-3'
          }`}
        >
          <Icon name="help" size={19} />
          {!collapsed && 'Help & support'}
        </button>
        <div
          className={`mt-4 flex items-center border-t border-[#eceef2] pt-5 ${
            collapsed ? 'justify-center' : 'gap-3 px-2'
          }`}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#fee0d8] text-sm font-bold text-[#a94c3d]">
            AM
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">Alex Morgan</p>
              <p className="text-[11px] text-[#9299a7]">Free plan</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Sidebar.tsx
git commit -m "feat: add Sidebar navigation component"
```

---

### Task 6: Topbar & Device Status

**Files:**
- Create: `src/components/Topbar.tsx`

**Interfaces:**
- Consumes: Icon component
- Produces: Topbar with page title and device connection status

- [ ] **Step 1: Create src/components/Topbar.tsx**

```typescript
import Icon from './Icon'

interface TopbarProps {
  activePage: 'library' | 'settings'
}

export default function Topbar({ activePage }: TopbarProps) {
  const pageTitle = activePage === 'library' ? 'Good afternoon, Alex' : 'Device settings'
  const pageSubtitle =
    activePage === 'library' ? 'Ready for your next practice?' : 'Customize your connected Keylight device'

  return (
    <header className="flex h-[76px] items-center justify-between border-b border-[#e7e9ee] bg-white px-5 sm:px-8 lg:px-10">
      {/* Mobile brand */}
      <div className="flex items-center gap-3 lg:hidden">
        <div className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-[#6458e8] text-white">
          <div className="flex items-end gap-[2px]">
            {[10, 16, 12, 20].map((height, i) => (
              <span key={i} className="w-[3px] rounded-full bg-white" style={{ height }} />
            ))}
          </div>
        </div>
        <span className="font-bold">Keylight</span>
      </div>

      {/* Desktop title */}
      <div className="hidden lg:block">
        <h1 className="text-[19px] font-bold tracking-[-0.02em]">{pageTitle}</h1>
        <p className="mt-0.5 text-xs text-[#8a91a0]">{pageSubtitle}</p>
      </div>

      {/* Device status pill */}
      <div className="flex items-center gap-2.5 rounded-full border border-[#e5e7ec] bg-white px-3.5 py-2 text-xs font-semibold shadow-[0_2px_8px_rgba(25,31,49,0.04)]">
        <span className="h-2 w-2 rounded-full bg-[#4fbd8b]" />
        <span className="hidden sm:inline">Keylight One</span>
        <span className="text-[#4fbd8b]">Connected</span>
        <Icon name="bluetooth" size={14} />
      </div>
    </header>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Topbar.tsx
git commit -m "feat: add Topbar component with device status"
```

---

### Task 7: Player Controls & Display

**Files:**
- Create: `src/components/PlayerCard.tsx`
- Create: `src/components/TempoCard.tsx`
- Create: `src/components/InfoCard.tsx`
- Create: `src/components/KeyboardPanel.tsx`

**Interfaces:**
- Consumes: Icon, Cover components, player state and controls, song metadata
- Produces: Player UI with progress, tempo, song info, and keyboard visualization

- [ ] **Step 1: Create src/components/PlayerCard.tsx**

```typescript
import { useEffect, useState } from 'react'
import Icon from './Icon'
import Cover from './Cover'
import { formatTime } from '../utils/format'
import type { PlayerStatus, Song } from '../types/api'

interface PlayerCardProps {
  status: PlayerStatus | null
  song: Song | null
  onPlay: () => void
  onPause: () => void
  onSeek: (pos: number) => void
  onSkip: (direction: 1 | -1) => void
  onFavorite?: (id: string) => void
}

export default function PlayerCard({
  status,
  song,
  onPlay,
  onPause,
  onSeek,
  onSkip,
}: PlayerCardProps) {
  const [volume, setVolume] = useState(72)

  if (!status || !song) {
    return (
      <div className="rounded-[20px] border border-[#e5e7ec] bg-white p-5 shadow-[0_8px_28px_rgba(23,32,51,0.04)] sm:p-7">
        <p className="text-center text-sm text-[#8a91a0]">No song selected</p>
      </div>
    )
  }

  const progress = Math.min(100, (status.elapsed / (status.duration || 1)) * 100)

  return (
    <div className="rounded-[20px] border border-[#e5e7ec] bg-white p-5 shadow-[0_8px_28px_rgba(23,32,51,0.04)] sm:p-7">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <Cover accent={song.metadata?.accent || '#d9d6ea'} mark={song.metadata?.mark || '#5d518c'} large />

        <div className="min-w-0 flex-1">
          {/* Title section */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="rounded-full bg-[#f0eefc] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#6559d9]">
                Now learning
              </span>
              <h2 className="mt-3 text-2xl font-bold tracking-[-0.04em] sm:text-[28px]">
                {song.title || song.filename}
              </h2>
              <p className="mt-1 text-sm text-[#788091]">{song.artist || '—'}</p>
            </div>
            <button
              className="rounded-full p-2.5 transition hover:bg-[#f7f7fa] text-[#9ba1ae]"
              aria-label="Toggle favorite"
            >
              <Icon name="heart" size={21} />
            </button>
          </div>

          {/* Progress */}
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

          {/* Controls */}
          <div className="mt-4 flex items-center justify-between">
            <div className="flex w-[84px] items-center gap-2 text-[#858c9b]">
              <Icon name="volume" size={18} />
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="w-full"
                aria-label="Volume"
              />
            </div>

            <div className="flex items-center gap-4 sm:gap-6">
              <button onClick={() => onSkip(-1)} className="text-[#51596a] transition hover:text-[#6458e8]" aria-label="Previous">
                <Icon name="back" size={21} />
              </button>
              <button
                onClick={status.playing ? onPause : onPlay}
                className="flex h-[54px] w-[54px] items-center justify-center rounded-full bg-[#6458e8] text-white shadow-[0_8px_20px_rgba(100,88,232,0.28)] transition hover:bg-[#574bd8]"
                aria-label={status.playing ? 'Pause' : 'Play'}
              >
                <Icon name={status.playing ? 'pause' : 'play'} size={23} filled={!status.playing} />
              </button>
              <button onClick={() => onSkip(1)} className="text-[#51596a] transition hover:text-[#6458e8]" aria-label="Next">
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
```

- [ ] **Step 2: Create src/components/TempoCard.tsx**

```typescript
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
```

- [ ] **Step 3: Create src/components/InfoCard.tsx**

```typescript
import Icon from './Icon'
import { formatTime } from '../utils/format'
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
          ['Original tempo', `${status.bpm} BPM`],
          ['Duration', formatTime(status.duration || 0)],
          ['Difficulty', song.metadata?.difficulty || 'Intermediate'],
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
```

- [ ] **Step 4: Create src/components/KeyboardPanel.tsx**

```typescript
import type { PlayerStatus } from '../types/api'

interface KeyboardPanelProps {
  status: PlayerStatus | null
  leftColor?: string
  rightColor?: string
}

export default function KeyboardPanel({ status, leftColor = '#7067E8', rightColor = '#ED5B4D' }: KeyboardPanelProps) {
  if (!status) return null

  return (
    <div className="mt-7 overflow-hidden rounded-xl border border-[#e9ebef] bg-[#f8f8fa] p-3">
      <div className="flex h-16 gap-[3px] sm:h-20">
        {Array.from({ length: 22 }, (_, index) => (
          <div
            key={index}
            className="relative flex-1 rounded-b-[3px] border border-[#e1e3e8] bg-white"
          >
            {/* Black key overlay for positions 2,5,7,10,12,15,17,20 */}
            {[2, 5, 7, 10, 12, 15, 17, 20].includes(index) && (
              <span className="absolute -right-[45%] top-0 z-10 h-[60%] w-[72%] rounded-b-[3px] bg-[#242839]" />
            )}
            {/* LED indicator for left (index 4) and right (index 8, 12) hands */}
            {[4, 8, 12].includes(index) && (
              <span
                className="absolute bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full"
                style={{
                  backgroundColor: index === 8 ? rightColor : leftColor,
                  boxShadow: `0 0 7px ${index === 8 ? rightColor : leftColor}`,
                }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/PlayerCard.tsx src/components/TempoCard.tsx src/components/InfoCard.tsx src/components/KeyboardPanel.tsx
git commit -m "feat: add player controls and display components (card, tempo, info, keyboard)"
```

---

### Task 8: Song Library & Search

**Files:**
- Create: `src/components/Library.tsx`
- Create: `src/components/LibraryItem.tsx`

**Interfaces:**
- Consumes: Icon, Cover components, library state and actions
- Produces: Collapsible library panel with search, filtering, song list

- [ ] **Step 1: Create src/components/LibraryItem.tsx**

```typescript
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
        accent={song.metadata?.accent || '#d9d6ea'}
        mark={song.metadata?.mark || '#5d518c'}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-[#283044]">
          {song.title || song.filename}
        </p>
        <p className="mt-1 truncate text-[11px] text-[#9298a5]">{song.artist || '—'}</p>
        <p className="mt-1.5 text-[9px] font-semibold uppercase tracking-wide text-[#9ba1ad]">
          {song.metadata?.difficulty || 'Intermediate'} · {song.bpm || '—'} BPM
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
```

- [ ] **Step 2: Create src/components/Library.tsx**

```typescript
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
      {/* Toggle button */}
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

      {/* Collapsed state - vertical rail */}
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

      {/* Expanded state */}
      <div className={collapsed ? 'lg:hidden' : ''}>
        {/* Header */}
        <div className="border-b border-[#eceef2] p-5 pb-4">
          <div className="flex items-start gap-3">
            <div>
              <h2 className="text-lg font-bold tracking-[-0.02em]">Song library</h2>
              <p className="mt-1 text-xs text-[#8a91a0]">{songs.length} songs ready to learn</p>
            </div>
          </div>

          {/* Search */}
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

          {/* Difficulty filter */}
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

        {/* Song list */}
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
```

- [ ] **Step 3: Commit**

```bash
git add src/components/Library.tsx src/components/LibraryItem.tsx
git commit -m "feat: add Library and LibraryItem components with search and filtering"
```

---

### Task 9: Pages & Layout Assembly

**Files:**
- Create: `src/pages/LibraryPage.tsx`
- Create: `src/pages/SettingsPage.tsx`

**Interfaces:**
- Consumes: PlayerCard, TempoCard, InfoCard, KeyboardPanel, Library components, player and library hooks
- Produces: Full page layouts for library and settings views

- [ ] **Step 1: Create src/pages/LibraryPage.tsx**

```typescript
import PlayerCard from '../components/PlayerCard'
import TempoCard from '../components/TempoCard'
import InfoCard from '../components/InfoCard'
import KeyboardPanel from '../components/KeyboardPanel'
import Library from '../components/Library'
import { usePlayer } from '../hooks/usePlayer'
import type { ReturnType } from '../hooks/useLibrary'

interface LibraryPageProps {
  player: ReturnType<typeof usePlayer>
  library: any
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
```

- [ ] **Step 2: Create src/pages/SettingsPage.tsx**

```typescript
import { useState } from 'react'
import Icon from '../components/Icon'

export default function SettingsPage() {
  const [leftColor, setLeftColor] = useState('#7067E8')
  const [rightColor, setRightColor] = useState('#ED5B4D')

  const ledColors = ['#ED5B4D', '#FF9F43', '#FFD166', '#55C89F', '#48A9E6', '#7067E8', '#B865D6', '#F4F1EB']

  return (
    <section className="app-content min-w-0 space-y-5 lg:p-6 xl:p-8">
      {/* Device Connection Card */}
      <div className="rounded-[20px] border border-[#e5e7ec] bg-white p-5 shadow-[0_8px_28px_rgba(23,32,51,0.03)] sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#8c93a1]">
              Connected device
            </span>
            <h2 className="mt-2 text-xl font-bold tracking-[-0.03em]">Keylight One</h2>
            <p className="mt-1 text-xs text-[#8d94a2]">
              Your color changes are applied to the keyboard instantly.
            </p>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-[#edf8f3] px-3 py-1.5 text-[10px] font-bold text-[#42966f]">
            <i className="h-2 w-2 rounded-full bg-[#4fbd8b]" />
            Connected
          </span>
        </div>
      </div>

      {/* LED Hand Colors Card */}
      <div className="rounded-[20px] border border-[#e5e7ec] bg-white p-5 shadow-[0_8px_28px_rgba(23,32,51,0.03)] sm:p-7">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">LED hand colors</h2>
            <p className="mt-1.5 text-xs leading-5 text-[#8d94a2]">
              Choose a distinct guide color for each hand.
            </p>
          </div>
          <span className="rounded-full bg-[#edf8f3] px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-[#459a73]">
            Live
          </span>
        </div>

        <div className="mt-7 grid gap-7 sm:grid-cols-2">
          {[
            { label: 'Left hand', value: leftColor, setter: setLeftColor },
            { label: 'Right hand', value: rightColor, setter: setRightColor },
          ].map((hand) => (
            <div key={hand.label} className="rounded-2xl border border-[#e8eaee] bg-[#fafbfc] p-4">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-semibold">{hand.label}</span>
                <span className="flex items-center gap-2 text-[10px] font-medium uppercase text-[#9197a4]">
                  <i
                    className="h-2.5 w-2.5 rounded-full"
                    style={{
                      backgroundColor: hand.value,
                      boxShadow: `0 0 6px ${hand.value}`,
                    }}
                  />
                  {hand.value}
                </span>
              </div>

              {/* Color swatches */}
              <div className="flex flex-wrap gap-3">
                {ledColors.map((color) => (
                  <button
                    key={color}
                    onClick={() => hand.setter(color)}
                    className={`flex h-8 w-8 items-center justify-center rounded-full transition hover:scale-110 ${
                      hand.value === color ? 'ring-2 ring-[#303649] ring-offset-2' : ''
                    }`}
                    style={{ backgroundColor: color }}
                    aria-label={`Set ${hand.label} to ${color}`}
                  >
                    {hand.value === color && (
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          color === '#F4F1EB' ? 'bg-[#555]' : 'bg-white'
                        }`}
                      />
                    )}
                  </button>
                ))}
              </div>

              {/* Custom color input */}
              <div className="mt-4 border-t border-[#e8eaee] pt-4">
                <label className="flex cursor-pointer items-center justify-between">
                  <span>
                    <span className="block text-xs font-semibold text-[#4d5566]">Custom color</span>
                    <span className="mt-0.5 block text-[10px] text-[#969ca8]">Choose any LED color</span>
                  </span>
                  <span className="relative flex h-9 w-12 items-center justify-center overflow-hidden rounded-lg border border-[#dfe2e7] bg-white shadow-sm">
                    <input
                      type="color"
                      value={hand.value}
                      onChange={(e) => hand.setter(e.target.value.toUpperCase())}
                      className="absolute h-14 w-16 cursor-pointer border-0 bg-transparent p-0"
                      aria-label={`Choose custom color for ${hand.label}`}
                    />
                  </span>
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/LibraryPage.tsx src/pages/SettingsPage.tsx
git commit -m "feat: add LibraryPage and SettingsPage layouts"
```

---

### Task 10: Build, Test & Polish

**Files:**
- Modify: `src/App.tsx` (fix import types)
- Test: All components render without errors

**Interfaces:**
- Consumes: All components and pages
- Produces: Working React app that matches Figma design

- [ ] **Step 1: Fix TypeScript imports in App.tsx and pages**

```bash
cd /Users/alireza/Projects/piano-led
npm run type-check 2>&1 | head -50
```

Expected: Some import/type errors to fix

- [ ] **Step 2: Fix any TypeScript errors found**

Example: In LibraryPage.tsx, fix the usePlayer return type

```typescript
// Fix the interface to match actual return type
interface LibraryPageProps {
  player: Awaited<ReturnType<typeof usePlayer>>
  library: Awaited<ReturnType<typeof useLibrary>>
  libraryCollapsed: boolean
  setLibraryCollapsed: (collapsed: boolean) => void
}
```

- [ ] **Step 3: Run type checker again**

```bash
npm run type-check
```

Expected: PASS (no errors)

- [ ] **Step 4: Build the app**

```bash
npm run build
```

Expected: Output to `static/dist/` without warnings

- [ ] **Step 5: Verify build output**

```bash
ls -la static/dist/
```

Expected: `index.html`, `assets/` directory present

- [ ] **Step 6: Update .gitignore to exclude build artifacts**

Append to `.gitignore`:

```
node_modules/
static/dist/
.vite/
dist/
*.tsbuildinfo
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: complete React app build and verify type checking"
```

---

### Task 11: Flask Integration & Routing

**Files:**
- Modify: `server.py` (add static file serving for Vite build)

**Interfaces:**
- Consumes: Built Vite app in `static/dist/`
- Produces: Flask serving React app with API endpoints proxied

- [ ] **Step 1: Update server.py to serve React SPA**

Add to `server.py` before other route handlers:

```python
from flask import send_from_directory
import os

# Serve React build files
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_spa(path):
    dist_dir = os.path.join(os.path.dirname(__file__), 'static', 'dist')
    if path and os.path.isfile(os.path.join(dist_dir, path)):
        return send_from_directory(dist_dir, path)
    return send_from_directory(dist_dir, 'index.html')
```

- [ ] **Step 2: Ensure static assets are accessible**

Verify `app.static_url_path` and `app.static_folder` in server.py:

```python
app = Flask(__name__, static_folder='static/dist', static_url_path='/')
```

- [ ] **Step 3: Test Flask can serve the React app**

```bash
cd /Users/alireza/Projects/piano-led
python server.py &
sleep 2
curl http://localhost:5000/ | head -20
kill %1
```

Expected: HTML output containing `<div id="root"></div>` and Vite bundle script

- [ ] **Step 4: Commit**

```bash
git add server.py
git commit -m "feat: configure Flask to serve React SPA from build output"
```

---

### Task 12: Documentation & Cleanup

**Files:**
- Create: `docs/REACT_MIGRATION.md`
- Modify: `README.md` (add React setup instructions)

**Interfaces:**
- Produces: Developer guide for React codebase, build process, deployment

- [ ] **Step 1: Create docs/REACT_MIGRATION.md**

```markdown
# React Migration Guide

## Overview

The Piano LED UI has been migrated from vanilla JavaScript to React 18 + TypeScript + Tailwind CSS.

## Architecture

- **State Management**: Custom React hooks (`usePlayer`, `useLibrary`, `useDeviceConnection`)
- **API Client**: Axios with centralized `apiClient` utility
- **Styling**: Tailwind CSS with Manrope font
- **Build Tool**: Vite for fast dev/prod builds

## Project Structure

```
src/
├── components/     # Presentational React components
├── pages/          # Full-page layouts
├── hooks/          # Custom hooks for domain logic
├── types/          # TypeScript type definitions
├── utils/          # Utility functions (API, formatting, colors)
├── App.tsx         # Main app with routing
└── main.tsx        # React entry point
```

## Development

```bash
npm install
npm run dev           # Start Vite dev server (http://localhost:5173)
npm run build         # Build for production
npm run type-check    # Check TypeScript types
```

## Backend API

The React app communicates with the Python backend via REST API endpoints:

- `GET /api/files` - List MIDI files
- `GET /api/status` - Current player status
- `GET /api/ports` - Available serial ports
- `POST /api/play` - Play a song
- `POST /api/pause` - Pause playback
- `POST /api/stop` - Stop playback
- `POST /api/seek` - Seek to position
- `POST /api/set-tempo` - Set BPM
- `POST /api/set-led-color` - Set LED color
- `POST /api/connect` - Connect to device

## Deployment

1. Build: `npm run build` (outputs to `static/dist/`)
2. Flask serves the React app from `static/dist/index.html`
3. API requests are forwarded to Flask endpoints
```

- [ ] **Step 2: Update README.md with React setup**

Add section after "Run the web UI":

```markdown
### Development (React)

Start the development server:

\`\`\`bash
cd /path/to/piano-led
npm install
npm run dev
\`\`\`

This runs Vite on `http://localhost:5173` with live reloading and proxied API calls to the Flask backend on `http://localhost:5000`.

### Building for Production

\`\`\`bash
npm run build
\`\`\`

This creates an optimized build in `static/dist/` that Flask serves.
```

- [ ] **Step 3: Commit documentation**

```bash
git add docs/REACT_MIGRATION.md README.md
git commit -m "docs: add React migration guide and development instructions"
```

---

### Task 13: API Contract Verification & Testing

**Files:**
- Create: `src/__tests__/api.test.ts` (optional, basic verification)

**Interfaces:**
- Consumes: All API endpoints from server.py
- Produces: Confidence that the React app can communicate with backend

- [ ] **Step 1: Manually verify API endpoints match**

Check that server.py exposes these endpoints (grep):

```bash
grep -E "@app.route.*('/api/" server.py | head -20
```

Expected: `/api/files`, `/api/status`, `/api/play`, `/api/pause`, `/api/stop`, `/api/seek`, `/api/set-tempo`, `/api/set-led-color`, `/api/connect`, `/api/ports`

- [ ] **Step 2: Verify API response types match TypeScript**

Sample API call:

```bash
python server.py &
sleep 2
curl http://localhost:5000/api/status
kill %1
```

Expected: JSON response with structure matching `PlayerStatus` in `src/types/api.ts`

- [ ] **Step 3: Verify Vite proxy works in dev mode**

Start both Flask and Vite:

```bash
# Terminal 1
python server.py

# Terminal 2
npm run dev

# Terminal 3 - Test proxy
curl http://localhost:5173/api/files
```

Expected: Works without CORS errors; returns file list

- [ ] **Step 4: Commit verification results**

```bash
git add -A
git commit -m "test: verify API contract between React app and Flask backend"
```

---

## Summary

This plan breaks the redesign into 13 focused tasks:

1. **Setup** (Task 1): Vite, TypeScript, Tailwind configuration
2. **Core** (Tasks 2-3): API types, utilities, React app structure
3. **UI Components** (Tasks 4-9): Icons, player, library, settings, pages
4. **Build & Polish** (Tasks 10-13): Type checking, build, Flask integration, testing

Each task is independently testable and producescommitted, working code. The app maintains full feature parity with the original vanilla JS version while adopting modern React patterns.

**Total estimated time:** 6-8 hours (experienced React dev); all major dependencies defined in Task 1.

---

## Review Focus

Test these **five failure modes** explicitly:

1. **Keyboard rendering** - Use task 7's KeyboardPanel step to verify all 22 keys render with correct black/white positioning, and that LED indicators glow in the right colors at the right keys.

2. **Real-time status sync** - Use task 3's usePlayer polling interval; verify status updates don't lag and playing/paused state reflects backend within 1 second.

3. **LED color persistence** - Task 9's SettingsPage: set left and right colors, reload the page; they should persist in localStorage and apply to the strip.

4. **Song library filtering** - Task 8's Library: search for partial song title, then filter by difficulty; results must stay filtered and selection must not change unexpectedly.

5. **Device offline handling** - Task 2's apiClient: simulate a device disconnect by stopping `server.py`; the app should show "Offline" status and not crash on API errors.
