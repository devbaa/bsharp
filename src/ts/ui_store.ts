import Alpine from 'alpinejs';

// Reactive UI shell state, driven by Alpine. The HTML binds to `$store.ui`
// for menu / panel / active-tab visibility; imperative game and profile code
// reaches the same state through getUiStore().
export type PanelName = '' | 'info' | 'trainer' | 'stats' | 'profile';

export interface UiStore {
    menuOpen: boolean;
    panel: PanelName;
    levelUp: boolean;
    toggleMenu(): void;
    open(name: Exclude<PanelName, ''>): void;
    home(): void;
    close(): void;
}

// Register the store's shape with Alpine's type system (declaration merging on
// the built-in `Stores` interface). This makes `Alpine.store('ui', ...)`
// type-checked on registration and `Alpine.store('ui')` return `UiStore` with
// no cast, and types `$store.ui` in Alpine contexts.
declare module 'alpinejs' {
    interface Stores {
        ui: UiStore;
    }
}

export function getUiStore(): UiStore {
    return Alpine.store('ui');
}
