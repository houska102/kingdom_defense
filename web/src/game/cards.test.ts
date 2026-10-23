import { describe, expect, it } from 'vitest'
import { applyCard, rollDraft } from './cards'
import { TILE_DEFS, UNIT_DEFS } from './data'
import { createTile, createUnit } from './entities'
import { createRng } from './rng'
import type { Card, GameState } from './types'

const makeState = (): GameState => {
  const state: GameState = {
    phase: 'draft',
    turn: 1,
    gridSize: 4,
    attackDirection: 'north',
    nextId: 0,
    tiles: [],
    palette: {},
    selectedTileDefId: null,
    pickedUnitDefIds: [],
    units: [],
    attacks: [],
    assignments: {},
    selectedUnitId: null,
    pendingEvents: [],
    eventIndex: 0,
    reports: [],
    draft: [],
    pendingCard: null,
    unlocks: [],
    fallReason: null,
  }
  state.tiles.push(createTile(state, TILE_DEFS.wall, 0))
  state.units.push(createUnit(state, UNIT_DEFS.militia))
  return state
}

describe('rollDraft', () => {
  it('offers 3 distinct cards', () => {
    const draft = rollDraft(makeState(), createRng(5))
    expect(draft).toHaveLength(3)
    expect(new Set(draft.map((c) => c.effect.kind)).size).toBe(3)
  })
})

describe('applyCard', () => {
  it('repairs a tile without exceeding max health', () => {
    const state = makeState()
    const tile = state.tiles[0]
    tile.health = 4
    const card: Card = {
      id: 'c',
      name: '',
      description: '',
      target: 'tile',
      effect: { kind: 'repairTile', amount: 4 },
      nextCity: false,
    }
    expect(applyCard(state, card, tile.id)).toBe(true)
    expect(tile.health).toBe(tile.def.health)
  })

  it('records next-city cards in unlocks', () => {
    const state = makeState()
    const card: Card = {
      id: 'c',
      name: '',
      description: '',
      target: null,
      effect: { kind: 'unlockUnit', unit: UNIT_DEFS.knights },
      nextCity: true,
    }
    applyCard(state, card)
    expect(state.unlocks).toEqual([card])
  })

  it('rejects a targeted card without a valid target', () => {
    const state = makeState()
    const card: Card = {
      id: 'c',
      name: '',
      description: '',
      target: 'unit',
      effect: { kind: 'restUnit', heal: 1 },
      nextCity: false,
    }
    expect(applyCard(state, card, 'nope')).toBe(false)
  })
})
