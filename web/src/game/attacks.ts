import { hasPassive } from './entities'
import type { Rng } from './rng'
import type { Attack, Direction, Tile } from './types'

export const DIRECTIONS: Direction[] = ['north', 'east', 'south', 'west']

/** Attacks on tiles behind the front line (rank > 0) hit at this fraction of their strength. */
export const DEEP_ATTACK_FACTOR = 0.5

/** After this day every day adds one attack on top of the grid cap. */
export const ESCALATION_DAY = 10

/** Attacks per day, capped at the width of the grid until the city outlasts `ESCALATION_DAY`. */
export function attackCount(day: number, gridSize = Infinity): number {
  return Math.min(2 + Math.floor(day / 2), gridSize) + Math.max(0, day - ESCALATION_DAY)
}

export function baseAttackStrength(day: number, bonus = 0): number {
  return 3 + day * 1.5 + bonus
}

/** Random strength of one attack on `day`, reduced for targets behind the front line. */
export function rollAttackStrength(day: number, rng: Rng, bonus = 0, deep = false): number {
  const strength = Math.max(1, Math.round(baseAttackStrength(day, bonus) + rng.int(-1, 1)))
  return deep ? Math.ceil(strength * DEEP_ATTACK_FACTOR) : strength
}

/** Lane (column or row facing the enemy) and depth (distance from the enemy edge) of a cell. */
export function laneAndDepth(cell: number, direction: Direction, gridSize: number) {
  const x = cell % gridSize
  const y = Math.floor(cell / gridSize)
  switch (direction) {
    case 'north':
      return { lane: x, depth: y }
    case 'south':
      return { lane: x, depth: gridSize - 1 - y }
    case 'west':
      return { lane: y, depth: x }
    case 'east':
      return { lane: y, depth: gridSize - 1 - x }
  }
}

const NEIGHBOR_OFFSETS: Record<Direction, { dx: number; dy: number }> = {
  north: { dx: 0, dy: -1 },
  south: { dx: 0, dy: 1 },
  west: { dx: -1, dy: 0 },
  east: { dx: 1, dy: 0 },
}

export function neighborCell(cell: number, side: Direction, gridSize: number): number | undefined {
  const x = (cell % gridSize) + NEIGHBOR_OFFSETS[side].dx
  const y = Math.floor(cell / gridSize) + NEIGHBOR_OFFSETS[side].dy
  if (x < 0 || y < 0 || x >= gridSize || y >= gridSize) return undefined
  return y * gridSize + x
}

/**
 * Open cells (empty or holding a destroyed tile) the enemy can walk into, starting from the
 * open cells on its edge and spreading through adjacent open cells.
 */
export function reachableOpenCells(
  tiles: Tile[],
  direction: Direction,
  gridSize: number,
): Set<number> {
  const blocked = new Set(tiles.filter((t) => t.health > 0).map((t) => t.cell))
  const reached = new Set<number>()
  const queue: number[] = []
  for (let cell = 0; cell < gridSize * gridSize; cell++) {
    if (laneAndDepth(cell, direction, gridSize).depth === 0 && !blocked.has(cell)) {
      reached.add(cell)
      queue.push(cell)
    }
  }
  while (queue.length) {
    const cell = queue.shift()!
    for (const side of DIRECTIONS) {
      const next = neighborCell(cell, side, gridSize)
      if (next === undefined || blocked.has(next) || reached.has(next)) continue
      reached.add(next)
      queue.push(next)
    }
  }
  return reached
}

/** Sides of a standing tile the enemy can reach: its own edge, or an adjacent reachable open cell. */
export function exposedSides(
  tile: Tile,
  tiles: Tile[],
  direction: Direction,
  gridSize: number,
  reachable = reachableOpenCells(tiles, direction, gridSize),
): Direction[] {
  if (tile.health <= 0) return []
  return DIRECTIONS.filter((side) => {
    const next = neighborCell(tile.cell, side, gridSize)
    return next === undefined ? side === direction : reachable.has(next)
  })
}

