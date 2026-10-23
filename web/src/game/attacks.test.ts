import { describe, expect, it } from 'vitest'
import { attackCount, baseAttackStrength, frontlineRank, generateAttacks } from './attacks'
import { TILE_DEFS } from './data'
import { createRng } from './rng'
import type { Direction, Tile } from './types'

const GRID = 4

const tileAt = (cell: number, health = TILE_DEFS.house.health): Tile => ({
  id: `tile-${cell}`,
  def: TILE_DEFS.house,
  cell,
  health,
  bonusDefense: 0,
})

/** Cells 0..count-1, filling the grid row by row from the top. */
const makeTiles = (count: number): Tile[] => Array.from({ length: count }, (_, i) => tileAt(i))

/** A full 4x4 grid. */
const fullGrid = () => makeTiles(GRID * GRID)

const idMaker = () => {
  let n = 0
  return () => `attack-${n++}`
}

const rankOf = (tiles: Tile[], cell: number, direction: Direction) =>
  frontlineRank(tiles.find((t) => t.cell === cell)!, tiles, direction, GRID)

describe('frontlineRank', () => {
  it('ranks by distance from the enemy edge in each direction', () => {
    const tiles = fullGrid()
    // cell 6 is x=2, y=1
    expect(rankOf(tiles, 6, 'north')).toBe(1)
    expect(rankOf(tiles, 6, 'south')).toBe(2)
    expect(rankOf(tiles, 6, 'west')).toBe(2)
    expect(rankOf(tiles, 6, 'east')).toBe(1)
  })

  it('ignores empty cells and destroyed tiles in front', () => {
    // Column x=0: cell 0 destroyed, cell 4 empty, cell 8 standing, cell 12 standing
    const tiles = [tileAt(0, 0), tileAt(8), tileAt(12)]
    expect(rankOf(tiles, 8, 'north')).toBe(0)
    expect(rankOf(tiles, 12, 'north')).toBe(1)
    expect(rankOf(tiles, 12, 'south')).toBe(0)
  })
})

describe('generateAttacks', () => {
  it('targets the front line first', () => {
    const tiles = fullGrid()
    const attacks = generateAttacks(1, tiles, createRng(1), idMaker(), 'north', GRID)
    expect(attacks).toHaveLength(attackCount(1))
    for (const attack of attacks) {
      expect(rankOf(tiles, tiles.find((t) => t.id === attack.tileId)!.cell, 'north')).toBe(0)
    }
  })

  it('spills to the next rank when the front line is full', () => {
    const tiles = fullGrid()
    const turn = 6 // 5 attacks, 4 front-line tiles
    const attacks = generateAttacks(turn, tiles, createRng(4), idMaker(), 'west', GRID)
    const ranks = attacks.map((a) => rankOf(tiles, tiles.find((t) => t.id === a.tileId)!.cell, 'west'))
    expect(ranks.filter((r) => r === 0)).toHaveLength(4)
    expect(ranks.filter((r) => r === 1)).toHaveLength(1)
    expect(attacks.every((a) => a.merged === 0)).toBe(true)
  })

  it('merges extra attacks onto living tiles when attacks outnumber tiles', () => {
    const tiles = makeTiles(3)
    tiles[0].health = 0
    const turn = 6
    const attacks = generateAttacks(turn, tiles, createRng(2), idMaker(), 'north', GRID)

    expect(attacks).toHaveLength(2)
    expect(attacks.some((a) => a.tileId === 'tile-0')).toBe(false)
    const mergedTotal = attacks.reduce((sum, a) => sum + a.merged, 0)
    expect(mergedTotal).toBe(attackCount(turn) - 2)
  })

  it('returns no attacks when the city has no living tiles', () => {
    const tiles = makeTiles(2).map((t) => ({ ...t, health: 0 }))
    expect(generateAttacks(1, tiles, createRng(3), idMaker(), 'north', GRID)).toEqual([])
  })
})

describe('attack escalation', () => {
  it('grows attack count and strength every turn', () => {
    for (let turn = 1; turn < 20; turn++) {
      expect(attackCount(turn + 1)).toBeGreaterThanOrEqual(attackCount(turn))
      expect(baseAttackStrength(turn + 1)).toBeGreaterThan(baseAttackStrength(turn))
    }
    expect(attackCount(20)).toBeGreaterThan(attackCount(1))
  })
})
