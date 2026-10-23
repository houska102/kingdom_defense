import type { Rng } from './rng'
import type { Attack, Direction, Tile } from './types'

export const DIRECTIONS: Direction[] = ['north', 'east', 'south', 'west']

export function attackCount(turn: number): number {
  return 2 + Math.floor(turn / 2)
}

export function baseAttackStrength(turn: number, bonus = 0): number {
  return 3 + turn * 1.5 + bonus
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

function neighborCell(cell: number, side: Direction, gridSize: number): number | undefined {
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

/**
 * Creates this turn's attacks, at most one per living tile, filling exposed tiles (front line
 * and open flanks) first and spilling deeper. When there are more attacks than living tiles,
 * the extra attacks merge into existing ones.
 */
export function generateAttacks(
  turn: number,
  tiles: Tile[],
  rng: Rng,
  makeId: () => string,
  direction: Direction,
  gridSize: number,
  bonus = 0,
): Attack[] {
  const alive = tiles.filter((t) => t.health > 0)
  if (alive.length === 0) return []

  const rollStrength = () =>
    Math.max(1, Math.round(baseAttackStrength(turn, bonus) + rng.int(-1, 1)))
  const count = attackCount(turn)

  const reachable = reachableOpenCells(tiles, direction, gridSize)
  const byRank = new Map<number, Tile[]>()
  for (const tile of alive) {
    const rank = frontlineRank(tile, tiles, direction, gridSize, reachable)
    byRank.set(rank, [...(byRank.get(rank) ?? []), tile])
  }
  const ordered = [...byRank.keys()]
    .sort((a, b) => a - b)
    .flatMap((rank) => rng.shuffle(byRank.get(rank) ?? []))
  const targets = ordered.slice(0, Math.min(count, alive.length))

  const attacks: Attack[] = targets.map((tile) => ({
    id: makeId(),
    tileId: tile.id,
    strength: rollStrength(),
    merged: 0,
  }))

  for (let i = attacks.length; i < count; i++) {
    const target = rng.pick(attacks)
    target.strength += rollStrength()
    target.merged++
  }
  return attacks
}
