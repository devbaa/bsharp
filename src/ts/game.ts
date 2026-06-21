import { CHORDS_TONE, FIRST_BLACK_INDEX } from './data';
import { randomElem } from './utils';
import {
    STATE, getCurrentProfile, getCurrentTargetNumber,
    getCurrentSessionHistory, saveState, saveSessionHistory,
    newStats, isRecent
} from './state';
import { getCurrentCoefficients, updateStartTimeIfNeeded, updateStats } from './stats';
import { getAudioFiles, audioFileElem, playChordFiles, preloadAudio } from './audio';
import { populateFlags, updateStatsDisplay, resetCatEmoji, setCatEmoji } from './ui';
import { dismissOnboardingStep, showOnboardingGuessPrompt, showOnboardingGoNextPrompt, showOnboardingPlayPrompt } from './onboarding';
import { getUiStore } from './ui_store';

let _COLORS: string[] | null = null;
let _CHORDS_ON = false;
export let _CORRECT_COLOR: string | null = null;
let _SELECTED_ELEM: HTMLElement | null = null;
let _CORRECT_ELEM: HTMLElement | null = null;
let _CURRENT_AUDIO: [HTMLAudioElement, number] | null = null;
let _AUDIO_PLAYED = false;
let _EMOJI_LOCK = false;
let _CURRENT_COEFFICIENTS: number[] | null = null;
let _TRAINER_PRELOADED = false;
let _PERSIST_REACTION_FACE_ENABLED = false;
export function getTestDeterministicColor(): string | null {
    return window.__bsharp_test_deterministic_color ?? null;
}

export function getSelectedColors(): string[] {
    const chordIdx = Object.keys(CHORDS_TONE).findIndex(x => x === STATE.current_chord);
    if (_COLORS === null) {
        _COLORS = Object.keys(CHORDS_TONE).slice(0, chordIdx + 1);
    }
    return _COLORS;
}

export function isBlackLevel(level?: number): boolean {
    if (level === undefined) {
        level = getSelectedColors().length;
    }
    return level > FIRST_BLACK_INDEX;
}

export function chordsOn(): boolean {
    return _CHORDS_ON;
}

function setPlayedAfter(delay: number): void {
    setTimeout(() => { _AUDIO_PLAYED = true; }, delay);
}

function onAudioEnded(): void {
    _AUDIO_PLAYED = true;
    showOnboardingGuessPrompt();
}

export function stopCurrentAudio(): void {
    if (_CURRENT_AUDIO) {
        const [chord] = _CURRENT_AUDIO;
        chord.pause();
        chord.currentTime = 0;
    }
}


function _getWeights(): number[] | undefined {
    if (getCurrentProfile().chord_selection_mode !== 'adaptive') {
        return undefined;
    }
    if (_CURRENT_COEFFICIENTS !== null) {
        return _CURRENT_COEFFICIENTS;
    }
    _CURRENT_COEFFICIENTS = getCurrentCoefficients();
    return _CURRENT_COEFFICIENTS;
}

export function selectNewColor(): void {
    const weights = _getWeights();
    _CORRECT_COLOR = getTestDeterministicColor() ?? randomElem(getSelectedColors(), weights);
    if (_SELECTED_ELEM !== null) {
        _SELECTED_ELEM.classList.remove('flag-correct');
        _SELECTED_ELEM.classList.remove('flag-incorrect');
        _SELECTED_ELEM = null;
    }
    if (_CORRECT_ELEM !== null) {
        _CORRECT_ELEM.classList.remove('flag-correct');
        _CORRECT_ELEM.classList.remove('flag-incorrect');
        _CORRECT_ELEM = null;
    }
}

export function populateAudio(): void {
    selectNewColor();
    stopCurrentAudio();

    const audioFiles = getAudioFiles();
    const files = audioFiles.get(_CORRECT_COLOR!);
    if (files) {
        const newAudioFile = randomElem(files);
        const afElem = audioFileElem(newAudioFile, onAudioEnded);
        _CURRENT_AUDIO = [afElem, afElem.duration];
    }

    const playButton = document.getElementById('play-button');
    if (playButton) playButton.classList.remove('deactivated');
    _AUDIO_PLAYED = false;
}

export function playAudio(): void {
    const playButton = document.getElementById('play-button');
    if (playButton && playButton.classList.contains('deactivated')) return;
    if (!_CURRENT_AUDIO) return;

    dismissOnboardingStep('play');
    const [chord, duration] = _CURRENT_AUDIO;
    stopCurrentAudio();
    const safeDuration = isNaN(duration) ? 0.8 : duration;
    setPlayedAfter(safeDuration * 0.8);
    chord.play();
}

