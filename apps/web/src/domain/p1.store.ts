/**
 * CITURBAREA — Domain — P1 Store (compat shim)
 *
 * Why: Some Tome-3 P1 portal components import from "domain/p1.store".
 * In earlier iterations this file existed as a thin persistence layer.
 * In v155 the domain was reorganized, so the import now breaks Vite.
 *
 * Doctrine alignment:
 * - Keep domain logic stable for UI.
 * - Persistence is explicit and keyed by userId.
 * - No hidden side effects.
 */

import { useMemo } from 'react';

export type P1State = {
  /** Reserved for later state-machine expansion */
  step?: string;
  /** Timestamp for last update */
  updatedAt?: string;
  /** Arbitrary payload */
  data?: Record<string, any>;
};

const KEY_PREFIX = 'CITURBAREA:P1:STATE:';

function keyFor(userId: string) {
  return `${KEY_PREFIX}${userId}`;
}

export function loadPersistedState(userId: string): P1State | null {
  try {
    const raw = window.localStorage.getItem(keyFor(userId));
    if (!raw) return null;
    return JSON.parse(raw) as P1State;
  } catch {
    return null;
  }
}

export function persistState(userId: string, state: P1State) {
  try {
    window.localStorage.setItem(keyFor(userId), JSON.stringify(state));
  } catch {
    // no-op (quota / privacy mode)
  }
}

/**
 * Minimal hook used by P1Home.
 * It currently does NOT implement transitions because P1Home
 * only needs a stable object to persist/restore.
 */
export function useP1Machine(initial: P1State): P1State {
  return useMemo(() => initial, [initial]);
}
