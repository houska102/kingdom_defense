import type { GameState, Tile, TileDef, Unit, UnitDef } from './types'

export function nextId(state: Pick<GameState, 'nextId'>, prefix: string): string {
  return `${prefix}-${state.nextId++}`
}

export function createTile(state: Pick<GameState, 'nextId'>, def: TileDef, cell: number): Tile {
  return { id: nextId(state, 'tile'), def, cell, health: def.health, bonusDefense: 0 }
}

export function createUnit(state: Pick<GameState, 'nextId'>, def: UnitDef): Unit {
  return { id: nextId(state, 'unit'), def, health: def.health, endurance: def.endurance }
}

export function tileDefense(tile: Tile): number {
  return tile.def.defense + tile.bonusDefense
}

export function isAdjacent(a: number, b: number, gridSize: number): boolean {
  const ax = a % gridSize
  const ay = Math.floor(a / gridSize)
  const bx = b % gridSize
  const by = Math.floor(b / gridSize)
  return Math.abs(ax - bx) + Math.abs(ay - by) === 1
}
