# React Migration Guide

## Overview

The Piano LED UI has been migrated from vanilla JavaScript to a modern React 18 + TypeScript + Tailwind CSS application, matching the Keylight design from Figma.

## Architecture

### State Management
- **Custom React Hooks** (`usePlayer`, `useLibrary`, `useDeviceConnection`) manage domain-specific state
- **No external state library** needed for this app's complexity
- Hooks handle API communication, status polling, and user actions

### API Client
- Centralized `apiClient` utility using Axios
- Maintains compatibility with existing Python backend API
- No backend code changes required

### Styling
- **Tailwind CSS** for utility-first styling
- **Manrope font** family (hosted via Google Fonts)
- Responsive design: mobile-first, tablet, and desktop support

### Build Tool
- **Vite** for fast development and production builds
- Output: `static/dist/` (served by FastAPI)
- Zero-configuration for React + TypeScript

## Project Structure

```
src/
├── components/          # Presentational React components
│   ├── Sidebar.tsx      # Navigation sidebar (collapsible)
│   ├── Topbar.tsx       # Header with device status
│   ├── PlayerCard.tsx   # Now playing UI
│   ├── TempoCard.tsx    # Tempo control
│   ├── InfoCard.tsx     # Song metadata
│   ├── KeyboardPanel.tsx # 22-key piano keyboard visualization
│   ├── Library.tsx      # Song library panel
│   ├── LibraryItem.tsx  # Single song list item
│   ├── Icon.tsx         # Reusable SVG icon component
│   └── Cover.tsx        # Album cover visual
├── pages/               # Full-page layouts
│   ├── LibraryPage.tsx  # Main player UI
│   └── SettingsPage.tsx # Device settings & LED color control
├── hooks/               # Custom React hooks
│   ├── usePlayer.ts     # Player control logic
│   ├── useLibrary.ts    # Song library & filtering
│   └── useDeviceConnection.ts # Device connection
├── types/               # TypeScript type definitions
│   └── api.ts           # API response types
├── utils/               # Utility functions
│   ├── api.ts           # API client (Axios)
│   ├── format.ts        # Time, BPM marking, note naming
│   └── color.ts         # Hex/RGB conversion, clamping
├── App.tsx              # Main app with routing & layout
├── main.tsx             # React entry point
└── index.css            # Global styles + Tailwind
```

## Development

### Setup
```bash
cd /path/to/piano-led
npm install
```

### Development Server
```bash
npm run dev
```

Runs Vite on `http://localhost:5173` with:
- Live reloading
- Proxied API calls to Flask backend on `http://localhost:5000`

### Type Checking
```bash
npm run type-check
```

Runs TypeScript compiler without emitting files. Fix errors before building.

### Production Build
```bash
npm run build
```

Creates optimized build in `static/dist/`:
- Minified JavaScript
- Tree-shaken CSS
- Hashed assets for cache-busting

## Backend API Contract

The React app communicates with the Python backend via REST API. All endpoints remain unchanged:

- `GET /api/files` — List MIDI files with metadata
- `GET /api/status` — Current player status
- `GET /api/ports` — Available serial ports
- `POST /api/play` — Start playing a song (payload: `{filename: string}`)
- `POST /api/pause` — Pause playback
- `POST /api/stop` — Stop playback
- `POST /api/seek` — Seek to position (payload: `{position: number}`)
- `POST /api/set-tempo` — Set BPM (payload: `{bpm: number}`)
- `POST /api/set-led-color` — Set LED color (payload: `{color: string}`)
- `POST /api/connect` — Connect to device (payload: `{port: string, preset: string}`)
- `GET /` — Serves React SPA (index.html)
- `/{path}` — Catch-all for client-side routing

## Deployment

### Local Development
1. Start Python backend: `python server.py`
2. Start Vite dev server: `npm run dev`
3. Open `http://localhost:5173`

### Production
1. Build React app: `npm run build`
2. Start Python backend: `python server.py` (or use production ASGI server like Gunicorn)
3. Open `http://localhost:8000`
4. FastAPI automatically serves the React build from `static/dist/`

## Features Maintained

✅ Song library with search and filtering  
✅ MIDI file upload  
✅ Playback control (play, pause, stop, seek)  
✅ Tempo adjustment (±1 BPM with bounds)  
✅ Progress bar with time display  
✅ Device connection & serial port selection  
✅ LED color control (presets and custom)  
✅ Song metadata display  
✅ Visual 22-key piano keyboard  
✅ Real-time status updates via polling

## Design System

Colors follow the Keylight Figma design:
- **Primary**: `#6458e8` (Violet)
- **Success**: `#4fbd8b` (Green)
- **Accent variants**: Warm, cool, and neutral palettes per song

All colors are defined in `tailwind.config.js` and can be customized.

## Performance Notes

- Status updates poll every 500ms (configurable in `usePlayer.ts`)
- Library is fully client-side filtered (no backend pagination)
- Build size: ~220KB gzipped (React + all components)
- Supports offline-first development with API proxy

## Troubleshooting

### Type errors during `npm run type-check`
- Ensure `jsx: "react-jsx"` is in `tsconfig.json`
- Check all imports use correct paths (relative or absolute)

### Build fails
- Clear `node_modules/` and `.vite/`: `rm -rf node_modules .vite`
- Reinstall: `npm install`
- Rebuild: `npm run build`

### API not working in dev
- Ensure Flask backend is running on `http://localhost:5000`
- Check Vite config has proxy: `/api` → `http://localhost:5000`
- Browser DevTools → Network tab to inspect API calls

### App not loading in production
- Verify `npm run build` completed successfully
- Check `static/dist/index.html` exists
- Ensure Python server can read `static/dist/` directory
- Inspect browser console for JavaScript errors

## Future Improvements

- Add WebSocket support for real-time status (currently polling)
- Persist user preferences (favorites, layout, LED colors) to localStorage
- Add keyboard shortcuts for common actions
- Support for multiple keyboard presets
- Dark mode toggle
- Gesture support for mobile devices
