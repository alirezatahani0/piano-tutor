import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import Icon from './Icon';
import { formatTime } from '../utils/format';
export default function InfoCard({ status, song }) {
    if (!status || !song)
        return null;
    return (_jsxs("div", { className: "rounded-[20px] border border-[#e5e7ec] bg-white p-5 shadow-[0_8px_28px_rgba(23,32,51,0.03)] sm:p-6 lg:col-span-2 lg:col-start-2 lg:row-start-1", children: [_jsxs("div", { className: "flex items-center gap-2.5", children: [_jsx("span", { className: "text-[#7c84a0]", children: _jsx(Icon, { name: "info", size: 19 }) }), _jsx("h2", { className: "font-bold", children: "Song information" })] }), _jsx("dl", { className: "mt-5 grid grid-cols-2 gap-x-5 gap-y-5", children: [
                    ['Key', song.key || '—'],
                    ['Original tempo', `${status.bpm} BPM`],
                    ['Duration', formatTime(status.duration || 0)],
                    ['Difficulty', song.metadata?.difficulty || 'Intermediate'],
                    ['Time signature', status.time_signature || '4/4'],
                    ['Hand position', 'Dynamic'],
                ].map(([label, value]) => (_jsxs("div", { children: [_jsx("dt", { className: "text-[10px] font-bold uppercase tracking-[0.06em] text-[#9aa0ac]", children: label }), _jsx("dd", { className: "mt-1.5 text-xs font-semibold text-[#394155]", children: value })] }, label))) })] }));
}
