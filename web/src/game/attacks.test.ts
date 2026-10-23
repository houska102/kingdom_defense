import { describe, expect, it } from 'vitest'
import {
  attackCount,
  baseAttackStrength,
  exposedSides,
  frontlineRank,
  generateAttacks,
} from './attacks'
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
    // Column x=0: cell 0 destroyed, cell 4 empty, cells 8 and 12 standing
    const tiles = fullGrid()
      .filter((t) => t.cell !== 4)
      .map((t) => (t.cell === 0 ? { ...t, health: 0 } : t))
    expect(rankOf(tiles, 8, 'north')).toBe(0)
    expect(rankOf(tiles, 12, 'north')).toBe(1)
    expect(rankOf(tiles, 12, 'south')).toBe(0)
  })

  it('exposes tiles whose flank opens onto a reachable gap', () => {
    // Column x=0 is open down to y=1, so cells 1 and 5 are reachable from the west side
    const tiles = fullGrid()
      .filter((t) => t.cell !== 4)
      .map((t) => (t.cell === 0 ? { ...t, health: 0 } : t))
    expect(rankOf(tiles, 5, 'north')).toBe(0)
    expect(rankOf(tiles, 9, 'north')).toBe(2)

    const at = (cell: number) => tiles.find((t) => t.cell === cell)!
    expect(exposedSides(at(1), tiles, 'north', GRID)).toEqual(['north', 'west'])
    expect(exposedSides(at(5), tiles, 'north', GRID)).toEqual(['west'])
    expect(exposedSides(at(9), tiles, 'north', GRID)).toEqual([])
  })

  it('does not expose tiles next to an enclosed hole', () => {
    // Cell 10 (x=2, y=2) is destroyed but surrounded by standing tiles
    const tiles = fullGrid().map((t) => (t.cell === 10 ? { ...t, health: 0 } : t))
    expect(rankOf(tiles, 9, 'north')).toBe(2)
    expect(rankOf(tiles, 14, 'north')).toBe(2)
    expect(exposedSides(tiles[6], tiles, 'north', GRID)).toEqual([])
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

  it('never has more attacks than the grid is wide', () => {
    expect(attackCount(20, 4)).toBe(4)
    expect(attackCount(20, 6)).toBe(6)
    expect(attackCount(1, 6)).toBe(2)
    const attacks = generateAttacks(20, fullGrid(), createRng(4), idMaker(), 'west', GRID)
    expect(attacks).toHaveLength(GRID)
    expect(attacks.every((a) => a.merged === 0 && !a.deep)).toBe(true)
  })

  it('never reaches deeper ranks once attacks are capped at grid width', () => {
    const rng = createRng(11)
    for (let layout = 0; layout < 300; layout++) {
      const tiles = fullGrid().filter(() => rng.next() < 0.7)
      for (const attack of generateAttacks(20, tiles, rng, idMaker(), 'north', GRID)) {
        expect(attack.deep).toBe(false)
      }
    }
  })

  it('merges extra attacks onto living tiles when attacks outnumber tiles', () => {
    const tiles = makeTiles(3)
    tiles[0].health = 0
    const turn = 6
    const attacks = generateAttacks(turn, tiles, createRng(2), idMaker(), 'north', GRID)

    expect(attacks).toHaveLength(2)
    expect(attacks.some((a) => a.tileId === 'tile-0')).toBe(false)
    const mergedTotal = attacks.reduce((sum, a) => sum + a.merged, 0)
    expect(mergedTotal).toBe(attackCount(turn, GRID) - 2)
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

  it('adds the city attack bonus to every attack', () => {
    expect(baseAttackStrength(3, 2)).toBe(baseAttackStrength(3) + 2)
    const tiles = fullGrid()
    const plain = generateAttacks(2, tiles, createRng(9), idMaker(), 'north', GRID)
    const boosted = generateAttacks(2, tiles, createRng(9), idMaker(), 'north', GRID, 4)
    boosted.forEach((a, i) => expect(a.strength).toBe(plain[i].strength + 4))
  })
})
