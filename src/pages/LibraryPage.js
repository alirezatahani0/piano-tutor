import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import PlayerCard from '../components/PlayerCard';
import TempoCard from '../components/TempoCard';
import InfoCard from '../components/InfoCard';
import KeyboardPanel from '../components/KeyboardPanel';
import Library from '../components/Library';
export default function LibraryPage({ player, library, libraryCollapsed, setLibraryCollapsed, }) {
    // Skip through songs in filtered list
    const handleSkip = (dir) => {
        const current = library.songs.findIndex(s => s.filename === library.selectedId);
        if (current >= 0) {
            const next = library.songs[(current + dir + library.songs.length) % library.songs.length];
            if (next)
                library.setSelectedId(next.filename);
        }
    };
    return (_jsxs(_Fragment, { children: [_jsxs("section", { className: "app-content min-w-0 space-y-5 lg:p-6 xl:p-8", children: [_jsx(PlayerCard, { status: player.status, song: library.selected || null, onPlay: () => library.selected && player.play(library.selected.filename), onPause: player.pause, onSeek: player.seek, onSkip: handleSkip }), _jsx(KeyboardPanel, { status: player.status, leftColor: "#7067E8", rightColor: "#ED5B4D" }), _jsxs("div", { className: "grid gap-5 lg:grid-cols-3", children: [_jsx(TempoCard, { status: player.status, onTempoChange: player.setTempo }), _jsx(InfoCard, { status: player.status, song: library.selected || null })] })] }), _jsx(Library, { songs: library.songs, selectedId: library.selectedId, onSelect: library.setSelectedId, search: library.search, onSearchChange: library.setSearch, difficulty: library.difficulty, onDifficultyChange: library.setDifficulty, collapsed: libraryCollapsed, onToggleCollapsed: () => setLibraryCollapsed(!libraryCollapsed) })] }));
}
