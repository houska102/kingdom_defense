import { describe, expect, it } from 'vitest'
import {
  BATTLE_EVENT_DEFS,
  MAX_BATTLE_EVENTS,
  MIN_BATTLE_EVENTS,
  battleTotal,
  describeBattleEffect,
  rollBattleEvents,
} from './battleEvents'
import { createRng } from './rng'
import type { BattleEvent } from './types'

const eventById = (id: string): BattleEvent => BATTLE_EVENT_DEFS.find((e) => e.id === id)!

describe('rollBattleEvents', () => {
  it('rolls 2-3 events with no repeated effect kind', () => {
    const rng = createRng(7)
    const counts = new Set<number>()
    for (let i = 0; i < 500; i++) {
      const events = rollBattleEvents(rng)
      counts.add(events.length)
      expect(events.length).toBeGreaterThanOrEqual(MIN_BATTLE_EVENTS)
      expect(events.length).toBeLessThanOrEqual(MAX_BATTLE_EVENTS)
      const kinds = events.map((e) => e.effect.kind)
      expect(new Set(kinds).size).toBe(kinds.length)
    }
    expect(counts).toEqual(new Set([2, 3]))
  })

  it('respects the good chance', () => {
    const rng = createRng(3)
    for (let i = 0; i < 100; i++) {
      expect(rollBattleEvents(rng, 1).every((e) => e.good)).toBe(true)
      expect(rollBattleEvents(rng, 0).every((e) => !e.good)).toBe(true)
    }
  })
})

describe('battleTotal', () => {
  it('sums amounts of the matching kind only', () => {
    const events = [eventById('veteran-horde'), eventById('war-chest'), eventById('second-army')]
    expect(battleTotal(events, 'attackBonus')).toBe(1)
    expect(battleTotal(events, 'gold')).toBe(3)
    expect(battleTotal(events, 'extraAttacks')).toBe(1)
    expect(battleTotal(events, 'tileDefense')).toBe(0)
    expect(battleTotal([], 'attackBonus')).toBe(0)
  })
})

describe('describeBattleEffect', () => {
  it('describes every event', () => {
    for (const event of BATTLE_EVENT_DEFS) {
      expect(describeBattleEffect(event.effect)).not.toBe('')
    }
    expect(describeBattleEffect(eventById('ill-omens').effect)).toBe('Good event chance -20%')
  })
})
