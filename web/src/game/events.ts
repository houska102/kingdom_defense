import type { CombatModifiers } from './combat'
import { passiveTotal } from './entities'
import type { Rng } from './rng'
import type { Attack, GameEvent, Tile, TriggeredEvent, Unit } from './types'

export const EVENT_CHANCE = 0.2
export const GOOD_EVENT_CHANCE = 0.7

export const EVENT_DEFS: GameEvent[] = [
  {
    id: 'siege-ladders',
    title: 'Siege Ladders',
    text: 'Ladders slam against the stone. Dozens more raiders scramble up before the defenders can push them off.',
    good: false,
    effect: { kind: 'attackDelta', amount: 3 },
  },
  {
    id: 'berserker-charge',
    title: 'Berserker Charge',
    text: 'Howling warriors stripped to the waist hurl themselves forward, heedless of their own lives.',
    good: false,
    effect: { kind: 'attackMultiplier', factor: 1.5 },
  },
  {
    id: 'sappers',
    title: 'Sappers',
    text: 'The ground shudders. Enemy diggers have tunneled beneath the foundations, and the walls give way.',
    good: false,
    effect: { kind: 'ignoreDefense' },
  },
  {
    id: 'exhausted-defenders',
    title: 'Exhausted Defenders',
    text: 'Sleepless nights catch up with the garrison. Arms grow heavy and shields drop low.',
    good: false,
    effect: { kind: 'strengthDelta', amount: -1 },
  },
  {
    id: 'boiling-oil',
    title: 'Boiling Oil',
    text: 'A cauldron tips from the parapet. Screams echo below as the first wave melts away.',
    good: true,
    effect: { kind: 'defenseDelta', amount: 2 },
  },
  {
    id: 'commander-slain',
    title: 'Commander Slain',
    text: 'A lucky bolt finds the enemy captain. Without his voice the assault falters into chaos.',
    good: true,
    effect: { kind: 'attackMultiplier', factor: 0.5 },
  },
  {
    id: 'mud-and-rain',
    title: 'Mud and Rain',
    text: 'The skies open. The approach turns to knee-deep mud and the enemy slogs forward at a crawl.',
    good: true,
    effect: { kind: 'attackDelta', amount: -3 },
  },
  {
    id: 'rallying-cry',
    title: 'Rallying Cry',
    text: 'A banner is raised high over the tile. The defenders roar and stand shoulder to shoulder.',
    good: true,
    effect: { kind: 'strengthDelta', amount: 1 },
  },
]

/** Chance that a triggered event is good, raised by `goodEventBonus` passives of standing tiles. */
export function goodEventChance(tiles: Tile[]): number {
  return Math.min(1, GOOD_EVENT_CHANCE + passiveTotal(tiles, 'goodEventBonus'))
}

/** Good event chance added by `inspiring` passives of the units defending an attack. */
export function inspiringBonus(units: Unit[]): number {
  return units.reduce(
    (sum, u) => sum + (u.def.passive?.kind === 'inspiring' ? u.def.passive.amount : 0),
    0,
  )
}

const GOOD_EVENTS = EVENT_DEFS.filter((e) => e.good)
const BAD_EVENTS = EVENT_DEFS.filter((e) => !e.good)

/**
 * Each attack has `chance` to trigger an event, which is good with probability `goodChance`.
 * `goodChance` can be a function to give each attack its own chance.
 */
export function rollEvents(
  attacks: Attack[],
  rng: Rng,
  chance = EVENT_CHANCE,
  goodChance: number | ((attack: Attack) => number) = GOOD_EVENT_CHANCE,
): TriggeredEvent[] {
  return attacks.flatMap((attack) => {
    if (rng.next() >= chance) return []
    const good = typeof goodChance === 'function' ? goodChance(attack) : goodChance
    const pool = rng.next() < good ? GOOD_EVENTS : BAD_EVENTS
    return [{ attackId: attack.id, event: rng.pick(pool) }]
  })
}

export interface EventOutcome {
  attack: Attack
  mods: CombatModifiers
}

/** Returns the attack with its strength adjusted by the event and the modifiers for combat. */
export function eventModifiers(event: GameEvent, attack: Attack): EventOutcome {
  const effect = event.effect
  switch (effect.kind) {
    case 'attackDelta':
      return { attack: { ...attack, strength: Math.max(0, attack.strength + effect.amount) }, mods: {} }
    case 'attackMultiplier': {
      const scaled = attack.strength * effect.factor
      const strength = effect.factor >= 1 ? Math.ceil(scaled) : Math.floor(scaled)
      return { attack: { ...attack, strength }, mods: {} }
    }
    case 'defenseDelta':
      return { attack, mods: { defenseBonus: effect.amount } }
    case 'ignoreDefense':
      return { attack, mods: { ignoreDefense: true } }
    case 'strengthDelta':
      return { attack, mods: { strengthBonus: effect.amount } }
  }
}

/** Short human-readable summary of what an event does, e.g. "Attack +3". */
export function describeEffect(event: GameEvent): string {
  const effect = event.effect
  switch (effect.kind) {
    case 'attackDelta':
      return `Attack ${effect.amount > 0 ? '+' : ''}${effect.amount}`
    case 'attackMultiplier':
      return effect.factor >= 1 ? `Attack x${effect.factor}` : 'Attack halved'
    case 'defenseDelta':
      return `Tile defense ${effect.amount > 0 ? '+' : ''}${effect.amount}`
    case 'ignoreDefense':
      return 'Tile defense ignored'
    case 'strengthDelta':
      return `Defender strength ${effect.amount > 0 ? '+' : ''}${effect.amount} each`
  }
}
