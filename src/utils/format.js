export function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
}
export function midiNoteName(midi) {
    const notes = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
    const octave = Math.floor(midi / 12) - 1;
    const note = notes[midi % 12];
    return `${note}${octave}`;
}
export function tempoMarking(bpm) {
    if (bpm < 70)
        return 'Adagio';
    if (bpm < 90)
        return 'Andante';
    if (bpm < 120)
        return 'Moderato';
    return 'Allegro';
}
export function difficultyLabel(filename) {
    // Infer from filename or metadata; defaults based on BPM/complexity
    if (filename.toLowerCase().includes('beginner'))
        return 'Beginner';
    if (filename.toLowerCase().includes('advanced'))
        return 'Advanced';
    return 'Intermediate';
}
