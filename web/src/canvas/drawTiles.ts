import type { Graphics } from 'pixi.js'
import { WALL_JOINING_IDS } from '@/game/cityLayout'
import type { Direction } from '@/game/types'
import {
  FRAME_CELLS,
  sceneDirection,
  sceneGrid,
  sceneRoads,
  sceneSize,
  sceneTiles,
  type GateAxis,
  type SceneTile,
} from './cityScene'
import { terrainLayout, type Crop, type Rect, type Rock } from './terrain'

const GRASS = 0x3d5a32
const GRASS_ALT = 0x42613a
const GRID_LINE = 0x2c4226
const ROAD_EDGE = 0x6e5636
const ROAD = 0x9c7f52
const OUTLINE = 0x2a2a2a
const STONE = 0x9a9a9a
const STONE_DARK = 0x8d877b
const SLATE = 0x5a5f6e
const ROOF_COLORS = [0x9b3d2b, 0x3d5f8c, 0x6b4c8a, 0x2f7a6a, 0xa8742f]

/** Maps 0..1 coordinates inside a cell to canvas pixels. */
interface Cell {
  x: (u: number) => number
  y: (v: number) => number
  s: number
}

/** Buildings sit above the cell centre, the stats overlay covers the bottom of the cell. */
const BUILDING_LIFT = 0.14

/** Size of one cell in pixels, the terrain frame takes `FRAME_CELLS` on every side. */
const cellSize = () => sceneSize() / (sceneGrid() + 2 * FRAME_CELLS)

function cellAt(cell: number, lift = 0): Cell {
  const grid = sceneGrid()
  const s = cellSize()
  const x0 = ((cell % grid) + FRAME_CELLS) * s
  const y0 = (Math.floor(cell / grid) + FRAME_CELLS - lift) * s
  return { x: (u) => x0 + u * s, y: (v) => y0 + v * s, s }
}

const centre = (cell: number) => {
  const c = cellAt(cell)
  return { x: c.x(0.5), y: c.y(0.5) }
}

const rect = (g: Graphics, c: Cell, u1: number, v1: number, u2: number, v2: number) =>
  g.rect(c.x(u1), c.y(v1), (u2 - u1) * c.s, (v2 - v1) * c.s)

const poly = (g: Graphics, c: Cell, points: [number, number][]) =>
  g.poly(points.flatMap(([u, v]) => [c.x(u), c.y(v)]))

const circle = (g: Graphics, c: Cell, u: number, v: number, r: number) => g.circle(c.x(u), c.y(v), r * c.s)

const outline = (c: Cell) => ({ width: Math.max(1, c.s * 0.015), color: OUTLINE })

/** Scales the brightness of a 0xRRGGBB colour. */
function shade(color: number, factor: number): number {
  const channel = (shift: number) => Math.min(255, Math.round(((color >> shift) & 0xff) * factor))
  return (channel(16) << 16) | (channel(8) << 8) | channel(0)
}

export function drawGround(g: Graphics) {
  const grid = sceneGrid()
  const s = cellSize()
  if (!s) return
  for (let cell = 0; cell < grid * grid; cell++) {
    const c = cellAt(cell)
    const alt = ((cell % grid) + Math.floor(cell / grid)) % 2 === 1
    rect(g, c, 0, 0, 1, 1).fill(alt ? GRASS_ALT : GRASS)
  }
  const from = FRAME_CELLS * s
  const to = (FRAME_CELLS + grid) * s
  for (let i = 1; i < grid; i++) {
    const at = from + i * s
    g.moveTo(at, from).lineTo(at, to).moveTo(from, at).lineTo(to, at)
  }
  g.stroke({ width: 1, color: GRID_LINE, alpha: 0.6 })
}

const APPROACH = 0x56603a
const ROCK = 0x5f5a54
const ROCK_FACE = 0x3e3a36
const BOULDER = 0x7d776f
const HEDGE = 0x2f4a24
const CROP_COLORS: Record<Crop, number> = { wheat: 0xc9a94a, green: 0x6f8f3a, fallow: 0x8a6a42 }