/**
 * 0 if the enemy can reach the tile (front line or open flank), otherwise the number of
 * standing tiles between it and the enemy edge in its lane.
 */
export function frontlineRank(
  tile: Tile,
  tiles: Tile[],
  direction: Direction,
  gridSize: number,
  reachable = reachableOpenCells(tiles, direction, gridSize),
): number {
  if (exposedSides(tile, tiles, direction, gridSize, reachable).length > 0) return 0
  const own = laneAndDepth(tile.cell, direction, gridSize)
  return tiles.filter((t) => {
    if (t.id === tile.id || t.health <= 0) return false
    const other = laneAndDepth(t.cell, direction, gridSize)
    return other.lane === own.lane && other.depth < own.depth
  }).length
}

/** True for a `laneAnchor` tile that still shares its lane with another standing tile. */
export function isLaneAnchored(
  tile: Tile,
  tiles: Tile[],
  direction: Direction,
  gridSize: number,
): boolean {
  if (tile.health <= 0 || !hasPassive(tile, 'laneAnchor')) return false
  const { lane } = laneAndDepth(tile.cell, direction, gridSize)
  return tiles.some(
    (t) =>
      t.id !== tile.id && t.health > 0 && laneAndDepth(t.cell, direction, gridSize).lane === lane,
  )
}

export interface AttackTarget {
  tile: Tile
  /** Behind the front line, hit at reduced strength. */
  deep: boolean
}

/**
 * Tile the next attack hits: a random exposed tile (front line or open flank) not already under
 * attack, spilling to deeper ranks only when every shallower one is taken. Undefined when every
 * attackable tile is already under attack or nothing stands.
 */
export function pickTarget(
  tiles: Tile[],
  attackedTileIds: Set<string>,
  rng: Rng,
  direction: Direction,
  gridSize: number,
): AttackTarget | undefined {
  const standing = tiles.filter((t) => t.health > 0)
  const unshielded = standing.filter((t) => !isLaneAnchored(t, standing, direction, gridSize))
  const alive = unshielded.length > 0 ? unshielded : standing
  const free = alive.filter((t) => !attackedTileIds.has(t.id))
  if (free.length === 0) return undefined

  const reachable = reachableOpenCells(tiles, direction, gridSize)
  const ranked = free.map((tile) => ({
    tile,
    rank: frontlineRank(tile, tiles, direction, gridSize, reachable),
  }))
  const front = Math.min(...ranked.map((r) => r.rank))
  const { tile } = rng.pick(ranked.filter((r) => r.rank === front))
  return { tile, deep: front > 0 }
}

export interface SpawnContext {
  day: number
  tiles: Tile[]
  /** Attacks already running, at most one per tile. */
  attacks: Attack[]
  rng: Rng
  makeId: () => string
  direction: Direction
  gridSize: number
  /** Ticks a new fight lasts. */
  duration: number
  bonus?: number
}

/**
 * Spawns one attack as a new incoming attack on a free target. When every target is already
 * under attack, its strength merges into a random running attack instead (`isNew` false).
 */
export function spawnAttack(ctx: SpawnContext): { attack: Attack; isNew: boolean } | undefined {
  const { day, rng, bonus = 0 } = ctx
  const attacked = new Set(ctx.attacks.map((a) => a.tileId))
  const target = pickTarget(ctx.tiles, attacked, rng, ctx.direction, ctx.gridSize)
  if (target) {
    const attack: Attack = {
      id: ctx.makeId(),
      tileId: target.tile.id,
      strength: rollAttackStrength(day, rng, bonus, target.deep),
      merged: 0,
      deep: target.deep,
      status: 'incoming',
      duration: ctx.duration,
      elapsed: 0,
      tileDamageDealt: 0,
    }
    return { attack, isNew: true }
  }
  if (ctx.attacks.length === 0) return undefined
  const attack = rng.pick(ctx.attacks)
  attack.strength += rollAttackStrength(day, rng, bonus, !!attack.deep)
  attack.merged++
  return { attack, isNew: false }
}
