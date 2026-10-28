import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { newCampaign } from './campaign'
import { createRng } from './rng'
import { loadSave, SAVE_VERSION, writeSave } from './save'

const KEY = 'kingdom_defense.save'

describe('save', () => {
  let store: Record<string, string>

  beforeEach(() => {
    store = {}
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value
      },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('round-trips the state and seed', () => {
    const rng = createRng(7)
    const state = newCampaign(rng)
    writeSave(state, rng.seed())
    expect(loadSave()).toEqual({ state, seed: rng.seed() })
  })

  it('returns null without a save', () => {
    expect(loadSave()).toBeNull()
  })

  it('discards saves from another version', () => {
    store[KEY] = JSON.stringify({ version: SAVE_VERSION + 1, seed: 1, state: {} })
    expect(loadSave()).toBeNull()
  })

  it('discards corrupt saves', () => {
    store[KEY] = '{not json'
    expect(loadSave()).toBeNull()
  })
})
