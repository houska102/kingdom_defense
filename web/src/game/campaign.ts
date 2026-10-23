import { DIRECTIONS } from './attacks'
import {
  ALL_TILE_DEFS,
  ALL_UNIT_DEFS,
  CITY_CONFIGS,
  DEFAULT_PALETTE,
  FIXED_ATTACK_DIRECTION,
  GARRISON_PICK_RATIO,
  GRID_SIZE,
  MIN_GARRISON_PICKS,
  UNIT_DEFS,
} from './data'
import { createTile } from './entities'
import type { Rng } from './rng'
import type { CampaignProgress, Card, CityConfig, GameState, Tile, UnitDef } from './types'

export const cityConfig = (cityIndex: number): CityConfig => CITY_CONFIGS[cityIndex]

export const isLastCity = (cityIndex: number) => cityIndex >= CITY_CONFIGS.length - 1

export function buildPalette(tileUnlocks: Record<string, number>): Record<string, number> {
  const palette = { ...DEFAULT_PALETTE }
  for (const [defId, count] of Object.entries(tileUnlocks)) {
    palette[defId] = (palette[defId] ?? 0) + count
  }
  return palette
}

export function garrisonPool(unitUnlocks: string[]): UnitDef[] {
  return [...Object.values(UNIT_DEFS), ...unitUnlocks.map((id) => ALL_UNIT_DEFS[id])]
}

export function garrisonPicks(poolSize: number): number {
  return Math.max(MIN_GARRISON_PICKS, Math.floor(poolSize * GARRISON_PICK_RATIO))
}

/** Folds next-city cards into the campaign unlocks. Unit and unique tile unlocks never duplicate. */
export function mergeUnlocks(
  progress: Pick<CampaignProgress, 'tileUnlocks' | 'unitUnlocks'>,
  cards: Card[],
): Pick<CampaignProgress, 'tileUnlocks' | 'unitUnlocks'> {
  const tileUnlocks = { ...progress.tileUnlocks }
  const unitUnlocks = [...progress.unitUnlocks]
  for (const card of cards) {
    if (card.effect.kind === 'unlockTile') {
      const { id, unique } = card.effect.tile
      tileUnlocks[id] = unique ? 1 : (tileUnlocks[id] ?? 0) + 1
    } else if (card.effect.kind === 'unlockUnit' && !unitUnlocks.includes(card.effect.unit.id)) {
      unitUnlocks.push(card.effect.unit.id)
    }
  }
  return { tileUnlocks, unitUnlocks }
}

/** Extra units granted by `recruitPerTile` passives of standing tiles at the start of the defense. */
export function bonusRecruits(tiles: Tile[]): UnitDef[] {
  const standing = tiles.filter((t) => t.health > 0)
  return standing.flatMap((tile) => {
    const passive = tile.def.passive
    if (passive?.kind !== 'recruitPerTile') return []
    const count = standing.filter((t) => t.def.id === passive.perTileDefId).length
    return Array.from({ length: count }, () => ALL_UNIT_DEFS[passive.unitDefId])
  })
}

/** Fresh state for the city at `progress.cityIndex`, keeping campaign progress. */
export function createCity(progress: CampaignProgress, nextId: number, rng: Rng): GameState {
  const config = cityConfig(progress.cityIndex)
  const state: GameState = {
    ...progress,
    phase: 'setup',
    turn: 0,
    gridSize: GRID_SIZE,
    attackDirection: FIXED_ATTACK_DIRECTION ?? rng.pick(DIRECTIONS),
    nextId,
    tiles: [],
    palette: buildPalette(progress.tileUnlocks),
    selectedTileDefId: null,
    pickedUnitDefIds: [],
    units: [],
    attacks: [],
    assignments: {},
    selectedUnitId: null,
    pendingEvents: [],
    eventIndex: 0,
    reports: [],
    draft: [],
    pendingCard: null,
    unlocks: [],
    fallReason: null,
  }
  for (const p of config.prebuilt) {
    const tile = createTile(state, ALL_TILE_DEFS[p.defId], p.cell)
    tile.health = p.health ?? tile.def.health
    tile.prebuilt = true
    state.tiles.push(tile)
  }
  return state
}

export function newCampaign(rng: Rng): GameState {
  return createCity({ cityIndex: 0, cityResults: [], tileUnlocks: {}, unitUnlocks: [] }, 0, rng)
}
