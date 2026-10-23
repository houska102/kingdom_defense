import type { CityConfig, Direction, TileDef, UnitDef } from './types'

/** City grid size for each third of the campaign. */
export const GRID_SIZES = [4, 5, 6]
/** Every city is attacked from this side. Set to null to roll a random side per city. */
export const FIXED_ATTACK_DIRECTION: Direction | null = 'north'
export const MIN_GARRISON_PICKS = 3
/** Share of the garrison pool that can be picked for a city. */
export const GARRISON_PICK_RATIO = 3 / 5
export const CAMPAIGN_LENGTH = 10

export const TILE_DEFS: Record<string, TileDef> = {
  keep: {
    id: 'keep',
    name: 'Keep',
    defense: 3,
    health: 10,
    essential: true,
    description: 'Heart of the city. If it falls, the city falls.',
  },
  wall: {
    id: 'wall',
    name: 'Wall',
    defense: 3,
    health: 6,
    description: 'Sturdy and hard to break through.',
  },
  house: {
    id: 'house',
    name: 'House',
    defense: 0,
    health: 4,
    description: 'Cheap filler that soaks up attacks.',
  },
  watchtower: {
    id: 'watchtower',
    name: 'Watchtower',
    defense: 1,
    health: 4,
    passive: { kind: 'adjacentAttackReduction', amount: 1 },
    description: 'Attacks on adjacent tiles are 1 weaker.',
  },
  barracks: {
    id: 'barracks',
    name: 'Barracks',
    defense: 2,
    health: 5,
    passive: { kind: 'garrisonRegen', amount: 1 },
    description: 'While standing, all garrison regains +1 endurance per turn.',
  },
}

export const DEFAULT_PALETTE: Record<string, number> = {
  keep: 1,
  wall: 3,
  house: 4,
  watchtower: 2,
  barracks: 1,
}

export const UNIT_DEFS: Record<string, UnitDef> = {
  militia: {
    id: 'militia',
    name: 'Militia',
    strength: 2,
    health: 3,
    endurance: 2,
    description: 'Cheap and plentiful.',
  },
  spearmen: {
    id: 'spearmen',
    name: 'Spearmen',
    strength: 3,
    health: 3,
    endurance: 3,
    description: 'Reliable line infantry.',
  },
  knights: {
    id: 'knights',
    name: 'Knights',
    strength: 4,
    health: 5,
    endurance: 2,
    description: 'Hit hard, tire quickly.',
  },
  archers: {
    id: 'archers',
    name: 'Archers',
    strength: 2,
    health: 2,
    endurance: 2,
    passive: { kind: 'attackReduction', amount: 1 },
    description: 'The attack they defend is 1 weaker.',
  },
  veterans: {
    id: 'veterans',
    name: 'Veterans',
    strength: 3,
    health: 4,
    endurance: 3,
    passive: { kind: 'enduranceRegen', amount: 1 },
    description: 'Regain +1 endurance after fighting.',
  },
}

export const UNLOCKABLE_TILES: TileDef[] = [
  {
    id: 'bastion',
    name: 'Bastion',
    defense: 4,
    health: 8,
    description: 'A fortified wall section.',
  },
  {
    id: 'infirmary',
    name: 'Infirmary',
    defense: 1,
    health: 4,
    unique: true,
    passive: { kind: 'garrisonHeal', amount: 1 },
    description: 'While standing, all garrison heals 1 health per turn.',
  },
  {
    id: 'stockade',
    name: 'Stockade',
    defense: 2,
    health: 7,
    description: 'Thick timber walls that take a beating.',
  },
  {
    id: 'ballista',
    name: 'Ballista Tower',
    defense: 1,
    health: 5,
    passive: { kind: 'adjacentAttackReduction', amount: 2 },
    description: 'Attacks on adjacent tiles are 2 weaker.',
  },
  {
    id: 'militiaCenter',
    name: 'Militia Center',
    defense: 2,
    health: 4,
    unique: true,
    passive: { kind: 'recruitPerTile', perTileDefId: 'house', unitDefId: 'militia' },
    description: 'When the defense starts, adds 1 Militia to the garrison for each House.',
  },
]

