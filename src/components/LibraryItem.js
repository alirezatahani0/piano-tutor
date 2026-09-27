import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import Icon from './Icon';
import Cover from './Cover';
export default function LibraryItem({ song, selected, onSelect }) {
    return (_jsxs("button", { onClick: onSelect, className: `group flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left transition ${selected ? 'bg-[#f5f4ff]' : 'hover:bg-[#f8f9fa]'}`, children: [_jsx(Cover, { accent: song.metadata?.accent || '#d9d6ea', mark: song.metadata?.mark || '#5d518c' }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("p", { className: "truncate text-[13px] font-semibold text-[#283044]", children: song.title || song.filename }), _jsx("p", { className: "mt-1 truncate text-[11px] text-[#9298a5]", children: song.artist || '—' }), _jsxs("p", { className: "mt-1.5 text-[9px] font-semibold uppercase tracking-wide text-[#9ba1ad]", children: [song.metadata?.difficulty || 'Intermediate', " \u00B7 ", song.bpm || '—', " BPM"] })] }), _jsx("span", { className: `transition ${selected ? 'text-[#6458e8]' : 'text-[#b1b6c0] group-hover:translate-x-0.5'}`, children: _jsx(Icon, { name: "chevron", size: 18 }) })] }));
}
