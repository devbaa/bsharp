import '../style.css';
import Alpine from 'alpinejs';

import { loadState, getCurrentProfile, isRecent } from './state';
import {
    playAudio, selectFlag, selectFlagByIndex, nextAudio, resetStats, changeSelector,
    onTrainerOpen, playChord, getEmojiLock, stopCurrentAudio, advanceLevel,
    _CORRECT_COLOR
} from './game';
import { getUiStore } from './ui_store';
import { initOnboarding } from './onboarding';
import {
    applyColorScheme, applyAnswerSurface,
    populateProfileUiElements, updateStatsDisplay, setChordDisplayMode,
    addProfile, submitProfileChanges, deleteProfile,
    triggerEasterEgg, downloadState,
    registerGameCallbacks, onPanelOpen,
} from './ui';
import { cleanSessionHistory } from './session_cleanup';
import { PanelName } from './ui_store';

// Game/profile actions exposed on `window` for the inline onclick handlers in
// index.html, plus the test hooks read by the Playwright/jsdom suites.
declare global {
    interface Window {
        play_audio: () => void;
        select_flag: (el: HTMLElement) => void;
        next_audio: () => void;
        reset_stats: (done?: boolean) => void;
        change_selector: (to?: string) => void;
        add_profile: () => void;
        submit_profile_changes: () => void;
        delete_profile: () => void;
        trigger_easter_egg: () => void;
        download_state: () => void;
        play_chord: (color: string) => void;
        advance_level: () => void;
        __bsharp_correct_color: () => string | null;
        __bsharp_test_deterministic_color?: string | null;
    }
}

// Register callbacks to break circular dependency between ui.ts and game.ts
registerGameCallbacks(getEmojiLock, resetStats, changeSelector, onTrainerOpen);

// Reactive UI shell state (menu / panels), bound from the HTML via $store.ui.
Alpine.store('ui', {
    menuOpen: false,
    panel: '',
    levelUp: false,
    toggleMenu() {
        this.menuOpen = !this.menuOpen;
    },
    open(name: Exclude<PanelName, ''>) {
        if (this.panel === name) {
            this.panel = '';
            return;
        }
        this.panel = name;
        onPanelOpen(name);
    },
    home() {
        this.panel = '';
    },
    close() {
        this.panel = '';
    },
});

window.play_audio = playAudio;
window.select_flag = selectFlag;
window.next_audio = nextAudio;
window.reset_stats = resetStats;
window.change_selector = changeSelector;
window.add_profile = addProfile;
window.submit_profile_changes = submitProfileChanges;
window.delete_profile = deleteProfile;
window.trigger_easter_egg = triggerEasterEgg;
window.download_state = downloadState;
window.play_chord = playChord;
window.advance_level = advanceLevel;
window.__bsharp_correct_color = () => _CORRECT_COLOR;

// Stop any playing audio when the user clicks an interactive element.
document.addEventListener('click', (e) => {
    const target = e.target as Element;
    if (target.closest('#play-button, #next-chord')) return;
    if (target.closest('[onclick], button, a, select, input')) {
        stopCurrentAudio();
    }
}, true);

// Keyboard controls: 1-9/0 pick a colour, Space/P plays, Enter/->/N goes next.
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'SELECT' ||
        target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
    }

    const ui = getUiStore();

    // Escape closes whatever overlay is open.
    if (e.key === 'Escape') {
        if (ui.levelUp) ui.levelUp = false;
        else if (ui.panel) ui.close();
        else if (ui.menuOpen) ui.menuOpen = false;
        return;
    }

    // Level-up prompt shortcuts.
    if (ui.levelUp) {
        if (e.key === 'Enter' || e.key === 'y' || e.key === 'Y') {
            e.preventDefault();
            advanceLevel();
        }
        return;
    }

    // Only drive the game when no panel is open.
    if (ui.panel) return;

    if (e.key === ' ' || e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        playAudio();
    } else if (e.key === 'Enter' || e.key === 'ArrowRight' || e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        nextAudio();
    } else if (/^[0-9]$/.test(e.key)) {
        const index = e.key === '0' ? 9 : Number(e.key) - 1;
        selectFlagByIndex(index);
    }
}, false);

function init(): void {
    loadState();

    const profile = getCurrentProfile();
    const stats = profile.stats;
    if (stats !== undefined && stats.updated_time !== undefined) {
        if (!isRecent(stats.updated_time)) {
            resetStats();
        }
    }

    populateProfileUiElements();
    setChordDisplayMode(profile.chord_display_mode);
    applyColorScheme(profile.color_scheme);
    applyAnswerSurface(profile.answer_surface);
    changeSelector(profile.current_chord);
    initOnboarding();
    updateStatsDisplay();
    cleanSessionHistory();
}

Alpine.start();
init();
