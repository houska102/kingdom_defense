import type { Direction } from '@/game/types'

/** Width of the terrain border around the city, in cells. */
export const FRAME_CELLS = 0.6

/** Axis-aligned box in board units, one unit per cell, (0, 0) at the top left of the canvas. */
export interface Rect {
  x1: number
  y1: number
  x2: number
  y2: number
}

export interface Point {
  x: number
  y: number
}

export interface Rock extends Point {
  r: number
  /** Seeds the outline of the rock. */
  seed: number
}

export type Crop = 'wheat' | 'green' | 'fallow'

export interface FieldPatch {
  rect: Rect
  crop: Crop
  /** Direction of the furrows on the canvas. */
  rows: 'horizontal' | 'vertical'
}

export interface Terrain {
  /** Width and height of the whole board in board units. */
  size: number
  /** The city grid. */
  city: Rect
  /** Open ground on the attack side, exactly as wide as the city. */
  approach: Rect
  /** Dirt track from the board edge to the city on the attack side. */
  track: [Point, Point]
  /** Small stones on the approach. */
  pebbles: Rock[]
  /** Impassable cliffs on both flanks, the full depth of the board. */
  cliffs: Rect[]
  /** Dark rock face along the side of each cliff that faces the open ground. */
  cliffFaces: Rect[]
  /** Shadow cast by each cliff onto the open ground next to it. */
  cliffShadows: Rect[]
  boulders: Rock[]
  /** Farmland behind the city, between the cliffs. */
  fields: FieldPatch[]
}

const CLIFF_FACE = 0.12
const CLIFF_SHADOW = 0.1
const CROPS: Crop[] = ['wheat', 'green', 'fallow']

function seededRandom(seed: number) {
  let n = seed * 9301 + 49297
  return () => {
    n = (n * 9301 + 49297) % 233280
    return n / 233280
  }
}

/**
 * Terrain around a city attacked from `direction`.
 * It is laid out as if the attack comes from the north, then rotated onto the attack side.
 */
export function terrainLayout(gridSize: number, direction: Direction): Terrain {
  const f = FRAME_CELLS
  const size = gridSize + 2 * f
  const near = f
  const far = f + gridSize
  const rand = seededRandom(gridSize)

  const point = (x: number, y: number): Point => {
    switch (direction) {
      case 'north':
        return { x, y }
      case 'east':
        return { x: size - y, y: x }
      case 'south':
        return { x: size - x, y: size - y }
      case 'west':
        return { x: y, y: size - x }
    }
  }
  const rect = (x1: number, y1: number, x2: number, y2: number): Rect => {
    const a = point(x1, y1)
    const b = point(x2, y2)
    return { x1: Math.min(a.x, b.x), y1: Math.min(a.y, b.y), x2: Math.max(a.x, b.x), y2: Math.max(a.y, b.y) }
  }
  const rock = (x: number, y: number, r: number): Rock => ({ ...point(x, y), r, seed: Math.floor(rand() * 1e6) })
  const sideways = direction === 'east' || direction === 'west'

  const boulders: Rock[] = []
  for (const [from, to] of [
    [0, near - CLIFF_FACE],
    [far + CLIFF_FACE, size],
  ]) {
    const count = Math.round(size * 2.5)
    for (let i = 0; i < count; i++) {
      const r = f * (0.15 + rand() * 0.15)
      const x = from + r + rand() * Math.max(0, to - from - 2 * r)
      const y = r + ((size - 2 * r) * (i + rand())) / count
      boulders.push(rock(x, y, r))
    }
  }

  const pebbles: Rock[] = []
  for (let i = 0; i < gridSize * 3; i++) {
    pebbles.push(rock(near + rand() * gridSize, rand() * (f - 0.05), 0.02 + rand() * 0.03))
  }

  const fields: FieldPatch[] = []
  let x = near
  while (x < far - 0.01) {
    const width = Math.min(far - x, 0.6 + rand() * 0.8)
    const end = far - (x + width) < 0.4 ? far : x + width
    const along = rand() < 0.7
    fields.push({
      rect: rect(x, far, end, size),
      crop: CROPS[Math.floor(rand() * CROPS.length)],
      rows: along !== sideways ? 'vertical' : 'horizontal',
    })
    x = end
  }

  return {
    size,
    city: rect(near, near, far, far),
    approach: rect(near, 0, far, near),
    track: [point(size / 2, 0), point(size / 2, near)],
    pebbles,
    cliffs: [rect(0, 0, near, size), rect(far, 0, size, size)],
    cliffFaces: [rect(near - CLIFF_FACE, 0, near, size), rect(far, 0, far + CLIFF_FACE, size)],
    cliffShadows: [rect(near, 0, near + CLIFF_SHADOW, size)],
    boulders,
    fields,
  }
}
