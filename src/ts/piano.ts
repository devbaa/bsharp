import { CHORD_DEFINITIONS, FIRST_BLACK_INDEX } from './data';

// A decorative full piano keyboard used as an alternate answer surface. Most
// keys are inert; the chord "answer" keys are tinted with their color and are
// pressable (they reuse the flag selection logic via select_flag).
//
// Layout: OCTAVES * 7 white keys in a row with black keys overlaid. The 9
// "white" chords are assigned to white keys and the 5 "black" chords to black
// keys, so the piano mirrors the white/black chord split.

const OCTAVES = 2;
const WHITE_PER_OCTAVE = 7;
// Which white-key index (within an octave) each black key sits after: C#,D#,F#,G#,A#.
const BLACK_AFTER = [0, 1, 3, 4, 5];

function makeAnswerKey(key: HTMLElement, color: string): void {
    key.dataset.color = color;
    key.classList.add('answer-key');
    const flag = document.createElement('div');
    flag.className = 'flag ' + color;
    flag.setAttribute('onclick', 'select_flag(this)');
    flag.innerHTML =
        '<i class="answer-icon correct fa"></i><i class="answer-icon incorrect fa"></i>';
    key.appendChild(flag);
}

/** Build the piano DOM once into #piano-holder. */
export function buildPiano(): void {
    const holder = document.getElementById('piano-holder');
    if (!holder || holder.dataset.built) return;
    holder.dataset.built = '1';

    const totalWhite = OCTAVES * WHITE_PER_OCTAVE;
    const whiteKeys: HTMLElement[] = [];
    const blackKeys: HTMLElement[] = [];

    const whiteRow = document.createElement('div');
    whiteRow.className = 'piano-whites';
    for (let i = 0; i < totalWhite; i++) {
        const key = document.createElement('div');
        key.className = 'piano-key white-key';
        whiteRow.appendChild(key);
        whiteKeys.push(key);
    }

    const blackRow = document.createElement('div');
    blackRow.className = 'piano-blacks';
    for (let o = 0; o < OCTAVES; o++) {
        for (const after of BLACK_AFTER) {
            const key = document.createElement('div');
            key.className = 'piano-key black-key';
            const whiteIndex = o * WHITE_PER_OCTAVE + after;
            const unit = 100 / totalWhite;
            key.style.left = `calc(${unit * (whiteIndex + 1)}% - ${unit * 0.31}%)`;
            key.style.width = `${unit * 0.62}%`;
            blackRow.appendChild(key);
            blackKeys.push(key);
        }
    }

    holder.appendChild(whiteRow);
    holder.appendChild(blackRow);

    const whiteChords = CHORD_DEFINITIONS.slice(0, FIRST_BLACK_INDEX);
    const blackChords = CHORD_DEFINITIONS.slice(FIRST_BLACK_INDEX);
    whiteChords.forEach((chord, i) => {
        const key = whiteKeys[i];
        if (key) makeAnswerKey(key, chord.name);
    });
    blackChords.forEach((chord, i) => {
        const key = blackKeys[i];
        if (key) makeAnswerKey(key, chord.name);
    });
}

/** Mark which answer keys are active (colored + pressable) for the level. */
export function populatePiano(colors: string[]): void {
    const holder = document.getElementById('piano-holder');
    if (!holder) return;
    for (const key of holder.querySelectorAll('.answer-key') as NodeListOf<HTMLElement>) {
        key.classList.toggle('active', colors.includes(key.dataset.color!));
    }
}
