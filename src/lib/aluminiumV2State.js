/**
 * Aluminium V2 State Management
 * Session storage helpers for the new aluminium calculator
 * Uses a dedicated storage key to avoid collisions with the old calculator
 */

const STORAGE_KEY = "ef_aluminium_v2_calc_state";

export function loadSavedV2State() {
  try {
    const raw = typeof window !== "undefined" && sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveV2State(state) {
  try {
    if (typeof window !== "undefined") {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  } catch {
    // ignore storage errors
  }
}

/**
 * Default run configuration for aluminium
 */
export function getDefaultAluminiumRun() {
  return {
    length_mm: 6000,
    gate: false,
    gate_mode: 'End',
    gate_after_panel: 1,
  };
}

/**
 * Default finishes state
 */
export function getDefaultAluminiumFinishes() {
  return {
    selectedStyle: 'Tubular',
    colour: 'Black',
    mount: 'Surface',
  };
}
