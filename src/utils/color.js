export function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result)
        return [0, 0, 0];
    return [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)];
}
export function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => {
        const hex = Math.max(0, Math.min(255, Math.round(x))).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }).join('').toUpperCase();
}
export function clampRgb(r, g, b) {
    return [
        Math.max(0, Math.min(255, Math.round(r))),
        Math.max(0, Math.min(255, Math.round(g))),
        Math.max(0, Math.min(255, Math.round(b))),
    ];
}
export function normalizeHex(hex) {
    const cleaned = hex.replace(/^#/, '').toUpperCase();
    if (cleaned.length === 6)
        return '#' + cleaned;
    if (cleaned.length === 3) {
        return '#' + cleaned.split('').map(c => c + c).join('');
    }
    return '#000000';
}
