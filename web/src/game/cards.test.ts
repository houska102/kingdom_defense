import { describe, expect, it } from 'vitest'
import { DRAFT_SIZE, applyCard, draftSize, rollDraft } from './cards'
import {
  ALL_TILE_DEFS,
  CAMPAIGN_LENGTH,
  TILE_DEFS,
  UNIT_DEFS,
  UNLOCKABLE_TILES,
  UNLOCKABLE_UNITS,
} from './data'
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
    battleEvents: [],
    battleEventIndex: 0,
    pendingEvents: [],
    eventIndex: 0,
    reports: [],
    draft: [],
    pendingCard: null,
    unlocks: [],
    fallReason: null,
    cityIndex: 0,
    cityResults: [],
    tileUnlocks: {},
    unitUnlocks: [],
    gold: 0,
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

  it('never offers units that are already unlocked', () => {
    const state = makeState()
    state.unitUnlocks = UNLOCKABLE_UNITS.slice(1).map((u) => u.id)
    for (let seed = 0; seed < 50; seed++) {
      for (const card of rollDraft(state, createRng(seed))) {
        if (card.effect.kind === 'unlockUnit') {
          expect(card.effect.unit.id).toBe(UNLOCKABLE_UNITS[0].id)
        }
      }
    }
    state.unitUnlocks = UNLOCKABLE_UNITS.map((u) => u.id)
    for (let seed = 0; seed < 50; seed++) {
      expect(rollDraft(state, createRng(seed)).some((c) => c.effect.kind === 'unlockUnit')).toBe(
        false,
      )
    }
  })

  it('never offers unique tiles that are already unlocked or picked this city', () => {
    const uniqueIds = UNLOCKABLE_TILES.filter((t) => t.unique).map((t) => t.id)
    expect(uniqueIds).toEqual(expect.arrayContaining(['infirmary', 'militiaCenter']))

    const state = makeState()
    state.tileUnlocks = Object.fromEntries(
      uniqueIds.filter((id) => id !== 'militiaCenter').map((id) => [id, 1]),
    )
    state.unlocks = [
      {
        id: 'picked',
        name: '',
        description: '',
        target: null,
        effect: { kind: 'unlockTile', tile: ALL_TILE_DEFS.militiaCenter },
        nextCity: true,
      },
    ]
    let offeredTiles = 0
    for (let seed = 0; seed < 200; seed++) {
      for (const card of rollDraft(state, createRng(seed))) {
        if (card.effect.kind !== 'unlockTile') continue
        offeredTiles++
        expect(uniqueIds).not.toContain(card.effect.tile.id)
      }
    }
    expect(offeredTiles).toBeGreaterThan(0)
  })

  it('offers no next-city cards in the last city', () => {
    const state = makeState()
    state.cityIndex = CAMPAIGN_LENGTH - 1
    for (let seed = 0; seed < 50; seed++) {
      expect(rollDraft(state, createRng(seed)).every((c) => !c.nextCity)).toBe(true)
    }
  })

  it('offers as many different cards as the draft size', () => {
    const state = makeState()
    for (let seed = 0; seed < 50; seed++) {
      const draft = rollDraft(state, createRng(seed), 4)
      expect(draft).toHaveLength(4)
      expect(new Set(draft.map((c) => c.name)).size).toBe(4)
    }
  })
})

describe('draftSize', () => {
  it('adds a card while a Granary stands', () => {
    const ids = { nextId: 0 }
    const wall = createTile(ids, TILE_DEFS.wall, 0)
    const granary = createTile(ids, ALL_TILE_DEFS.granary, 1)
    expect(draftSize([wall])).toBe(DRAFT_SIZE)
    expect(draftSize([wall, granary])).toBe(DRAFT_SIZE + 1)
    granary.health = 0
    expect(draftSize([wall, granary])).toBe(DRAFT_SIZE)
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

  it('adds gold to the treasury', () => {
    const state = makeState()
    state.gold = 2
    const card: Card = {
      id: 'c',
      name: '',
      description: '',
      target: null,
      effect: { kind: 'gainGold', amount: 3 },
      nextCity: false,
    }
    expect(applyCard(state, card)).toBe(true)
    expect(state.gold).toBe(5)
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
