export type TilePassive =
  | { kind: 'adjacentAttackReduction'; amount: number }
  | { kind: 'garrisonRegen'; amount: number }

export type UnitPassive =
  | { kind: 'attackReduction'; amount: number }
  | { kind: 'enduranceRegen'; amount: number }

export interface TileDef {
  id: string
  name: string
  defense: number
  health: number
  description: string
  passive?: TilePassive
  /** The city falls when a tile of this type is destroyed. */
  essential?: boolean
}

export interface UnitDef {
  id: string
  name: string
  strength: number
  health: number
  endurance: number
  description: string
  passive?: UnitPassive
}

export interface Tile {
  id: string
  def: TileDef
  cell: number
  health: number
  bonusDefense: number
}

export interface Unit {
  id: string
  def: UnitDef
  health: number
  endurance: number
}

export interface Attack {
  id: string
  tileId: string
  strength: number
  /** How many extra attacks were merged into this one because there were not enough tiles. */
  merged: number
}

export type CardTarget = 'tile' | 'unit' | null

export type CardEffect =
  | { kind: 'repairTile'; amount: number }
  | { kind: 'fortifyTile'; amount: number }
  | { kind: 'restUnit'; heal: number }
  | { kind: 'recruitUnit'; unit: UnitDef }
  | { kind: 'unlockTile'; tile: TileDef }
  | { kind: 'unlockUnit'; unit: UnitDef }

export interface Card {
  id: string
  name: string
  description: string
  target: CardTarget
  effect: CardEffect
  /** Next-city cards are only recorded in unlocks for now. */
  nextCity: boolean
}

export type Direction = 'north' | 'east' | 'south' | 'west'

export type EventEffect =
  | { kind: 'attackDelta'; amount: number }
  | { kind: 'attackMultiplier'; factor: number }
  | { kind: 'defenseDelta'; amount: number }
  | { kind: 'ignoreDefense' }
  | { kind: 'strengthDelta'; amount: number }

export interface GameEvent {
  id: string
  title: string
  text: string
  good: boolean
  effect: EventEffect
}

export interface TriggeredEvent {
  attackId: string
  event: GameEvent
}

export type Phase = 'setup' | 'assign' | 'event' | 'draft' | 'gameover'

export interface TurnReport {
  turn: number
  lines: string[]
}

export interface GameState {
  phase: Phase
  turn: number
  gridSize: number
  attackDirection: Direction
  nextId: number
  tiles: Tile[]
  /** Remaining count of each tile def that can still be placed during setup. */
  palette: Record<string, number>
  selectedTileDefId: string | null
  pickedUnitDefIds: string[]
  units: Unit[]
  attacks: Attack[]
  /** attackId -> unitIds */
  assignments: Record<string, string[]>
  selectedUnitId: string | null
  pendingEvents: TriggeredEvent[]
  eventIndex: number
  reports: TurnReport[]
  draft: Card[]
  pendingCard: Card | null
  unlocks: Card[]
  fallReason: string | null
}
