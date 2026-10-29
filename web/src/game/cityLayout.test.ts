import { describe, expect, it } from 'vitest'
import { roadLinks, wallLinks } from './cityLayout'
import { ALL_TILE_DEFS } from './data'
import { createTile } from './entities'

/** Builds tiles from rows of def ids, `.` for an empty cell. */
const city = (rows: string[][]) => {
  const ids = { nextId: 0 }
  const size = rows.length
  return rows.flatMap((row, y) =>
    row.flatMap((id, x) => (id === '.' ? [] : [createTile(ids, ALL_TILE_DEFS[id], y * size + x)])),
  )
}

describe('wallLinks', () => {
  it('joins a straight run of walls', () => {
    const tiles = city([
      ['wall', 'bastion', 'stockade'],
      ['.', '.', '.'],
      ['.', '.', '.'],
    ])
    const links = wallLinks(tiles, 3)
    expect(links.get(0)).toEqual(['east'])
    expect(links.get(1)).toEqual(['east', 'west'])
    expect(links.get(2)).toEqual(['west'])
  })

  it('joins around a corner', () => {
    const tiles = city([
      ['wall', 'wall', '.'],
      ['.', 'lastBastion', '.'],
      ['.', '.', '.'],
    ])
    expect(wallLinks(tiles, 3).get(1)).toEqual(['south', 'west'])
    expect(wallLinks(tiles, 3).get(4)).toEqual(['north'])
  })

  it('leaves isolated walls and non-wall neighbours unlinked', () => {
    const tiles = city([
      ['wall', 'house', 'wall'],
      ['.', '.', '.'],
      ['.', '.', '.'],
    ])
    const links = wallLinks(tiles, 3)
    expect(links.get(0)).toEqual([])
    expect(links.get(2)).toEqual([])
    expect(links.has(1)).toBe(false)
  })

  it('joins walls to the Keep', () => {
    const tiles = city([
      ['wall', 'keep', 'house'],
      ['.', 'stockade', '.'],
      ['.', '.', '.'],
    ])
    const links = wallLinks(tiles, 3)
    expect(links.get(0)).toEqual(['east'])
    expect(links.get(1)).toEqual(['south', 'west'])
    expect(links.get(4)).toEqual(['north'])
  })

  it('joins walls to fortified buildings, but not fortified buildings to each other', () => {
    const tiles = city([
      ['watchtower', 'wall', 'barracks'],
      ['keep', 'ballista', '.'],
      ['.', '.', '.'],
    ])
    const links = wallLinks(tiles, 3)
    expect(links.get(0)).toEqual(['east'])
    expect(links.get(1)).toEqual(['east', 'south', 'west'])
    expect(links.get(2)).toEqual(['west'])
    expect(links.get(3)).toEqual([])
    expect(links.get(4)).toEqual(['north'])
  })

  it('breaks at ruined walls', () => {
    const tiles = city([
      ['wall', 'wall', 'wall'],
      ['.', '.', '.'],
      ['.', '.', '.'],
    ])
    tiles[1].health = 0
    const links = wallLinks(tiles, 3)
    expect(links.get(0)).toEqual([])
    expect(links.has(1)).toBe(false)
  })
})

describe('roadLinks', () => {
  it('links every adjacent building reachable from the Keep', () => {
    const tiles = city([
      ['house', 'keep', '.'],
      ['.', 'house', 'barracks'],
      ['.', '.', '.'],
    ])
    expect(roadLinks(tiles, 3)).toEqual([
      [0, 1],
      [1, 4],
      [4, 5],
    ])
  })

  it('passes through a wall as a gate between two buildings', () => {
    const tiles = city([
      ['keep', 'wall', 'house'],
      ['house', '.', '.'],
      ['.', '.', '.'],
    ])
    expect(roadLinks(tiles, 3)).toEqual([
      [0, 1],
      [0, 3],
      [1, 2],
    ])
  })

  it('stops at walls with nothing behind them, and at double walls', () => {
    const tiles = city([
      ['keep', 'wall', '.'],
      ['wall', '.', '.'],
      ['wall', '.', '.'],
    ])
    expect(roadLinks(tiles, 3)).toEqual([])
    const thick = city([
      ['keep', 'wall', 'stockade', 'house'],
      ['.', '.', '.', '.'],
      ['.', '.', '.', '.'],
      ['.', '.', '.', '.'],
    ])
    expect(roadLinks(thick, 4)).toEqual([])
  })

  it('skips buildings cut off from the Keep', () => {
    const tiles = city([
      ['keep', '.', 'house'],
      ['.', '.', 'house'],
      ['.', '.', '.'],
    ])
    expect(roadLinks(tiles, 3)).toEqual([])
  })

  it('stops at ruined buildings', () => {
    const tiles = city([
      ['keep', 'house', 'house'],
      ['.', '.', '.'],
      ['.', '.', '.'],
    ])
    tiles[1].health = 0
    expect(roadLinks(tiles, 3)).toEqual([])
  })

  it('has no roads without a Keep', () => {
    const tiles = city([
      ['house', 'house', '.'],
      ['.', '.', '.'],
      ['.', '.', '.'],
    ])
    expect(roadLinks(tiles, 3)).toEqual([])
  })
})
