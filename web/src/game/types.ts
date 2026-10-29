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
  /** Stores `amount` gold for every turn the tile survives. */
  | { kind: 'goldHoard'; amount: number }
  /** Can be sent away during the assign phase, taking its hoard to the next city. */
  | { kind: 'escape' }

export type TilePassiveKind = TilePassive['kind']
/** Passive kinds that carry a numeric `amount`. */
export type AmountPassiveKind = Extract<TilePassive, { amount: number }>['kind']

export type UnitPassive =
  | { kind: 'attackReduction'; amount: number }
  | { kind: 'enduranceRegen'; amount: number }
  /** +`amount` strength for each other unit of the same type defending the same attack. */
  | { kind: 'spearWall'; amount: number }
  /** Raises the chance that an event on the unit's attack is good by `amount` (0.15 = +15%). */
  | { kind: 'inspiring'; amount: number }
  /** +`amount` strength while the unit is at 1 health. */
  | { kind: 'lastStand'; amount: number }
  /**
   * Doesn't use a garrison pick, can only be picked with at least `upkeep` gold.
   * Costs `upkeep` gold at the end of each turn and leaves when it can't be paid.
   */
  | { kind: 'paidBlade'; upkeep: number }
  /** +`amount` strength when the defended tile is exposed from more than one side. */
  | { kind: 'flanker'; amount: number }
  /** +`amount` strength for each unit that died in the current city. */
  | { kind: 'bloodlust'; amount: number }
  /** +`amount` strength to every other unit defending the same attack. */
  | { kind: 'banner'; amount: number }

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
  /** Gold stored by `goldHoard` passives. */
  hoard?: number
  /** Ordered to escape while attacked, leaves at the end of the turn if it takes no damage. */
  escaping?: boolean
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
  | { kind: 'gainGold'; amount: number }
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

export type BattleEffect =
  /** Added to every attack of the battle. */
  | { kind: 'attackBonus'; amount: number }
  /** Added to every tile's defense (floored at 0). */
  | { kind: 'tileDefense'; amount: number }
  /** Extra attacks every turn. */
  | { kind: 'extraAttacks'; amount: number }
  | { kind: 'garrisonPicks'; amount: number }
  /** Gold granted when the defense starts. */
  | { kind: 'gold'; amount: number }
  /** Added to the chance that a per-attack event is good (0.1 = +10%). */
  | { kind: 'goodEventChance'; amount: number }
  | { kind: 'draftSize'; amount: number }
  /** Random units (locked ones included) added when the defense starts. */
  | { kind: 'recruits'; amount: number }
  /** Health every unit loses when the defense starts (never below 1). */
  | { kind: 'unitHealthLoss'; amount: number }
  /** `count` random tiles lose `amount` health when the defense starts (never below 1). */
  | { kind: 'tileDamage'; amount: number; count: number }

export type BattleEffectKind = BattleEffect['kind']

export interface BattleEvent {
  id: string
  title: string
  text: string
  good: boolean
  effect: BattleEffect
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
  /** Rolled when the city is created, affect the whole defense of the city. */
  battleEvents: BattleEvent[]
  /** Battle events already shown in the setup modal. */
  battleEventIndex: number
  pendingEvents: TriggeredEvent[]
  eventIndex: number
  reports: TurnReport[]
  draft: Card[]
  pendingCard: Card | null
  /** Next-city cards picked in the current city. */
  unlocks: Card[]
  fallReason: string | null
  /** Units that died in the current city. */
  fallenUnits: number
  /** Gold carried away by escaped tiles, added to the treasury when the next city starts. */
  escapedGold: number
}
