import type { Rng } from './rng'
import type { Attack, Direction, Tile } from './types'

export const DIRECTIONS: Direction[] = ['north', 'east', 'south', 'west']

export function attackCount(turn: number): number {
  return 2 + Math.floor(turn / 2)
}

export function baseAttackStrength(turn: number): number {
  return 3 + turn * 1.5
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

/** Number of standing tiles between `tile` and the enemy edge in its lane. 0 is the front line. */
export function frontlineRank(
  tile: Tile,
  tiles: Tile[],
  direction: Direction,
  gridSize: number,
): number {
  const own = laneAndDepth(tile.cell, direction, gridSize)
  return tiles.filter((t) => {
    if (t.id === tile.id || t.health <= 0) return false
    const other = laneAndDepth(t.cell, direction, gridSize)
    return other.lane === own.lane && other.depth < own.depth
  }).length
}

/**
 * Creates this turn's attacks, at most one per living tile, filling the front line facing
 * `direction` first and spilling deeper. When there are more attacks than living tiles,
 * the extra attacks merge into existing ones.
 */
export function generateAttacks(
  turn: number,
  tiles: Tile[],
  rng: Rng,
  makeId: () => string,
  direction: Direction,
  gridSize: number,
): Attack[] {
  const alive = tiles.filter((t) => t.health > 0)
  if (alive.length === 0) return []

  const rollStrength = () => Math.max(1, Math.round(baseAttackStrength(turn) + rng.int(-1, 1)))
  const count = attackCount(turn)

  const byRank = new Map<number, Tile[]>()
  for (const tile of alive) {
    const rank = frontlineRank(tile, tiles, direction, gridSize)
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
