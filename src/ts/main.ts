import { loadState, getCurrentProfile, isRecent, STATE } from './state';
import {
    playAudio, selectFlag, nextAudio, resetStats, changeSelector,
    toggleTrainerVisibility, playChord, getEmojiLock
} from './game';
import {
    toggleExpansionBar, toggleInfoboxVisibility, toggleStatsHistoryVisibility,
    toggleProfileVisibility, toggleProfileSettingsVisibility, toggleThemeMode,
    populateProfileUiElements, populateProfilePulldown, populateInfoboxTriggers,
    setupInfoboxDismissal, updateStatsDisplay, setChordDisplayMode,
    openProfileAdder, closeProfileAdder, addProfile, submitProfileChanges,
    deleteProfile, enableDownload, triggerEasterEgg, downloadState,
    setCurrentProfile, resetCatEmoji, registerGameCallbacks,
} from './ui';
import { cleanSessionHistory } from './session_cleanup';

// Register callbacks to break circular dependency between ui.ts and game.ts
registerGameCallbacks(getEmojiLock, resetStats, changeSelector);

// Expose functions to window for onclick attributes
const w = window as unknown as Record<string, unknown>;
w.play_audio = playAudio;
w.select_flag = selectFlag;
w.next_audio = nextAudio;
w.reset_stats = resetStats;
w.change_selector = changeSelector;
w.toggle_expansion_bar = toggleExpansionBar;
w.toggle_trainer_visibility = toggleTrainerVisibility;
w.toggle_infobox_visibility = toggleInfoboxVisibility;
w.toggle_stats_history_visibility = toggleStatsHistoryVisibility;
w.toggle_profile_visibility = toggleProfileVisibility;
w.toggle_profile_settings_visibility = toggleProfileSettingsVisibility;
w.toggle_theme_mode = toggleThemeMode;
w.open_profile_adder = openProfileAdder;
w.close_profile_adder = closeProfileAdder;
w.add_profile = addProfile;
w.submit_profile_changes = submitProfileChanges;
w.delete_profile = deleteProfile;
w.enable_download = enableDownload;
w.trigger_easter_egg = triggerEasterEgg;
w.download_state = downloadState;
w.play_chord = playChord;

document.addEventListener('DOMContentLoaded', function () {
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
    changeSelector(profile.current_chord);
    populateInfoboxTriggers();
    populateProfilePulldown();
    updateStatsDisplay();
    cleanSessionHistory();
    setupInfoboxDismissal();
});