/** Terrain around the city: open approach on the attack side, cliffs on the flanks, fields behind. */
export function drawTerrain(g: Graphics) {
  const s = cellSize()
  if (!s) return
  const t = terrainLayout(sceneGrid(), sceneDirection())
  const box = (r: Rect) => g.rect(r.x1 * s, r.y1 * s, (r.x2 - r.x1) * s, (r.y2 - r.y1) * s)

  box(t.approach).fill(APPROACH)
  const [start, end] = t.track
  for (const [width, color] of [
    [0.24, ROAD_EDGE],
    [0.16, ROAD],
  ]) {
    g.moveTo(start.x * s, start.y * s)
      .lineTo(end.x * s, end.y * s)
      .stroke({ width: width * s, color })
  }
  for (const pebble of t.pebbles) g.circle(pebble.x * s, pebble.y * s, pebble.r * s).fill(0x7a7468)

  for (const patch of t.fields) {
    box(patch.rect).fill(CROP_COLORS[patch.crop])
    const { x1, y1, x2, y2 } = patch.rect
    const step = 0.08
    if (patch.rows === 'vertical') {
      for (let x = x1 + step / 2; x < x2; x += step) g.moveTo(x * s, y1 * s).lineTo(x * s, y2 * s)
    } else {
      for (let y = y1 + step / 2; y < y2; y += step) g.moveTo(x1 * s, y * s).lineTo(x2 * s, y * s)
    }
    g.stroke({ width: Math.max(1, s * 0.012), color: shade(CROP_COLORS[patch.crop], 0.8) })
    box(patch.rect).stroke({ width: Math.max(1, s * 0.04), color: HEDGE })
  }

  for (const cliff of t.cliffs) box(cliff).fill(ROCK)
  for (const face of t.cliffFaces) box(face).fill(ROCK_FACE)
  for (const boulder of t.boulders) drawBoulder(g, s, boulder)
  for (const shadow of t.cliffShadows) box(shadow).fill({ color: 0x000000, alpha: 0.3 })
}

/** Irregular rock seen from above, with a shadow down-right and a lit top-left facet. */
function drawBoulder(g: Graphics, s: number, rock: Rock) {
  let n = rock.seed
  const rand = () => {
    n = (n * 9301 + 49297) % 233280
    return n / 233280
  }
  const radii = Array.from({ length: 7 }, () => rock.r * (0.75 + rand() * 0.3))
  const outlineAt = (scale: number, offset: number) =>
    radii.flatMap((r, i) => {
      const a = (i / radii.length) * Math.PI * 2
      return [(rock.x + offset + Math.cos(a) * r * scale) * s, (rock.y + offset + Math.sin(a) * r * scale) * s]
    })
  g.poly(outlineAt(1, rock.r * 0.25)).fill({ color: 0x000000, alpha: 0.3 })
  g.poly(outlineAt(1, 0)).fill(BOULDER).stroke({ width: Math.max(1, s * 0.012), color: ROCK_FACE })
  g.poly(outlineAt(0.5, -rock.r * 0.2)).fill(shade(BOULDER, 1.2))
}

export function drawRoads(g: Graphics) {
  const roads = sceneRoads()
  const s = cellSize()
  if (!roads.length || !s) return
  const path = () => {
    for (const [a, b] of roads) {
      const from = centre(a)
      const to = centre(b)
      g.moveTo(from.x, from.y).lineTo(to.x, to.y)
    }
  }
  path()
  g.stroke({ width: s * 0.2, color: ROAD_EDGE, cap: 'round' })
  path()
  g.stroke({ width: s * 0.14, color: ROAD, cap: 'round' })
}

export function drawTiles(g: Graphics) {
  if (!sceneSize()) return
  for (const tile of sceneTiles()) {
    const isWall = tile.defId in WALL_STYLES
    const fortified = WALL_JOINING_IDS.has(tile.defId)
    // Wall-joined tiles stay centred so their wall arms meet the neighbours'.
    const c = cellAt(tile.cell, isWall || fortified ? 0 : BUILDING_LIFT)
    if (tile.ruined) drawRubble(g, c, tile.cell)
    else if (isWall) drawWall(g, c, tile)
    else {
      if (fortified) drawWallArms(g, c, tile.links, WALL_STYLES.wall)
      const draw = TILE_DRAWERS[tile.defId] ?? drawGeneric
      draw(g, c, tile)
    }
  }
}

