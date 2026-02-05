import { SessionStats, Tally } from './types';
import { CHORDS_TONE } from './data';
import { getCurrentTimestamp, sum } from './utils';
import {
    STATE, getCurrentProfile, getCurrentTargetNumber,
    getCurrentSessionHistory, saveState, newTally
} from './state';

export function normalizeStatsObject(stats: SessionStats): void {
    if (stats.notes === undefined) {
        stats.notes = newTally();
    }
}

export function updateStartTimeIfNeeded(): void {
    const stats = getCurrentProfile().stats;
    if (stats.identifications === 0) {
        stats.start_time = getCurrentTimestamp();
    }
}

export function updateStats(correctColor: string, chosenColor: string): void {
    const stats = getCurrentProfile().stats;
    stats.identifications++;
    if (correctColor === chosenColor) {
        stats.correct++;
    }

    if (stats.confusion_matrix[correctColor] === undefined) {
        stats.confusion_matrix[correctColor] = {};
    }

    const row = stats.confusion_matrix[correctColor];
    if (row[chosenColor] === undefined) {
        row[chosenColor] = 0;
    }
    row[chosenColor] = row[chosenColor] + 1;

    stats.updated_time = getCurrentTimestamp();
    saveState();
}

export function updateNoteStats(color: string, correctNote: string, chosenNote: string): void {
    const stats = getCurrentProfile().stats;
    if (stats.notes === undefined) {
        stats.notes = newTally();
    }

    stats.notes.identifications++;
    if (correctNote === chosenNote) {
        stats.notes.correct++;
    }

    let cm = stats.notes.confusion_matrix;
    if (cm[color] === undefined) {
        cm[color] = {};
    }

    let colorMatrix = cm[color] as unknown as Record<string, Record<string, number>>;
    if (colorMatrix[correctNote] === undefined) {
        (colorMatrix as Record<string, unknown>)[correctNote] = {};
    }

    let row = colorMatrix[correctNote];
    if (row[chosenNote] === undefined) {
        row[chosenNote] = 0;
    }
    row[chosenNote] = row[chosenNote] + 1;

    stats.updated_time = getCurrentTimestamp();
    saveState();
}

export function calculatePercentage(correct?: number, identifications?: number): number {
    if (correct === undefined && identifications === undefined) {
        const stats = getCurrentProfile().stats;
        correct = stats.correct;
        identifications = stats.identifications;
    }

    if (identifications === 0 || identifications === undefined) {
        return 75;
    }
    return 100 * (correct! / identifications);
}

export function calculateNeutralLevel(percentage: number): number {
    return Math.min(Math.max(0, Math.floor((percentage - 50) / 10)), 4);
}

export function getCatEmoji(level: number): string {
    const emojiLevels: Record<number, string> = {
        0: '\u{1F63F}',
        1: '\u{1F63E}',
        2: '\u{1F431}',
        3: '\u{1F63A}',
        4: '\u{1F638}',
        5: '\u{1F640}',
        6: '\u{1F63B}',
    };
    return emojiLevels[level];
}

const WEEK_SECONDS = 7 * 24 * 3600;

export function getCurrentCoefficients(): number[] {
    let currentTime = getCurrentTimestamp();
    const unfilteredSessionHistory = getCurrentSessionHistory();

    if (unfilteredSessionHistory.length > 1) {
        currentTime = Math.max(
            ...unfilteredSessionHistory.map(
                (x) => (x.identifications >= Math.min(getCurrentTargetNumber(), 25)) ? x.start_time : 0
            )
        );
    }

    const recentConfusionMatrices = unfilteredSessionHistory
        .filter((x) => (currentTime - x.start_time) < WEEK_SECONDS)
        .map((x) => x.confusion_matrix);

    const numChords = Object.keys(CHORDS_TONE).indexOf(STATE.current_chord) + 1;
    const matrix = mergeMatrices(recentConfusionMatrices, numChords);
    return calculateCoefficients(matrix);
}

export function mergeMatrices(
    confusionMatrices: Record<string, Record<string, number>>[],
    numChords: number
): Record<string, Record<string, number>> {
    const chords = Object.keys(CHORDS_TONE).slice(0, numChords);
    const outMatrix: Record<string, Record<string, number>> = Object.fromEntries(
        chords.map(x => [x, Object.fromEntries(chords.map(y => [y, 0]))])
    );

    for (const cm of confusionMatrices) {
        for (const ok of Object.keys(cm)) {
            for (const ik of Object.keys(cm[ok])) {
                if (outMatrix[ok] && outMatrix[ok][ik] !== undefined) {
                    outMatrix[ok][ik] = outMatrix[ok][ik] + cm[ok][ik];
                }
            }
        }
    }
    return outMatrix;
}

function normalizeArrayMasked(arr: number[], mask: boolean[]): number[] {
    const normTo = 1 - sum(arr.filter((_, i) => mask[i]));
    const normFactor = sum(arr.filter((_, i) => !mask[i])) / normTo;
    return arr.map((val, i) => mask[i] ? val : val / normFactor);
}

export function calculateCoefficients(
    matrix: Record<string, Record<string, number>>,
    wrongWeight = 5.0,
    mistakenForWeight = 1.5,
    threshold = 5
): number[] {
    const chords = Object.keys(matrix);
    const numChords = chords.length;
    const defaultValue = 1 / numChords;
    let coefficients = new Array(numChords).fill(0);
    const numChances = new Array(numChords).fill(0);
    const minValues = new Array(numChords).fill(1 / (10 + numChords));
    minValues[numChords - 1] = 1 / numChords;

    for (const [correctIndex, correctChord] of chords.entries()) {
        for (const [chosenIndex, chosenChord] of chords.entries()) {
            const value = matrix[correctChord][chosenChord];
            if (value === undefined) continue;
            if (chosenIndex !== correctIndex) {
                coefficients[correctIndex] += value * wrongWeight;
                coefficients[chosenIndex] += value * mistakenForWeight;
            } else {
                coefficients[correctIndex] += value;
            }
            numChances[correctIndex] += value;
        }
    }

    let mask = numChances.map((x: number) => x < threshold);
    coefficients = coefficients.map((value: number, i: number) => mask[i] ? defaultValue : value);

    let normalized = false;
    while (!normalized) {
        coefficients = normalizeArrayMasked(coefficients, mask);
        normalized = true;
        for (const [index, value] of coefficients.entries()) {
            const minCoefficient = minValues[index];
            if (value < minCoefficient) {
                mask[index] = true;
                coefficients[index] = minCoefficient;
                normalized = false;
                break;
            }
        }
    }

    return coefficients;
}
