import type { TileDef, UnitDef } from './types'

export const GRID_SIZE = 4
export const GARRISON_PICKS = 3

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
    passive: { kind: 'garrisonRegen', amount: 1 },
    description: 'While standing, all garrison regains +1 endurance per turn.',
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
]