type TileDrawer = (g: Graphics, c: Cell, tile: SceneTile) => void

interface WallStyle {
  thickness: number
  post: number
  fill: number
  edge: number
  stakes?: boolean
  banner?: boolean
}

const WALL_STYLES: Record<string, WallStyle> = {
  wall: { thickness: 0.26, post: 0.36, fill: STONE, edge: 0x5d5d5d },
  bastion: { thickness: 0.36, post: 0.5, fill: 0x8c8577, edge: 0x4e4a42 },
  stockade: { thickness: 0.22, post: 0.3, fill: 0x8b5a2b, edge: 0x5c3a1a, stakes: true },
  lastBastion: { thickness: 0.36, post: 0.5, fill: 0x55555f, edge: 0x2e2e36, banner: true },
}

/** Rect from the cell centre to the edge on `side`, `t` wide. */
function wallArm(side: Direction, t: number): [number, number, number, number] {
  const a = 0.5 - t / 2
  const b = 0.5 + t / 2
  switch (side) {
    case 'north':
      return [a, 0, b, 0.5]
    case 'south':
      return [a, 0.5, b, 1]
    case 'west':
      return [0, a, 0.5, b]
    case 'east':
      return [0.5, a, 1, b]
  }
}

function drawWallArms(g: Graphics, c: Cell, links: Direction[], style: WallStyle) {
  const stroke = { width: Math.max(1, c.s * 0.02), color: style.edge }
  for (const side of links) {
    const [u1, v1, u2, v2] = wallArm(side, style.thickness)
    rect(g, c, u1, v1, u2, v2).fill(style.fill).stroke(stroke)
  }
}

function drawStakes(g: Graphics, c: Cell, from: [number, number], to: [number, number], r: number) {
  const steps = Math.max(1, Math.round(Math.hypot(to[0] - from[0], to[1] - from[1]) / (r * 1.6)))
  for (let i = 0; i <= steps; i++) {
    const u = from[0] + ((to[0] - from[0]) * i) / steps
    const v = from[1] + ((to[1] - from[1]) * i) / steps
    circle(g, c, u, v, r)
  }
}

function drawWall(g: Graphics, c: Cell, tile: SceneTile) {
  const style = WALL_STYLES[tile.defId]
  const stroke = { width: Math.max(1, c.s * 0.02), color: style.edge }
  if (style.stakes) {
    const r = style.thickness / 2
    for (const side of tile.links) {
      const [u1, v1, u2, v2] = wallArm(side, 0)
      drawStakes(g, c, [u1, v1], [u2, v2], r)
    }
    circle(g, c, 0.5, 0.5, style.post / 2)
    g.fill(style.fill).stroke(stroke)
    drawGates(g, c, tile.gates, style.post / 2)
    return
  }

  drawWallArms(g, c, tile.links, style)
  const half = style.post / 2
  rect(g, c, 0.5 - half, 0.5 - half, 0.5 + half, 0.5 + half).fill(style.fill).stroke(stroke)
  // Crenellations on the post.
  const merlon = style.post / 5
  for (const [du, dv] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ]) {
    const u = 0.5 + du * (half - merlon / 2)
    const v = 0.5 + dv * (half - merlon / 2)
    rect(g, c, u - merlon / 2, v - merlon / 2, u + merlon / 2, v + merlon / 2).fill(style.edge)
  }
  if (style.banner) {
    const d = style.post / 4
    poly(g, c, [
      [0.5, 0.5 - d],
      [0.5 + d, 0.5],
      [0.5, 0.5 + d],
      [0.5 - d, 0.5],
    ]).fill(0xc0392b)
  }
}

