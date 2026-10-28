import { describe, expect, it } from 'vitest'
import { ALL_TILE_DEFS, ALL_UNIT_DEFS } from './data'
import { createTile, createUnit } from './entities'
import {
  EVENT_DEFS,
  GOOD_EVENT_CHANCE,
  eventModifiers,
  goodEventChance,
  inspiringBonus,
  rollEvents,
} from './events'
import { createRng } from './rng'
import type { Attack, GameEvent } from './types'

const attacks = (count: number): Attack[] =>
  Array.from({ length: count }, (_, i) => ({ id: `a-${i}`, tileId: `t-${i}`, strength: 9, merged: 0 }))

const eventById = (id: string): GameEvent => EVENT_DEFS.find((e) => e.id === id)!

describe('rollEvents', () => {
  it('never triggers with chance 0', () => {
    expect(rollEvents(attacks(50), createRng(1), 0)).toEqual([])
  })

  it('triggers one event per attack with chance 1', () => {
    const events = rollEvents(attacks(10), createRng(2), 1)
    expect(events.map((e) => e.attackId)).toEqual(attacks(10).map((a) => a.id))
  })

  it('respects the good/bad split', () => {
    expect(rollEvents(attacks(30), createRng(3), 1, 1).every((e) => e.event.good)).toBe(true)
    expect(rollEvents(attacks(30), createRng(4), 1, 0).every((e) => !e.event.good)).toBe(true)
  })

  it('accepts a good chance per attack', () => {
    const events = rollEvents(attacks(30), createRng(7), 1, (a) => (a.id === 'a-0' ? 1 : 0))
    expect(events.map((e) => e.event.good)).toEqual(events.map((e) => e.attackId === 'a-0'))
  })

  it('is roughly 70% good by default', () => {
    const events = rollEvents(attacks(5000), createRng(5), 1)
    const goodRatio = events.filter((e) => e.event.good).length / events.length
    expect(goodRatio).toBeGreaterThan(0.66)
    expect(goodRatio).toBeLessThan(0.74)
  })

  it('triggers on roughly 20% of attacks by default', () => {
    const ratio = rollEvents(attacks(5000), createRng(6)).length / 5000
    expect(ratio).toBeGreaterThan(0.17)
    expect(ratio).toBeLessThan(0.23)
  })
})

describe('goodEventChance', () => {
  const build = (defIds: string[]) => {
    const ids = { nextId: 0 }
    return defIds.map((id, cell) => createTile(ids, ALL_TILE_DEFS[id], cell))
  }

  it('is the default without a Chapel', () => {
    expect(goodEventChance(build(['keep', 'house']))).toBe(GOOD_EVENT_CHANCE)
  })

  it('is raised by a standing Chapel only', () => {
    const tiles = build(['keep', 'chapel'])
    expect(goodEventChance(tiles)).toBeCloseTo(GOOD_EVENT_CHANCE + 0.1)
    tiles[1].health = 0
    expect(goodEventChance(tiles)).toBe(GOOD_EVENT_CHANCE)
  })
})

describe('inspiringBonus', () => {
  it('sums inspiring passives of the defenders', () => {
    const ids = { nextId: 0 }
    const captain = createUnit(ids, ALL_UNIT_DEFS.captain)
    const militia = createUnit(ids, ALL_UNIT_DEFS.militia)
    expect(inspiringBonus([militia])).toBe(0)
    expect(inspiringBonus([captain, militia, captain])).toBeCloseTo(0.3)
  })
})

describe('eventModifiers', () => {
  const attack = attacks(1)[0]

  it.each([
    ['siege-ladders', 12],
    ['berserker-charge', 14],
    ['commander-slain', 4],
    ['mud-and-rain', 6],
  ])('%s changes attack strength to %i', (id, expected) => {
    expect(eventModifiers(eventById(id), attack).attack.strength).toBe(expected)
  })

  it('does not reduce attack below 0', () => {
    const weak = { ...attack, strength: 1 }
    expect(eventModifiers(eventById('mud-and-rain'), weak).attack.strength).toBe(0)
  })

  it('produces combat modifiers for defense and strength events', () => {
    expect(eventModifiers(eventById('boiling-oil'), attack).mods).toEqual({ defenseBonus: 2 })
    expect(eventModifiers(eventById('sappers'), attack).mods).toEqual({ ignoreDefense: true })
    expect(eventModifiers(eventById('rallying-cry'), attack).mods).toEqual({ strengthBonus: 1 })
    expect(eventModifiers(eventById('exhausted-defenders'), attack).mods).toEqual({
      strengthBonus: -1,
    })
  })

  it('does not mutate the original attack', () => {
    eventModifiers(eventById('siege-ladders'), attack)
    expect(attack.strength).toBe(9)
  })
})
