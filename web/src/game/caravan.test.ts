import { describe, expect, it } from 'vitest'
import { caravanGold, fillHoards, isCaravan } from './caravan'
import { ALL_TILE_DEFS } from './data'
import { createTile } from './entities'

const build = (defIds: string[]) => {
  const ids = { nextId: 0 }
  return defIds.map((id, cell) => createTile(ids, ALL_TILE_DEFS[id], cell))
}

describe('Refugee Caravan', () => {
  it('is recognized by its tile id', () => {
    const [caravan, house] = build(['refugeeCaravan', 'house'])
    expect(isCaravan(caravan)).toBe(true)
    expect(isCaravan(house)).toBe(false)
  })

  it('stores 1 gold per survived turn', () => {
    const tiles = build(['refugeeCaravan', 'house'])
    fillHoards(tiles)
    fillHoards(tiles)
    expect(tiles[0].hoard).toBe(2)
    expect(tiles[1].hoard).toBeUndefined()
    expect(caravanGold(tiles)).toBe(2)
  })

  it('stops gathering and loses its gold once destroyed', () => {
    const tiles = build(['refugeeCaravan'])
    fillHoards(tiles)
    tiles[0].health = 0
    fillHoards(tiles)
    expect(tiles[0].hoard).toBe(1)
    expect(caravanGold(tiles)).toBe(0)
  })
})
