export type TilePassive =
  | { kind: 'adjacentAttackReduction'; amount: number }
  | { kind: 'garrisonRegen'; amount: number }
  /** While standing, every living unit regains `amount` health at the end of each turn. */
  | { kind: 'garrisonHeal'; amount: number }
  /** At the start of the defense, adds one `unitDefId` per standing tile of `perTileDefId`. */
  | { kind: 'recruitPerTile'; perTileDefId: string; unitDefId: string }
  /** Raises the chance that a triggered event is good by `amount` (0.1 = +10%). */
  | { kind: 'goodEventBonus'; amount: number }
  /** Can't be attacked while another standing tile shares its lane. */
  | { kind: 'laneAnchor' }
  /** Grants `amount` gold at the end of each turn. */
  | { kind: 'goldIncome'; amount: number }
  /** While standing, a random unit (locked ones included) can be hired for `cost` gold. */
  | { kind: 'mercenaryHire'; cost: number }
  /** While standing, the card draft offers `amount` extra cards. */
  | { kind: 'draftBonus'; amount: number }

export type TilePassiveKind = TilePassive['kind']
/** Passive kinds that carry a numeric `amount`. */
export type AmountPassiveKind = Extract<TilePassive, { amount: number }>['kind']

export type UnitPassive =
  | { kind: 'attackReduction'; amount: number }
  | { kind: 'enduranceRegen'; amount: number }

export interface TileDef {
  id: string
  name: string
  defense: number
  health: number
  description: string
  passives?: TilePassive[]
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
  /** Column and row on the city's grid, see `gridSizeFor`. */
  x: number
  y: number
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
  /** Targets a tile behind the front line, so it hits at reduced strength. */
  deep?: boolean
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
  /** Campaign-wide treasury, carried between cities. */
  gold: number
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
