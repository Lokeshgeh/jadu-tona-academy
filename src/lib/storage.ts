import {
  CORRUPT_BACKUP_KEY,
  STORAGE_KEY,
  emptyProgress,
  migrateProgress,
  progressSchema,
  type ProgressState,
} from "../domain/progress";

export interface LoadResult {
  state: ProgressState;
  /** Human-readable warning when saved data could not be used. */
  error: string | null;
  /** True when the previous raw value was preserved for recovery. */
  backedUp: boolean;
}

function storage(): Storage | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Loads local progress. A corrupt value is never silently destroyed: it is
 * copied to a separate backup key before the app continues with empty state.
 */
export function loadProgress(now: Date = new Date()): LoadResult {
  const store = storage();
  if (!store) {
    return { state: emptyProgress(now), error: "Local storage is unavailable. Progress will not be saved.", backedUp: false };
  }
  let raw: string | null = null;
  try {
    raw = store.getItem(STORAGE_KEY);
  } catch {
    return { state: emptyProgress(now), error: "Local storage could not be read.", backedUp: false };
  }
  if (!raw) return { state: emptyProgress(now), error: null, backedUp: false };

  try {
    const parsed: unknown = JSON.parse(raw);
    const state = migrateProgress(parsed);
    return { state, error: null, backedUp: false };
  } catch (error) {
    let backedUp = false;
    try {
      store.setItem(CORRUPT_BACKUP_KEY, raw);
      backedUp = true;
    } catch {
      backedUp = false;
    }
    const detail = error instanceof Error ? error.message : "Unknown parse error";
    return {
      state: emptyProgress(now),
      error: `Saved progress could not be read (${detail}). Starting fresh; the previous raw value was ${backedUp ? "backed up under " + CORRUPT_BACKUP_KEY : "not backed up because storage is full"}.`,
      backedUp,
    };
  }
}

export function saveProgress(state: ProgressState): { ok: boolean; error: string | null } {
  const store = storage();
  if (!store) return { ok: false, error: "Local storage is unavailable." };
  try {
    // Validate before writing so a bug cannot persist an invalid state.
    const validated = progressSchema.parse(state);
    store.setItem(STORAGE_KEY, JSON.stringify(validated));
    return { ok: true, error: null };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not save progress." };
  }
}

export function clearProgress(): { ok: boolean; error: string | null } {
  const store = storage();
  if (!store) return { ok: false, error: "Local storage is unavailable." };
  try {
    store.removeItem(STORAGE_KEY);
    return { ok: true, error: null };
  } catch {
    return { ok: false, error: "Could not clear progress." };
  }
}

export function readRawProgress(): string | null {
  try {
    return storage()?.getItem(STORAGE_KEY) ?? null;
  } catch {
    return null;
  }
}

export function readCorruptBackup(): string | null {
  try {
    return storage()?.getItem(CORRUPT_BACKUP_KEY) ?? null;
  } catch {
    return null;
  }
}
