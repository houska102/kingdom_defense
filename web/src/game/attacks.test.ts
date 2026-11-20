import { describe, expect, it } from 'vitest'
import {
  ESCALATION_DAY,
  attackCount,
  baseAttackStrength,
  exposedSides,
  frontlineRank,
  pickTarget,
  rollAttackStrength,
  spawnAttack,
  type SpawnContext,
} from './attacks'
import { ALL_TILE_DEFS, TILE_DEFS } from './data'
import { createRng } from './rng'
import type { Attack, Direction, Tile } from './types'

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

const attacking = (tiles: Tile[]) => new Set(tiles.map((t) => t.id))

const spawnCtx = (tiles: Tile[], attacks: Attack[] = [], seed = 1): SpawnContext => ({
  day: 1,
  tiles,
  attacks,
  rng: createRng(seed),
  makeId: idMaker(),
  direction: 'north',
  gridSize: GRID,
  duration: 4,
})

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

describe('pickTarget', () => {
  it('targets the front line first', () => {
    const tiles = fullGrid()
    for (let seed = 0; seed < 50; seed++) {
      const target = pickTarget(tiles, new Set(), createRng(seed), 'north', GRID)!
      expect(rankOf(tiles, target.tile.cell, 'north')).toBe(0)
      expect(target.deep).toBe(false)
    }
  })

  it('skips tiles under attack and spills deeper once the front line is taken', () => {
    const tiles = fullGrid()
    const front = tiles.filter((t) => t.cell < GRID)
    for (let seed = 0; seed < 50; seed++) {
      const target = pickTarget(tiles, attacking(front), createRng(seed), 'north', GRID)!
      expect(rankOf(tiles, target.tile.cell, 'north')).toBe(1)
      expect(target.deep).toBe(true)
    }
  })

  it('finds no target when every standing tile is under attack', () => {
    const tiles = makeTiles(3)
    tiles[0].health = 0
    expect(pickTarget(tiles, attacking(tiles.slice(1)), createRng(1), 'north', GRID)).toBe(
      undefined,
    )
  })

  it('finds no target when the city has no living tiles', () => {
    const tiles = makeTiles(2).map((t) => ({ ...t, health: 0 }))
    expect(pickTarget(tiles, new Set(), createRng(3), 'north', GRID)).toBe(undefined)
  })

  describe('Last Bastion', () => {
    const withBastion = (tiles: Tile[], cell: number) =>
      tiles.map((t) => (t.cell === cell ? { ...t, def: ALL_TILE_DEFS.lastBastion } : t))

    it('is never attacked while its lane has other standing tiles', () => {
      const tiles = withBastion(fullGrid(), 0)
      for (let seed = 0; seed < 50; seed++) {
        expect(pickTarget(tiles, new Set(), createRng(seed), 'north', GRID)?.tile.id).not.toBe(
          'tile-0',
        )
      }
      const others = tiles.filter((t) => t.id !== 'tile-0')
      expect(pickTarget(tiles, attacking(others), createRng(1), 'north', GRID)).toBe(undefined)
    })

    it('is attacked once it is alone in its lane', () => {
      const tiles = withBastion(fullGrid(), 0).filter((t) => ![4, 8, 12].includes(t.cell))
      const others = tiles.filter((t) => t.id !== 'tile-0')
      const target = pickTarget(tiles, attacking(others), createRng(1), 'north', GRID)
      expect(target?.tile.id).toBe('tile-0')
    })

    it('is still attacked when nothing else can be', () => {
      const tiles = withBastion(withBastion(makeTiles(5), 0), 4).filter((t) => t.cell % GRID === 0)
      expect(pickTarget(tiles, new Set(), createRng(2), 'north', GRID)).toBeDefined()
    })
  })
})

describe('spawnAttack', () => {
  it('creates an incoming attack on a free tile', () => {
    const spawned = spawnAttack(spawnCtx(fullGrid()))!
    expect(spawned.isNew).toBe(true)
    expect(spawned.attack).toMatchObject({
      status: 'incoming',
      duration: 4,
      elapsed: 0,
      merged: 0,
      tileDamageDealt: 0,
    })
    expect(spawned.attack.strength).toBeGreaterThan(0)
  })

  it('never targets a tile that is already under attack', () => {
    const tiles = makeTiles(2)
    const first = spawnAttack(spawnCtx(tiles))!.attack
    for (let seed = 0; seed < 20; seed++) {
      const second = spawnAttack(spawnCtx(tiles, [first], seed))!
      expect(second.isNew).toBe(true)
      expect(second.attack.tileId).not.toBe(first.tileId)
    }
  })

  it('merges into a running attack when every tile is under attack', () => {
    const tiles = makeTiles(1)
    const running = { ...spawnAttack(spawnCtx(tiles))!.attack, status: 'fighting' as const }
    const before = running.strength
    const merged = spawnAttack(spawnCtx(tiles, [running], 2))!
    expect(merged.isNew).toBe(false)
    expect(merged.attack).toBe(running)
    expect(running.merged).toBe(1)
    expect(running.strength).toBeGreaterThan(before)
  })

  it('spawns nothing when no tile stands', () => {
    const tiles = makeTiles(2).map((t) => ({ ...t, health: 0 }))
    expect(spawnAttack(spawnCtx(tiles))).toBe(undefined)
  })
})

describe('attack escalation', () => {
  it('never has more attacks per day than the grid is wide until the escalation day', () => {
    expect(attackCount(ESCALATION_DAY, 4)).toBe(4)
    expect(attackCount(ESCALATION_DAY, 6)).toBe(6)
    expect(attackCount(1, 6)).toBe(2)
  })

  it('adds one attack per day on top of the grid cap after the escalation day', () => {
    expect(attackCount(ESCALATION_DAY + 1, 4)).toBe(5)
    expect(attackCount(ESCALATION_DAY + 3, 6)).toBe(9)
  })

  it('grows attack count and strength every day', () => {
    for (let day = 1; day < 20; day++) {
      expect(attackCount(day + 1)).toBeGreaterThanOrEqual(attackCount(day))
      expect(baseAttackStrength(day + 1)).toBeGreaterThan(baseAttackStrength(day))
    }
    expect(attackCount(20)).toBeGreaterThan(attackCount(1))
  })

  it('adds the city attack bonus to every attack', () => {
    expect(baseAttackStrength(3, 2)).toBe(baseAttackStrength(3) + 2)
    for (let seed = 0; seed < 20; seed++) {
      const plain = rollAttackStrength(2, createRng(seed))
      expect(rollAttackStrength(2, createRng(seed), 4)).toBe(plain + 4)
    }
  })

  it('halves attacks behind the front line, rounded up', () => {
    for (let seed = 0; seed < 20; seed++) {
      const plain = rollAttackStrength(6, createRng(seed))
      expect(rollAttackStrength(6, createRng(seed), 0, true)).toBe(Math.ceil(plain / 2))
    }
  })
})
