export type TilePassive =
  | { kind: 'adjacentAttackReduction'; amount: number }
  | { kind: 'garrisonRegen'; amount: number }
  /** At the start of the defense, adds one `unitDefId` per standing tile of `perTileDefId`. */
  | { kind: 'recruitPerTile'; perTileDefId: string; unitDefId: string }

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
  /** Can be unlocked at most once per campaign. */
  unique?: boolean
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
  /** Placed by the city config, cannot be removed during setup. */
  prebuilt?: boolean
}

export interface PrebuiltTile {
  defId: string
  cell: number
  /** Starting health, defaults to the def's full health. */
  health?: number
}

export interface CityConfig {
  name: string
  /** Flat strength added to every attack in this city. */
  attackBonus: number
  prebuilt: PrebuiltTile[]
}

export interface CityResult {
  name: string
  turns: number
  fallReason: string
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
  /** Next-city cards are recorded in unlocks and applied when the city falls. */
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

export type Phase = 'setup' | 'assign' | 'event' | 'draft' | 'cityFallen' | 'campaignOver'

export interface TurnReport {
  turn: number
  lines: string[]
}

export interface CampaignProgress {
  /** 0-based index into CITY_CONFIGS. */
  cityIndex: number
  cityResults: CityResult[]
  /** tileDefId -> extra copies added to every city's palette. */
  tileUnlocks: Record<string, number>
  /** Unit def ids added to the garrison pool. */
  unitUnlocks: string[]
}

export interface GameState extends CampaignProgress {
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
  /** Next-city cards picked in the current city. */
  unlocks: Card[]
  fallReason: string | null
}