/** Road passage through the wall post, with open wooden gate leaves at both ends. */
function drawGates(g: Graphics, c: Cell, gates: GateAxis[], half: number) {
  const reach = half + 0.02
  const road = 0.07
  const leaf = 0.035
  for (const axis of gates) {
    // `a..b` along the road, `p..q` across it, both relative to the cell centre.
    const box = (a: number, b: number, p: number, q: number) =>
      axis === 'northSouth'
        ? rect(g, c, 0.5 + p, 0.5 + a, 0.5 + q, 0.5 + b)
        : rect(g, c, 0.5 + a, 0.5 + p, 0.5 + b, 0.5 + q)
    box(-reach, reach, -road - 0.02, road + 0.02).fill(ROAD_EDGE)
    box(-reach, reach, -road, road).fill(ROAD)
    for (const end of [-reach, reach - leaf]) {
      box(end, end + leaf, -road - 0.03, -road + 0.02).fill(0x5c3a1a)
      box(end, end + leaf, road - 0.02, road + 0.03).fill(0x5c3a1a)
    }
  }
}

/** Soft shadow cast down-right, the light comes from the top left. */
function shadow(g: Graphics, c: Cell, u1: number, v1: number, u2: number, v2: number) {
  rect(g, c, u1 + 0.03, v1 + 0.03, u2 + 0.03, v2 + 0.03).fill({ color: 0x000000, alpha: 0.25 })
}

/** Gable roof seen from above: two slopes meeting at a horizontal ridge. */
function gableRoof(g: Graphics, c: Cell, u1: number, v1: number, u2: number, v2: number, color: number) {
  const vm = (v1 + v2) / 2
  shadow(g, c, u1, v1, u2, v2)
  rect(g, c, u1, v1, u2, vm).fill(shade(color, 1.15))
  rect(g, c, u1, vm, u2, v2).fill(shade(color, 0.75))
  g.moveTo(c.x(u1), c.y(vm))
    .lineTo(c.x(u2), c.y(vm))
    .stroke({ width: Math.max(1, c.s * 0.02), color: shade(color, 0.5) })
  rect(g, c, u1, v1, u2, v2).stroke(outline(c))
}

/** Hip roof seen from above: four slopes meeting at a ridge (or a point when square). */
function hipRoof(g: Graphics, c: Cell, u1: number, v1: number, u2: number, v2: number, color: number) {
  const h = Math.min(u2 - u1, v2 - v1) / 2
  const um = (u1 + u2) / 2
  const vm = (v1 + v2) / 2
  const wide = u2 - u1 >= v2 - v1
  const r1: [number, number] = wide ? [u1 + h, vm] : [um, v1 + h]
  const r2: [number, number] = wide ? [u2 - h, vm] : [um, v2 - h]
  const faces: [[number, number][], number][] = [
    [[[u1, v1], [u2, v1], ...(wide ? [r2, r1] : [r1])], 1.15],
    [[[u1, v2], [u1, v1], ...(wide ? [r1] : [r1, r2])], 0.95],
    [[[u2, v1], [u2, v2], ...(wide ? [r2] : [r2, r1])], 0.8],
    [[[u2, v2], [u1, v2], ...(wide ? [r1, r2] : [r2])], 0.7],
  ]
  shadow(g, c, u1, v1, u2, v2)
  const ridge = { width: Math.max(1, c.s * 0.01), color: shade(color, 0.5) }
  for (const [points, light] of faces) poly(g, c, points).fill(shade(color, light)).stroke(ridge)
  rect(g, c, u1, v1, u2, v2).stroke(outline(c))
}

/** Round tower from above: stone ring around a conical roof. */
function roundTower(g: Graphics, c: Cell, u: number, v: number, r: number, roof: number) {
  circle(g, c, u + 0.03, v + 0.03, r).fill({ color: 0x000000, alpha: 0.25 })
  circle(g, c, u, v, r).fill(STONE_DARK).stroke(outline(c))
  cone(g, c, u, v, r * 0.72, roof)
}

/** Conical roof from above: ribs meeting at the tip, lit from the top left. */
function cone(g: Graphics, c: Cell, u: number, v: number, r: number, roof: number) {
  circle(g, c, u, v, r).fill(roof)
  const rays = 8
  for (let i = 0; i < rays; i++) {
    const a = (i / rays) * Math.PI * 2
    g.moveTo(c.x(u), c.y(v)).lineTo(c.x(u + Math.cos(a) * r), c.y(v + Math.sin(a) * r))
  }
  g.stroke({ width: Math.max(1, c.s * 0.01), color: shade(roof, 0.6) })
  g.moveTo(c.x(u), c.y(v))
    .arc(c.x(u), c.y(v), r * c.s, Math.PI, Math.PI * 1.5)
    .closePath()
    .fill({ color: 0xffffff, alpha: 0.15 })
}

