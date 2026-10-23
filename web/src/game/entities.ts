import type {
  AmountPassiveKind,
  GameState,
  Tile,
  TileDef,
  TilePassive,
  TilePassiveKind,
  Unit,
  UnitDef,
  UnitPassive,
} from './types'

export function nextId(state: Pick<GameState, 'nextId'>, prefix: string): string {
  return `${prefix}-${state.nextId++}`
}

export function createTile(state: Pick<GameState, 'nextId'>, def: TileDef, cell: number): Tile {
  return { id: nextId(state, 'tile'), def, cell, health: def.health, bonusDefense: 0 }
}

export function createUnit(state: Pick<GameState, 'nextId'>, def: UnitDef): Unit {
  return { id: nextId(state, 'unit'), def, health: def.health, endurance: def.endurance }
}

/** Passives of `kind` on a tile, typed to that kind. */
export function tilePassives<K extends TilePassiveKind>(
  tile: Tile,
  kind: K,
): Extract<TilePassive, { kind: K }>[] {
  return (tile.def.passives ?? []).filter(
    (p): p is Extract<TilePassive, { kind: K }> => p.kind === kind,
  )
}

export const hasPassive = (tile: Tile, kind: TilePassiveKind) => tilePassives(tile, kind).length > 0

/** Sum of `amount` across passives of `kind` on standing tiles. */
export function passiveTotal(tiles: Tile[], kind: AmountPassiveKind): number {
  return tiles
    .filter((t) => t.health > 0)
    .flatMap((t) => tilePassives(t, kind))
    .reduce((sum, p) => sum + p.amount, 0)
}

/** Short label for a unit's passive, e.g. "Attack -1 when defending". */
export function describeUnitPassive(passive: UnitPassive): string {
  switch (passive.kind) {
    case 'attackReduction':
      return `Enemy attack -${passive.amount} when defending`
    case 'enduranceRegen':
      return `+${passive.amount} endurance after fighting`
  }
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
