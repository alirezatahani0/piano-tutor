import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { usePlayer } from './hooks/usePlayer';
import { useLibrary } from './hooks/useLibrary';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import LibraryPage from './pages/LibraryPage';
import SettingsPage from './pages/SettingsPage';
export default function App() {
    const [activePage, setActivePage] = useState('library');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
    const [libraryCollapsed, setLibraryCollapsed] = useState(true);
    const player = usePlayer();
    const library = useLibrary();
    return (_jsxs("div", { className: "min-h-screen bg-[#f6f7f9] text-[#172033]", children: [_jsx(Sidebar, { activePage: activePage, setActivePage: setActivePage, collapsed: sidebarCollapsed, setCollapsed: setSidebarCollapsed }), _jsxs("main", { className: `transition-[margin] duration-300 ${sidebarCollapsed ? 'lg:ml-[82px]' : 'lg:ml-[220px]'}`, children: [_jsx(Topbar, { activePage: activePage }), _jsx("div", { className: `app-workspace grid gap-5 p-4 transition-[grid-template-columns] duration-300 sm:p-6 lg:gap-0 lg:p-0 ${libraryCollapsed
                            ? 'lg:grid-cols-[minmax(0,1fr)_76px]'
                            : 'lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_360px]'}`, children: activePage === 'library' ? (_jsx(LibraryPage, { player: player, library: library, libraryCollapsed: libraryCollapsed, setLibraryCollapsed: setLibraryCollapsed })) : (_jsx(SettingsPage, {})) })] })] }));
}