/** Small square merlons spread along the edges of a square battlement. */
function squareMerlons(g: Graphics, c: Cell, u1: number, v1: number, u2: number, v2: number) {
  const m = 0.05
  for (const t of [0, 0.5, 1]) {
    for (const [u, v] of [
      [u1 + (u2 - u1) * t, v1],
      [u1 + (u2 - u1) * t, v2],
      [u1, v1 + (v2 - v1) * t],
      [u2, v1 + (v2 - v1) * t],
    ]) {
      const cu = Math.min(Math.max(u, u1 + m / 2), u2 - m / 2)
      const cv = Math.min(Math.max(v, v1 + m / 2), v2 - m / 2)
      rect(g, c, cu - m / 2, cv - m / 2, cu + m / 2, cv + m / 2).fill(STONE).stroke(outline(c))
    }
  }
}

function drawKeep(g: Graphics, c: Cell) {
  const line = outline(c)
  shadow(g, c, 0.16, 0.16, 0.84, 0.84)
  rect(g, c, 0.16, 0.16, 0.84, 0.84).fill(STONE).stroke(line)
  rect(g, c, 0.25, 0.25, 0.75, 0.75).fill(0x6f6a60).stroke(line)
  hipRoof(g, c, 0.35, 0.35, 0.65, 0.65, SLATE)
  circle(g, c, 0.5, 0.5, 0.03).fill(0xd9a441)
  for (const [u, v] of [
    [0.18, 0.18],
    [0.82, 0.18],
    [0.18, 0.82],
    [0.82, 0.82],
  ]) {
    roundTower(g, c, u, v, 0.1, SLATE)
  }
}

function drawHouse(g: Graphics, c: Cell) {
  gableRoof(g, c, 0.3, 0.32, 0.7, 0.62, 0x9b3d2b)
  rect(g, c, 0.58, 0.36, 0.64, 0.42).fill(0x5d5d5d).stroke(outline(c))
}

function drawWatchtower(g: Graphics, c: Cell) {
  const line = outline(c)
  circle(g, c, 0.53, 0.53, 0.25).fill({ color: 0x000000, alpha: 0.25 })
  circle(g, c, 0.5, 0.5, 0.25).fill(STONE_DARK).stroke(line)
  const merlons = 10
  for (let i = 0; i < merlons; i++) {
    const a = (i / merlons) * Math.PI * 2
    const u = 0.5 + Math.cos(a) * 0.215
    const v = 0.5 + Math.sin(a) * 0.215
    rect(g, c, u - 0.025, v - 0.025, u + 0.025, v + 0.025).fill(STONE).stroke(line)
  }
  cone(g, c, 0.5, 0.5, 0.16, 0x3d5f8c)
}

/** Walled compound: the hall on top, a training yard with a target below. */
function drawBarracks(g: Graphics, c: Cell) {
  const line = outline(c)
  shadow(g, c, 0.18, 0.18, 0.82, 0.82)
  rect(g, c, 0.18, 0.18, 0.82, 0.82).fill(STONE).stroke(line)
  rect(g, c, 0.24, 0.24, 0.76, 0.76).fill(0x8a7350).stroke(line)
  hipRoof(g, c, 0.24, 0.24, 0.76, 0.5, 0x7a4a2e)
  circle(g, c, 0.62, 0.64, 0.06).fill(0xd9b86a).stroke(line)
  circle(g, c, 0.62, 0.64, 0.025).fill(0xc0392b)
  rect(g, c, 0.32, 0.6, 0.46, 0.62).fill(0x5c3a1a)
  rect(g, c, 0.32, 0.66, 0.46, 0.68).fill(0x5c3a1a)
}

