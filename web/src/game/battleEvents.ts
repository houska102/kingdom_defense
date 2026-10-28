import type { Rng } from './rng'
import type { BattleEffect, BattleEffectKind, BattleEvent } from './types'

export const MIN_BATTLE_EVENTS = 2
export const MAX_BATTLE_EVENTS = 3
export const GOOD_BATTLE_EVENT_CHANCE = 0.5
export const PREVENT_BATTLE_EVENT_COST = 4

export const BATTLE_EVENT_DEFS: BattleEvent[] = [
  {
    id: 'enemy-famine',
    title: 'Famine in the Enemy Camp',
    text: 'Scouts report the enemy supply wagons burned on the road. Their soldiers march hungry.',
    good: true,
    effect: { kind: 'attackBonus', amount: -1 },
  },
  {
    id: 'master-masons',
    title: 'Master Masons',
    text: 'A guild of masons arrives from the capital and reinforces every wall and doorway in town.',
    good: true,
    effect: { kind: 'tileDefense', amount: 1 },
  },
  {
    id: 'volunteers',
    title: 'Volunteers',
    text: 'Farmers and smiths answer the call to arms, swelling the ranks of the garrison.',
    good: true,
    effect: { kind: 'garrisonPicks', amount: 1 },
  },
  {
    id: 'war-chest',
    title: 'War Chest',
    text: 'The city elders open the old vaults to pay for the defense.',
    good: true,
    effect: { kind: 'gold', amount: 3 },
  },
  {
    id: 'favorable-omens',
    title: 'Favorable Omens',
    text: 'A white stag was seen at dawn. The priests say the heavens are with the city.',
    good: true,
    effect: { kind: 'goodEventChance', amount: 0.15 },
  },
  {
    id: 'royal-envoy',
    title: 'Royal Envoy',
    text: 'A rider from the king brings letters of credit and a promise of support.',
    good: true,
    effect: { kind: 'draftSize', amount: 1 },
  },
  {
    id: 'wandering-sellswords',
    title: 'Wandering Sellswords',
    text: 'A band of mercenaries passing through agrees to stand on the walls for room and board.',
    good: true,
    effect: { kind: 'recruits', amount: 1 },
  },
  {
    id: 'veteran-horde',
    title: 'Veteran Horde',
    text: 'The banners on the horizon belong to hardened veterans of a dozen sieges.',
    good: false,
    effect: { kind: 'attackBonus', amount: 1 },
  },
  {
    id: 'rotten-timber',
    title: 'Rotten Timber',
    text: 'Years of neglect have left beams soft with rot. The buildings will not hold as they should.',
    good: false,
    effect: { kind: 'tileDefense', amount: -1 },
  },
  {
    id: 'second-army',
    title: 'Second Army',
    text: 'A second column joins the siege from the hills. There are simply more of them.',
    good: false,
    effect: { kind: 'extraAttacks', amount: 1 },
  },
  {
    id: 'desertion',
    title: 'Desertion',
    text: 'Overnight, a company slipped out through the postern gate and fled.',
    good: false,
    effect: { kind: 'garrisonPicks', amount: -1 },
  },
  {
    id: 'ill-omens',
    title: 'Ill Omens',
    text: 'Crows gather on the Keep and the wells run red. Nobody expects fortune to smile.',
    good: false,
    effect: { kind: 'goodEventChance', amount: -0.2 },
  },
  {
    id: 'camp-fever',
    title: 'Camp Fever',
    text: 'A sickness spreads through the barracks. The garrison takes to the walls pale and coughing.',
    good: false,
    effect: { kind: 'unitHealthLoss', amount: 1 },
  },
  {
    id: 'earthquake',
    title: 'Earthquake',
    text: 'The ground heaves in the night. Cracks run through the stone before the first enemy arrives.',
    good: false,
    effect: { kind: 'tileDamage', amount: 2, count: 2 },
  },
]

const GOOD_BATTLE_EVENTS = BATTLE_EVENT_DEFS.filter((e) => e.good)
const BAD_BATTLE_EVENTS = BATTLE_EVENT_DEFS.filter((e) => !e.good)

/** Rolls 2-3 distinct events, never two with the same effect kind. */
export function rollBattleEvents(rng: Rng, goodChance = GOOD_BATTLE_EVENT_CHANCE): BattleEvent[] {
  const count = rng.int(MIN_BATTLE_EVENTS, MAX_BATTLE_EVENTS)
  const events: BattleEvent[] = []
  for (let i = 0; i < count; i++) {
    const usedKinds = new Set(events.map((e) => e.effect.kind))
    const available = (pool: BattleEvent[]) => pool.filter((e) => !usedKinds.has(e.effect.kind))
    const preferred = available(rng.next() < goodChance ? GOOD_BATTLE_EVENTS : BAD_BATTLE_EVENTS)
    const pool = preferred.length > 0 ? preferred : available(BATTLE_EVENT_DEFS)
    if (pool.length === 0) break
    events.push(rng.pick(pool))
  }
  return events
}

/** Sum of `amount` across events of `kind`. */
export function battleTotal(events: BattleEvent[], kind: BattleEffectKind): number {
  return events
    .map((e) => e.effect)
    .filter((effect) => effect.kind === kind)
    .reduce((sum, effect) => sum + effect.amount, 0)
}

const signed = (n: number) => `${n > 0 ? '+' : ''}${n}`

/** Short human-readable summary of a battle event, e.g. "Every attack +1". */
export function describeBattleEffect(effect: BattleEffect): string {
  switch (effect.kind) {
    case 'attackBonus':
      return `Every attack ${signed(effect.amount)}`
    case 'tileDefense':
      return `Every tile ${signed(effect.amount)} defense`
    case 'extraAttacks':
      return `${signed(effect.amount)} attack each turn`
    case 'garrisonPicks':
      return `${signed(effect.amount)} garrison pick`
    case 'gold':
      return `${signed(effect.amount)} gold when the defense starts`
    case 'goodEventChance':
      return `Good event chance ${signed(Math.round(effect.amount * 100))}%`
    case 'draftSize':
      return `${signed(effect.amount)} card in every pick`
    case 'recruits':
      return `${signed(effect.amount)} random unit when the defense starts`
    case 'unitHealthLoss':
      return `Every unit starts with -${effect.amount} HP`
    case 'tileDamage':
      return `${effect.count} random tiles start with -${effect.amount} HP`
  }
}