export const UNLOCKABLE_UNITS: UnitDef[] = [
  {
    id: 'crossbowmen',
    name: 'Crossbowmen',
    strength: 3,
    health: 2,
    endurance: 2,
    passive: { kind: 'attackReduction', amount: 2 },
    description: 'The attack they defend is 2 weaker.',
  },
  {
    id: 'paladins',
    name: 'Paladins',
    strength: 5,
    health: 6,
    endurance: 3,
    description: 'Elite heavy defenders.',
  },
  {
    id: 'longbowmen',
    name: 'Longbowmen',
    strength: 2,
    health: 3,
    endurance: 3,
    passive: { kind: 'attackReduction', amount: 1 },
    description: 'The attack they defend is 1 weaker. Hardier than archers.',
  },
  {
    id: 'wardens',
    name: 'Wardens',
    strength: 3,
    health: 5,
    endurance: 2,
    passive: { kind: 'enduranceRegen', amount: 1 },
    description: 'Regain +1 endurance after fighting.',
  },
]

export const ALL_TILE_DEFS: Record<string, TileDef> = {
  ...TILE_DEFS,
  ...Object.fromEntries(UNLOCKABLE_TILES.map((t) => [t.id, t])),
}

export const ALL_UNIT_DEFS: Record<string, UnitDef> = {
  ...UNIT_DEFS,
  ...Object.fromEntries(UNLOCKABLE_UNITS.map((u) => [u.id, u])),
}

/** One entry per city in campaign order. Prebuilt tiles are leftovers from earlier fighting. */
export const CITY_CONFIGS: CityConfig[] = [
  // 4x4
  { name: 'Ashford', attackBonus: 0, prebuilt: [] },
  { name: 'Brightwater', attackBonus: 0.5, prebuilt: [] },
  { name: 'Coldharbour', attackBonus: 1, prebuilt: [{ defId: 'house', x: 1, y: 1, health: 2 }] },
  {
    name: 'Dunmere',
    attackBonus: 1.5,
    prebuilt: [
      { defId: 'wall', x: 0, y: 0 },
      { defId: 'house', x: 3, y: 3, health: 2 },
    ],
  },
  // 5x5
  {
    name: 'Eastmarch',
    attackBonus: 2,
    prebuilt: [
      { defId: 'wall', x: 0, y: 0 },
      { defId: 'wall', x: 4, y: 0 },
      { defId: 'house', x: 2, y: 2, health: 3 },
    ],
  },
  {
    name: 'Fallowmoor',
    attackBonus: 2.5,
    prebuilt: [
      { defId: 'wall', x: 0, y: 0, health: 4 },
      { defId: 'house', x: 2, y: 1 },
      { defId: 'house', x: 1, y: 3, health: 2 },
    ],
  },
  {
    name: 'Greyhaven',
    attackBonus: 3,
    prebuilt: [
      { defId: 'house', x: 1, y: 1, health: 1 },
      { defId: 'house', x: 3, y: 1, health: 2 },
      { defId: 'house', x: 1, y: 3 },
      { defId: 'wall', x: 4, y: 4, health: 3 },
    ],
  },
  // 6x6
  {
    name: 'Highcrag',
    attackBonus: 3.5,
    prebuilt: [
      { defId: 'wall', x: 2, y: 0, health: 4 },
      { defId: 'wall', x: 3, y: 0, health: 4 },
      { defId: 'house', x: 1, y: 5, health: 2 },
      { defId: 'house', x: 4, y: 5, health: 2 },
    ],
  },
  {
    name: 'Ironvale',
    attackBonus: 4,
    prebuilt: [
      { defId: 'house', x: 0, y: 0, health: 2 },
      { defId: 'house', x: 5, y: 0, health: 2 },
      { defId: 'house', x: 0, y: 5, health: 2 },
      { defId: 'house', x: 5, y: 5, health: 2 },
      { defId: 'watchtower', x: 2, y: 2, health: 2 },
    ],
  },
  {
    name: 'Kingsreach',
    attackBonus: 4.5,
    prebuilt: [
      { defId: 'wall', x: 2, y: 2, health: 3 },
      { defId: 'wall', x: 3, y: 3, health: 3 },
      { defId: 'house', x: 0, y: 0, health: 1 },
      { defId: 'house', x: 5, y: 0, health: 2 },
      { defId: 'house', x: 5, y: 5, health: 1 },
    ],
  },
]