/** Square tower with a ballista on its platform, aimed north. */
function drawBallista(g: Graphics, c: Cell) {
  const line = outline(c)
  const wood = 0x7a5a3a
  shadow(g, c, 0.24, 0.24, 0.76, 0.76)
  rect(g, c, 0.24, 0.24, 0.76, 0.76).fill(STONE_DARK).stroke(line)
  rect(g, c, 0.3, 0.3, 0.7, 0.7).fill(0x9c7f52).stroke(line)
  squareMerlons(g, c, 0.24, 0.24, 0.76, 0.76)
  const thick = Math.max(1, c.s * 0.025)
  // Bow, string drawn back to the trigger, then the stock and bolt.
  const bowEnd = (a: number) => [0.5 + Math.cos(a) * 0.17, 0.52 + Math.sin(a) * 0.17]
  const [lu, lv] = bowEnd(Math.PI * 1.15)
  const [ru, rv] = bowEnd(Math.PI * 1.85)
  g.moveTo(c.x(lu), c.y(lv))
    .arc(c.x(0.5), c.y(0.52), 0.17 * c.s, Math.PI * 1.15, Math.PI * 1.85)
    .stroke({ width: thick, color: wood })
  g.moveTo(c.x(lu), c.y(lv))
    .lineTo(c.x(0.5), c.y(0.58))
    .lineTo(c.x(ru), c.y(rv))
    .stroke({ width: Math.max(1, c.s * 0.008), color: 0xe8dcc0 })
  rect(g, c, 0.475, 0.36, 0.525, 0.64).fill(wood).stroke(line)
  g.moveTo(c.x(0.5), c.y(0.58))
    .lineTo(c.x(0.5), c.y(0.31))
    .stroke({ width: Math.max(1, c.s * 0.012), color: 0x3b3b3b })
}

function drawCaravan(g: Graphics, c: Cell) {
  const line = outline(c)
  shadow(g, c, 0.28, 0.34, 0.7, 0.58)
  for (const u of [0.33, 0.6]) {
    rect(g, c, u - 0.04, 0.31, u + 0.04, 0.35).fill(0x3b2a1a)
    rect(g, c, u - 0.04, 0.57, u + 0.04, 0.61).fill(0x3b2a1a)
  }
  g.moveTo(c.x(0.68), c.y(0.42))
    .lineTo(c.x(0.82), c.y(0.42))
    .moveTo(c.x(0.68), c.y(0.5))
    .lineTo(c.x(0.82), c.y(0.5))
    .stroke({ width: Math.max(1, c.s * 0.02), color: 0x5c3a1a })
  g.roundRect(c.x(0.27), c.y(0.34), c.s * 0.42, c.s * 0.24, c.s * 0.08)
    .fill(0xe8dcc0)
    .stroke(line)
  for (const u of [0.37, 0.48, 0.59]) {
    g.moveTo(c.x(u), c.y(0.35)).lineTo(c.x(u), c.y(0.57))
  }
  g.stroke({ width: Math.max(1, c.s * 0.012), color: 0xb5a684 })
}

function roofColor(defId: string): number {
  let hash = 0
  for (const ch of defId) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return ROOF_COLORS[hash % ROOF_COLORS.length]
}

function drawGeneric(g: Graphics, c: Cell, tile: SceneTile) {
  hipRoof(g, c, 0.28, 0.3, 0.72, 0.62, roofColor(tile.defId))
}

function drawRubble(g: Graphics, c: Cell, seed: number) {
  let n = seed * 9301 + 49297
  const rand = () => {
    n = (n * 9301 + 49297) % 233280
    return n / 233280
  }
  for (let i = 0; i < 7; i++) {
    const u = 0.25 + rand() * 0.5
    const v = 0.35 + rand() * 0.4
    const r = 0.04 + rand() * 0.06
    circle(g, c, u, v, r).fill(i % 2 ? 0x6b6b6b : 0x585858)
  }
}

const TILE_DRAWERS: Record<string, TileDrawer> = {
  keep: drawKeep,
  house: drawHouse,
  watchtower: drawWatchtower,
  barracks: drawBarracks,
  ballista: drawBallista,
  refugeeCaravan: drawCaravan,
}