export function selectFlag(elem: HTMLElement): void {
    if (_SELECTED_ELEM !== null) return;
    if (!_AUDIO_PLAYED) return;

    const chosenColor = elem.parentElement!.dataset.color!;
    const flagHolder = document.getElementById('flag-holder')!;

    _EMOJI_LOCK = true;
    updateStartTimeIfNeeded();
    updateStats(_CORRECT_COLOR!, chosenColor);
    updateStatsDisplay();

    const isCorrect = chosenColor === _CORRECT_COLOR;
    if (isCorrect) {
        elem.classList.add('flag-correct');
        setCatEmoji(6);
    } else {
        elem.classList.add('flag-incorrect');
        _CORRECT_ELEM = flagHolder.querySelector(`div[data-color="${_CORRECT_COLOR}"]>div.flag`)!;
        if (_CORRECT_ELEM) _CORRECT_ELEM.classList.add('flag-correct');
        setCatEmoji(5);
    }
    _SELECTED_ELEM = elem;
    showOnboardingGoNextPrompt(isCorrect);

    if (getCurrentProfile().persist_reaction_face &&
        getCurrentProfile().stats.identifications < getCurrentTargetNumber()) {
        _PERSIST_REACTION_FACE_ENABLED = true;
    } else {
        setTimeout(() => {
            _EMOJI_LOCK = false;
            resetCatEmoji();
        }, 1500);
    }

    if (_CHORDS_ON && getCurrentProfile().reveal_chord_mode === 'after_guess') {
        document.getElementById('flag-holder')!.classList.add('chord-notes');
    }

    // Single note trainer disabled for now
    const nextButton = document.getElementById('next-chord');
    if (nextButton) nextButton.classList.remove('deactivated');

    maybePromptLevelUp();
}

/** Select the Nth currently-visible flag (used by number-key shortcuts). */
export function selectFlagByIndex(index: number): void {
    const holder = document.getElementById('flag-holder');
    if (!holder) return;
    const wrapper = holder.querySelectorAll('.flag-wrapper.visible')[index];
    if (!wrapper) return;
    const flag = wrapper.querySelector('.flag');
    if (flag instanceof HTMLElement) selectFlag(flag);
}

let _LEVEL_UP_PROMPTED = false;

/** Offer the next level once a session is completed with full accuracy. */
function maybePromptLevelUp(): void {
    if (_LEVEL_UP_PROMPTED) return;
    const stats = getCurrentProfile().stats;
    if (stats.identifications < getCurrentTargetNumber()) return;
    if (stats.correct !== stats.identifications) return;

    const chords = Object.keys(CHORDS_TONE);
    const idx = chords.indexOf(STATE.current_chord);
    if (idx < 0 || idx >= chords.length - 1) return;

    _LEVEL_UP_PROMPTED = true;
    getUiStore().levelUp = true;
}

/** Advance to the next chord level (invoked from the level-up prompt). */
export function advanceLevel(): void {
    getUiStore().levelUp = false;
    const chords = Object.keys(CHORDS_TONE);
    const next = chords[chords.indexOf(STATE.current_chord) + 1];
    if (next) changeSelector(next);
}

export function nextAudio(): void {
    const nextButton = document.getElementById('next-chord');
    if (!nextButton || nextButton.classList.contains('deactivated')) return;

    dismissOnboardingStep('goNext');

    if (_CHORDS_ON && getCurrentProfile().reveal_chord_mode === 'after_guess') {
        document.getElementById('flag-holder')!.classList.remove('chord-notes');
    }

    populateAudio();
    playAudio();
    nextButton.classList.add('deactivated');
}

export function resetStats(done = true): void {
    getCurrentProfile().stats.done = done;
    if (!done || getCurrentProfile().stats.identifications > 0) {
        saveSessionHistory();
    }
    if (_PERSIST_REACTION_FACE_ENABLED && done) {
        resetCatEmoji();
        _PERSIST_REACTION_FACE_ENABLED = false;
        _EMOJI_LOCK = false;
    }
    getCurrentProfile().stats = newStats();
    _CURRENT_COEFFICIENTS = null;
    _LEVEL_UP_PROMPTED = false;
    saveState();
    updateStatsDisplay();
    populateAudio();
    showOnboardingPlayPrompt();
}

function retrieveSavedStats(): void {
    const currentHistory = getCurrentSessionHistory();
    if (currentHistory !== undefined && currentHistory.length > 0) {
        const lastSession = currentHistory[currentHistory.length - 1]!;
        if (!lastSession.done) {
            getCurrentProfile().stats = currentHistory.pop()!;
            if (!isRecent(lastSession.updated_time)) {
                resetStats(true);
            }
        }
    }
    updateStatsDisplay();
}

export function changeSelector(to?: string): void {
    const chordSelector = document.getElementById('chord-selector') as HTMLSelectElement;

    if (to !== undefined) {
        chordSelector.value = to;
    }

    const currentProfile = getCurrentProfile();
    if (STATE.current_chord !== chordSelector.value) {
        resetStats(false);
        STATE.current_chord = chordSelector.value;
        currentProfile.current_chord = chordSelector.value;
        currentProfile.stats.current_chord = currentProfile.current_chord;
        retrieveSavedStats();
    }

    _COLORS = null;
    _CHORDS_ON = (currentProfile.show_chord_mode === 'always'
        || (isBlackLevel() && currentProfile.show_chord_mode === 'black_only'));

    populateFlags(getSelectedColors, chordsOn);
    populateAudio();
    showOnboardingPlayPrompt();
    saveState();

    for (const color of getSelectedColors()) {
        preloadAudio(color, onAudioEnded);
    }
}

export function onTrainerOpen(): void {
    if (!_TRAINER_PRELOADED) {
        for (const color of Object.keys(CHORDS_TONE)) {
            preloadAudio(color, onAudioEnded);
        }
        _TRAINER_PRELOADED = true;
    }
}

export function playChord(color: string): void {
    playChordFiles(color, onAudioEnded);
}

export function getEmojiLock(): boolean {
    return _EMOJI_LOCK;
}
