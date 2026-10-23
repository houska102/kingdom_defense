import { describe, expect, it } from 'vitest'
import {
  bonusRecruits,
  buildPalette,
  createCity,
  garrisonPicks,
  garrisonPool,
  mergeUnlocks,
  newCampaign,
} from './campaign'
import {
  ALL_TILE_DEFS,
  CITY_CONFIGS,
  DEFAULT_PALETTE,
  UNLOCKABLE_TILES,
  UNLOCKABLE_UNITS,
} from './data'
import { createTile } from './entities'
import { createRng } from './rng'
import type { Card } from './types'

describe('bonusRecruits', () => {
  const build = (defIds: string[]) => {
    const ids = { nextId: 0 }
    return defIds.map((id, cell) => createTile(ids, ALL_TILE_DEFS[id], cell))
  }

  it('adds one Militia per standing House for a Militia Center', () => {
    const tiles = build(['militiaCenter', 'house', 'house', 'house', 'wall'])
    tiles[3].health = 0
    const recruits = bonusRecruits(tiles)
    expect(recruits.map((u) => u.id)).toEqual(['militia', 'militia'])
  })

  it('adds nothing without a Militia Center or when it is destroyed', () => {
    expect(bonusRecruits(build(['house', 'house']))).toEqual([])
    const tiles = build(['militiaCenter', 'house'])
    tiles[0].health = 0
    expect(bonusRecruits(tiles)).toEqual([])
  })
})

const tileCard = (i: number): Card => ({
  id: `t${i}`,
  name: '',
  description: '',
  target: null,
  effect: { kind: 'unlockTile', tile: UNLOCKABLE_TILES[i] },
  nextCity: true,
})

const unitCard = (i: number): Card => ({
  id: `u${i}`,
  name: '',
  description: '',
  target: null,
  effect: { kind: 'unlockUnit', unit: UNLOCKABLE_UNITS[i] },
  nextCity: true,
})

describe('garrisonPicks', () => {
  it('scales with the pool but never drops below 3', () => {
    expect(garrisonPicks(5)).toBe(3)
    expect(garrisonPicks(6)).toBe(3)
    expect(garrisonPicks(7)).toBe(4)
    expect(garrisonPicks(9)).toBe(5)
    expect(garrisonPicks(1)).toBe(3)
  })
})

describe('mergeUnlocks', () => {
  it('stacks tile unlocks and keeps unit unlocks unique', () => {
    const first = mergeUnlocks({ tileUnlocks: {}, unitUnlocks: [] }, [tileCard(0), unitCard(0)])
    const second = mergeUnlocks(first, [tileCard(0), tileCard(1), unitCard(0)])
    expect(second.tileUnlocks).toEqual({ [UNLOCKABLE_TILES[0].id]: 2, [UNLOCKABLE_TILES[1].id]: 1 })
    expect(second.unitUnlocks).toEqual([UNLOCKABLE_UNITS[0].id])
  })

  it('caps unique tile unlocks at 1', () => {
    const militiaCard = (id: string): Card => ({
      id,
      name: '',
      description: '',
      target: null,
      effect: { kind: 'unlockTile', tile: ALL_TILE_DEFS.militiaCenter },
      nextCity: true,
    })
    const first = mergeUnlocks({ tileUnlocks: {}, unitUnlocks: [] }, [militiaCard('a')])
    const second = mergeUnlocks(first, [militiaCard('b'), militiaCard('c')])
    expect(second.tileUnlocks.militiaCenter).toBe(1)
  })
})

describe('buildPalette', () => {
  it('adds unlocked copies on top of the defaults', () => {
    const palette = buildPalette({ wall: 1, bastion: 2 })
    expect(palette.wall).toBe(DEFAULT_PALETTE.wall + 1)
    expect(palette.bastion).toBe(2)
  })
})

describe('createCity', () => {
  it('carries unlocks into the next city and resets the rest', () => {
    const rng = createRng(1)
    const unlocks = mergeUnlocks({ tileUnlocks: {}, unitUnlocks: [] }, [tileCard(0), unitCard(1)])
    const city = createCity({ cityIndex: 1, cityResults: [], ...unlocks }, 42, rng)

    expect(city.phase).toBe('setup')
    expect(city.unlocks).toEqual([])
    expect(city.palette[UNLOCKABLE_TILES[0].id]).toBe(1)
    expect(garrisonPool(city.unitUnlocks).map((u) => u.id)).toContain(UNLOCKABLE_UNITS[1].id)
    expect(city.nextId).toBeGreaterThanOrEqual(42)
  })

  it('places prebuilt tiles from the city config', () => {
    const index = CITY_CONFIGS.findIndex((c) => c.prebuilt.length > 0)
    const config = CITY_CONFIGS[index]
    const city = createCity(
      { cityIndex: index, cityResults: [], tileUnlocks: {}, unitUnlocks: [] },
      0,
      createRng(2),
    )
    expect(city.tiles).toHaveLength(config.prebuilt.length)
    city.tiles.forEach((tile, i) => {
      expect(tile.prebuilt).toBe(true)
      expect(tile.cell).toBe(config.prebuilt[i].cell)
      expect(tile.health).toBe(config.prebuilt[i].health ?? tile.def.health)
    })
  })

  it('has valid configs for every city', () => {
    expect(CITY_CONFIGS).toHaveLength(10)
    CITY_CONFIGS.forEach((_, cityIndex) => {
      const city = createCity(
        { cityIndex, cityResults: [], tileUnlocks: {}, unitUnlocks: [] },
        0,
        createRng(cityIndex),
      )
      const cells = city.tiles.map((t) => t.cell)
      expect(new Set(cells).size).toBe(cells.length)
      expect(cells.every((c) => c >= 0 && c < city.gridSize ** 2)).toBe(true)
      expect(city.tiles.every((t) => t.def !== undefined)).toBe(true)
    })
  })

  it('starts a new campaign at city 1 with no unlocks', () => {
    const state = newCampaign(createRng(3))
    expect(state.cityIndex).toBe(0)
    expect(state.tileUnlocks).toEqual({})
    expect(state.unitUnlocks).toEqual([])
  })
})
