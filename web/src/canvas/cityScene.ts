import { signal } from 'canvasengine'
import { isWall, roadLinks, wallLinks } from '@/game/cityLayout'
import type { Direction, Tile } from '@/game/types'

export interface SceneTile {
  cell: number
  defId: string
  ruined: boolean
  /** Sides joined to a neighbouring wall, only set on wall tiles and the Keep. */
  links: Direction[]
  /** Directions of the roads passing through a wall tile. */
  gates: GateAxis[]
}

export type GateAxis = 'northSouth' | 'eastWest'

export interface Scene {
  tiles: SceneTile[]
  roads: [number, number][]
}

/** Width and height of the square canvas, in CSS pixels. */
export const sceneSize = signal(0)
export const sceneGrid = signal(4)
export const sceneTiles = signal<SceneTile[]>([])
export const sceneRoads = signal<[number, number][]>([])

export function buildScene(tiles: Tile[], gridSize: number): Scene {
  const walls = wallLinks(tiles, gridSize)
  const roads = roadLinks(tiles, gridSize)
  const wallCells = new Set(tiles.filter(isWall).map((t) => t.cell))
  const gates = new Map<number, GateAxis[]>()
  for (const [a, b] of roads) {
    const axis: GateAxis = b - a === 1 ? 'eastWest' : 'northSouth'
    for (const cell of [a, b]) {
      if (!wallCells.has(cell)) continue
      const axes = gates.get(cell) ?? []
      if (!axes.includes(axis)) gates.set(cell, [...axes, axis])
    }
  }
  return {
    tiles: tiles.map((tile) => ({
      cell: tile.cell,
      defId: tile.def.id,
      ruined: tile.health <= 0,
      links: walls.get(tile.cell) ?? [],
      gates: gates.get(tile.cell) ?? [],
    })),
    roads,
  }
}

export function syncScene(tiles: Tile[], gridSize: number) {
  const scene = buildScene(tiles, gridSize)
  sceneGrid.set(gridSize)
  sceneTiles.set(scene.tiles)
  sceneRoads.set(scene.roads)
}
