import { getSessionHistory, getCurrentProfile } from './state';

let _isFirstIdentification = false;

function checkIsFirstSession(): boolean {
    const history = getSessionHistory();
    const profileHistory = history[String(getCurrentProfile().id)];
    if (!profileHistory) return true;
    for (const sessions of Object.values(profileHistory)) {
        for (const session of sessions) {
            if (session.identifications > 0) return false;
        }
    }
    return true;
}

const STEP_CONFIG: Record<string, { text: string; arrow: boolean }> = {
    play: { text: 'Click the play button to hear the sound', arrow: true },
    guess: { text: 'Guess the color', arrow: false },
    success: { text: 'Great job! Click the arrow to continue', arrow: false },
    retry: { text: 'Click the arrow to try again', arrow: false },
};

function showOverlay(step: string): void {
    const overlay = document.getElementById('onboarding-overlay');
    if (!overlay) return;
    const config = STEP_CONFIG[step];
    if (!config) return;

    overlay.dataset.step = step;
    overlay.innerHTML = '';

    if (config.arrow) {
        const arrow = document.createElement('div');
        arrow.className = 'onboarding-arrow';
        arrow.textContent = '\u2191';
        overlay.appendChild(arrow);
    }

    const text = document.createElement('span');
    text.className = 'onboarding-text';
    text.textContent = config.text;
    overlay.appendChild(text);

    overlay.classList.add('visible');
}

function hideOverlay(): void {
    const overlay = document.getElementById('onboarding-overlay');
    if (!overlay) return;
    overlay.classList.remove('visible');
}

export function initOnboarding(): void {
    _isFirstIdentification = checkIsFirstSession();
    showOverlay('play');
}

export function resetOnboarding(): void {
    _isFirstIdentification = checkIsFirstSession();
}

export function showPlayOverlay(): void {
    showOverlay('play');
}

export function onPlay(): void {
    hideOverlay();
}

export function onAudioEnded(): void {
    if (_isFirstIdentification) {
        showOverlay('guess');
    }
}

export function onFlagSelected(isCorrect: boolean): void {
    hideOverlay();
    if (_isFirstIdentification) {
        showOverlay(isCorrect ? 'success' : 'retry');
        _isFirstIdentification = false;
    }
}

export function onNext(): void {
    hideOverlay();
}
