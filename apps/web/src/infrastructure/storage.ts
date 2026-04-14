/**
 * CITURBAREA — Infrastructure — Storage
 *
 * Doctrine: storage-first. All persistence must go through this adapter.
 * This allows later migration to SQLite/Tauri or encrypted storage.
 */

export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const browserStorage: StorageAdapter = {
  getItem: (k) => window.localStorage.getItem(k),
  setItem: (k, v) => window.localStorage.setItem(k, v),
  removeItem: (k) => window.localStorage.removeItem(k),
};

export function readJSON<T>(key: string, fallback: T, store: StorageAdapter = browserStorage): T {
  try {
    const raw = store.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJSON<T>(key: string, value: T, store: StorageAdapter = browserStorage) {
  store.setItem(key, JSON.stringify(value));
}
