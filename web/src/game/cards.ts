import { UNIT_DEFS, UNLOCKABLE_TILES, UNLOCKABLE_UNITS } from './data'
import { createUnit, nextId } from './entities'
import type { Rng } from './rng'
import type { Card, GameState } from './types'

type CardTemplate = (state: Pick<GameState, 'nextId'>, rng: Rng) => Card

const TEMPLATES: CardTemplate[] = [
  (state) => ({
    id: nextId(state, 'card'),
    name: 'Repair',
    description: 'Restore 4 health to a tile.',
    target: 'tile',
    effect: { kind: 'repairTile', amount: 4 },
    nextCity: false,
  }),
  (state) => ({
    id: nextId(state, 'card'),
    name: 'Fortify',
    description: 'A tile gets +1 defense next turn.',
    target: 'tile',
    effect: { kind: 'fortifyTile', amount: 1 },
    nextCity: false,
  }),
  (state) => ({
    id: nextId(state, 'card'),
    name: 'Rest',
    description: 'A unit regains full endurance and 1 health.',
    target: 'unit',
    effect: { kind: 'restUnit', heal: 1 },
    nextCity: false,
  }),
  (state, rng) => {
    const unit = rng.pick(Object.values(UNIT_DEFS))
    return {
      id: nextId(state, 'card'),
      name: `Recruit ${unit.name}`,
      description: `Add ${unit.name} to your garrison.`,
      target: null,
      effect: { kind: 'recruitUnit', unit },
      nextCity: false,
    }
  },
  (state, rng) => {
    const tile = rng.pick(UNLOCKABLE_TILES)
    return {
      id: nextId(state, 'card'),
      name: `Plans: ${tile.name}`,
      description: `Unlock ${tile.name} for the next city. ${tile.description}`,
      target: null,
      effect: { kind: 'unlockTile', tile },
      nextCity: true,
    }
  },
  (state, rng) => {
    const unit = rng.pick(UNLOCKABLE_UNITS)
    return {
      id: nextId(state, 'card'),
      name: `Train ${unit.name}`,
      description: `Unlock ${unit.name} for the next city. ${unit.description}`,
      target: null,
      effect: { kind: 'unlockUnit', unit },
      nextCity: true,
    }
  },
]

export function rollDraft(state: Pick<GameState, 'nextId'>, rng: Rng, size = 3): Card[] {
  return rng
    .shuffle(TEMPLATES)
    .slice(0, size)
    .map((template) => template(state, rng))
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
      unit.endurance = unit.def.endurance
      unit.health = Math.min(unit.def.health, unit.health + effect.heal)
      return true
    }
    case 'recruitUnit':
      state.units.push(createUnit(state, effect.unit))
      return true
    case 'unlockTile':
    case 'unlockUnit':
      state.unlocks.push(card)
      return true
  }
}
