import { garrisonPool, isLastCity } from './campaign'
import { UNLOCKABLE_TILES, UNLOCKABLE_UNITS } from './data'
import { createUnit, maxEndurance, nextId, passiveTotal } from './entities'
import type { Rng } from './rng'
import type { Card, GameState, Tile, TileDef, UnitDef } from './types'

export type DraftState = Pick<
  GameState,
  'nextId' | 'cityIndex' | 'tileUnlocks' | 'unitUnlocks' | 'unlocks'
>

interface CardTemplate {
  nextCity: boolean
  available?: (state: DraftState) => boolean
  make: (state: DraftState, rng: Rng) => Card
}

/** Unlockable units not yet unlocked in the campaign or picked in this city. */
function lockedUnits(state: DraftState): UnitDef[] {
  const taken = new Set([
    ...state.unitUnlocks,
    ...state.unlocks.flatMap((c) => (c.effect.kind === 'unlockUnit' ? [c.effect.unit.id] : [])),
  ])
  return UNLOCKABLE_UNITS.filter((u) => !taken.has(u.id))
}

/** Unlockable tiles, minus unique ones already unlocked in the campaign or picked in this city. */
function offerableTiles(state: DraftState): TileDef[] {
  const taken = new Set([
    ...Object.keys(state.tileUnlocks).filter((id) => state.tileUnlocks[id] > 0),
    ...state.unlocks.flatMap((c) => (c.effect.kind === 'unlockTile' ? [c.effect.tile.id] : [])),
  ])
  return UNLOCKABLE_TILES.filter((t) => !(t.unique && taken.has(t.id)))
}

const TEMPLATES: CardTemplate[] = [
  {
    nextCity: false,
    make: (state) => ({
      id: nextId(state, 'card'),
      name: 'Repair',
      description: 'Restore 4 health to a tile.',
      target: 'tile',
      effect: { kind: 'repairTile', amount: 4 },
      nextCity: false,
    }),
  },
  {
    nextCity: false,
    make: (state) => ({
      id: nextId(state, 'card'),
      name: 'Fortify',
      description: 'A tile permanently gets +1 defense.',
      target: 'tile',
      effect: { kind: 'fortifyTile', amount: 1 },
      nextCity: false,
    }),
  },
  {
    nextCity: false,
    make: (state) => ({
      id: nextId(state, 'card'),
      name: 'Rest',
      description: 'A unit regains full endurance and 1 health.',
      target: 'unit',
      effect: { kind: 'restUnit', heal: 1 },
      nextCity: false,
    }),
  },
  {
    nextCity: false,
    make: (state, rng) => {
      const unit = rng.pick(garrisonPool(state.unitUnlocks))
      return {
        id: nextId(state, 'card'),
        name: `Recruit ${unit.name}`,
        description: `Add ${unit.name} to your garrison.`,
        target: null,
        effect: { kind: 'recruitUnit', unit },
        nextCity: false,
      }
    },
  },
  {
    nextCity: false,
    make: (state, rng) => {
      const amount = rng.int(1, 3)
      return {
        id: nextId(state, 'card'),
        name: `Tribute (${amount} gold)`,
        description: `Gain ${amount} gold.`,
        target: null,
        effect: { kind: 'gainGold', amount },
        nextCity: false,
      }
    },
  },
  {
    nextCity: true,
    available: (state) => offerableTiles(state).length > 0,
    make: (state, rng) => {
      const tile = rng.pick(offerableTiles(state))
      return {
        id: nextId(state, 'card'),
        name: `Plans: ${tile.name}`,
        description: `+1 ${tile.name} for every later city. ${tile.description}`,
        target: null,
        effect: { kind: 'unlockTile', tile },
        nextCity: true,
      }
    },
  },
  {
    nextCity: true,
    available: (state) => lockedUnits(state).length > 0,
    make: (state, rng) => {
      const unit = rng.pick(lockedUnits(state))
      return {
        id: nextId(state, 'card'),
        name: `Train ${unit.name}`,
        description: `Unlock ${unit.name} for every later city. ${unit.description}`,
        target: null,
        effect: { kind: 'unlockUnit', unit },
        nextCity: true,
      }
    },
  },
]

export const DRAFT_SIZE = 3

/** Cards offered per draft, raised by `draftBonus` passives of standing tiles. */
export function draftSize(tiles: Tile[]): number {
  return DRAFT_SIZE + passiveTotal(tiles, 'draftBonus')
}

export function rollDraft(state: DraftState, rng: Rng, size = DRAFT_SIZE): Card[] {
  const lastCity = isLastCity(state.cityIndex)
  const templates = TEMPLATES.filter(
    (t) => !(t.nextCity && lastCity) && (t.available?.(state) ?? true),
  )
  return rng
    .shuffle(templates)
    .slice(0, size)
    .map((template) => template.make(state, rng))
}

/** Applies a card to the state. Returns false if the target is missing or invalid. */
export function applyCard(state: GameState, card: Card, targetId?: string): boolean {
  const effect = card.effect
  switch (effect.kind) {
    case 'repairTile':
    case 'fortifyTile': {
      const tile = state.tiles.find((t) => t.id === targetId && t.health > 0)
      if (!tile) return false
      if (effect.kind === 'repairTile') {
        tile.health = Math.min(tile.def.health, tile.health + effect.amount)
      } else {
        tile.bonusDefense += effect.amount
      }
      return true
    }
    case 'restUnit': {
      const unit = state.units.find((u) => u.id === targetId && u.health > 0)
      if (!unit) return false
      unit.endurance = maxEndurance(unit, state.fallenUnits)
      unit.health = Math.min(unit.def.health, unit.health + effect.heal)
      return true
    }
    case 'recruitUnit':
      state.units.push(createUnit(state, effect.unit))
      return true
    case 'gainGold':
      state.gold += effect.amount
      return true
    case 'unlockTile':
    case 'unlockUnit':
      state.unlocks.push(card)
      return true
  }
}
