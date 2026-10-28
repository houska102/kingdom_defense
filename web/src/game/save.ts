import type { GameState } from './types'

const SAVE_KEY = 'kingdom_defense.save'
/** Bump whenever the shape of GameState changes, older saves are then discarded. */
export const SAVE_VERSION = 2

export interface SaveData {
  state: GameState
  seed: number
}

export function loadSave(): SaveData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (data?.version !== SAVE_VERSION || typeof data.seed !== 'number' || !data.state) return null
    return { state: data.state, seed: data.seed }
  } catch {
    return null
  }
}

export function writeSave(state: GameState, seed: number) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ version: SAVE_VERSION, seed, state }))
  } catch {
    // Storage unavailable or full, the game keeps running unsaved.
  }
}
