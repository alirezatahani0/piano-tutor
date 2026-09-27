import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export default function KeyboardPanel({ status, leftColor = '#7067E8', rightColor = '#ED5B4D' }) {
    if (!status)
        return null;
    return (_jsx("div", { className: "mt-7 overflow-hidden rounded-xl border border-[#e9ebef] bg-[#f8f8fa] p-3", children: _jsx("div", { className: "flex h-16 gap-[3px] sm:h-20", children: Array.from({ length: 22 }, (_, index) => (_jsxs("div", { className: "relative flex-1 rounded-b-[3px] border border-[#e1e3e8] bg-white", children: [[2, 5, 7, 10, 12, 15, 17, 20].includes(index) && (_jsx("span", { className: "absolute -right-[45%] top-0 z-10 h-[60%] w-[72%] rounded-b-[3px] bg-[#242839]" })), [4, 8, 12].includes(index) && (_jsx("span", { className: "absolute bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full", style: {
                            backgroundColor: index === 8 ? rightColor : leftColor,
                            boxShadow: `0 0 7px ${index === 8 ? rightColor : leftColor}`,
                        } }))] }, index))) }) }));
}
