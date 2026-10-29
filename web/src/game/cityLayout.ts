import { DIRECTIONS, neighborCell } from './attacks'
import type { Direction, Tile } from './types'

/** Tiles drawn as wall sections that join their wall neighbours. */
export const WALL_DEF_IDS = new Set(['wall', 'bastion', 'stockade', 'lastBastion'])

export const isWall = (tile: Tile) => WALL_DEF_IDS.has(tile.def.id)

/** Fortified buildings that walls join onto. They stay on the road network. */
export const WALL_JOINING_IDS = new Set(['keep', 'watchtower', 'barracks', 'ballista'])

const joinsWalls = (tile: Tile) => isWall(tile) || WALL_JOINING_IDS.has(tile.def.id)

const standingByCell = (tiles: Tile[]) =>
  new Map(tiles.filter((t) => t.health > 0).map((t) => [t.cell, t]))

/** Board edges walled off by cliffs: the two sides across the attack direction. */
export const flankSides = (attack: Direction): Direction[] =>
  attack === 'north' || attack === 'south' ? ['east', 'west'] : ['north', 'south']

/**
 * For each standing wall or fortified building, the sides joined to a neighbour.
 * Tiles on a board edge listed in `cliffSides` also join the cliff on that side.
 */
export function wallLinks(
  tiles: Tile[],
  gridSize: number,
  cliffSides: Direction[] = [],
): Map<number, Direction[]> {
  const standing = standingByCell(tiles)
  const links = new Map<number, Direction[]>()
  for (const tile of standing.values()) {
    if (!joinsWalls(tile)) continue
    links.set(
      tile.cell,
      DIRECTIONS.filter((side) => {
        const next = neighborCell(tile.cell, side, gridSize)
        if (next === undefined) return cliffSides.includes(side)
        const neighbour = standing.get(next)
        return !!neighbour && joinsWalls(neighbour)
      }),
    )
  }
  return links
}

/**
 * Road segments between adjacent standing non-wall tiles that can be reached from the Keep.
 * A single wall tile with such tiles on opposite sides is crossed through a gate.
 * Each pair is listed once, lower cell first, sorted.
 */
export function roadLinks(tiles: Tile[], gridSize: number): [number, number][] {
  const standing = standingByCell(tiles)
  const keep = [...standing.values()].find((t) => t.def.id === 'keep')
  if (!keep) return []

  const links = new Map<string, [number, number]>()
  const link = (a: number, b: number) => {
    const pair: [number, number] = a < b ? [a, b] : [b, a]
    links.set(pair.join('-'), pair)
  }
  const reached = new Set([keep.cell])
  const queue = [keep.cell]
  while (queue.length) {
    const cell = queue.shift()!
    for (const side of DIRECTIONS) {
      const next = neighborCell(cell, side, gridSize)
      const neighbour = next === undefined ? undefined : standing.get(next)
      if (!neighbour) continue
      let target = neighbour
      if (isWall(neighbour)) {
        const beyond = neighborCell(neighbour.cell, side, gridSize)
        const far = beyond === undefined ? undefined : standing.get(beyond)
        if (!far || isWall(far)) continue
        link(cell, neighbour.cell)
        link(neighbour.cell, far.cell)
        target = far
      } else {
        link(cell, neighbour.cell)
      }
      if (reached.has(target.cell)) continue
      reached.add(target.cell)
      queue.push(target.cell)
    }
  }
  return [...links.values()].sort((a, b) => a[0] - b[0] || a[1] - b[1])
}
