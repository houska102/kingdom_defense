import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as store from './store'
import { ATTACK_TICKS, DAY_TICKS } from './ticks'
import type { Attack } from './types'

const { state } = store

/** First city with the Keep behind a row of walls and houses, no omens, the first garrison picks. */
function startBattle() {
  store.restart()
  state.battleEvents = []
  store.placeTile(13, 'keep')
  for (const cell of [0, 1, 2]) store.placeTile(cell, 'wall')
  for (const cell of [3, 4, 5, 6]) store.placeTile(cell, 'house')
  for (const def of store.garrisonPool()) {
    if (store.canPickUnit(def)) store.toggleUnit(def.id)
  }
  store.startCity()
}

/** Plays one tick, clearing whatever would stop it: events, the draft and pauses. */
function playTick() {
  while (store.currentEvent()) store.acknowledgeEvent()
  if (state.phase === 'draft') store.skipDraft()
  if (state.paused) store.resume()
  store.tick()
}

beforeEach(() => {
  vi.spyOn(Date, 'now').mockReturnValue(42)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('battle ticks', () => {
  it('starts the battle on day 1 with time running', () => {
    startBattle()
    expect(state.phase).toBe('battle')
    expect(state).toMatchObject({ day: 1, tick: 0, paused: false })
    expect(store.canTick()).toBe(true)
  })

  it('stops ticks while held and continues once released', () => {
    startBattle()
    const release = store.holdTicks()
    expect(store.canTick()).toBe(false)
    store.tick()
    expect(state.tick).toBe(0)
    release()
    release()
    expect(store.canTick()).toBe(true)
    expect(state.paused).toBe(false)
  })

  it('pauses on a new attack and only starts the fight on resume', () => {
    startBattle()
    for (let i = 0; i < 500 && state.attacks.length === 0; i++) {
      if (state.phase === 'draft') store.skipDraft()
      store.tick()
    }
    expect(state.attacks).toHaveLength(1)
    const attack = state.attacks[0]
    expect(attack.status).toBe('incoming')
    expect(state.paused).toBe(true)

    const tickBefore = state.tick
    store.tick()
    expect(state.tick).toBe(tickBefore)

    store.resume()
    expect(attack.status).toBe('fighting')
    expect(state.paused).toBe(false)
  })

  it.each([1, 7, 42, 1234, 99999])(
    'deals the whole fight outcome over its ticks and locks the defenders (seed %i)',
    (seed) => {
      vi.spyOn(Date, 'now').mockReturnValue(seed)
      startBattle()
      const wall = state.tiles.find((t) => t.def.id === 'wall')!
      const knights = state.units.find((u) => u.def.id === 'knights')!
      const attack: Attack = {
        id: 'attack-test',
        tileId: wall.id,
        strength: 9,
        merged: 0,
        status: 'incoming',
        duration: ATTACK_TICKS,
        elapsed: 0,
        tileDamageDealt: 0,
      }
      state.attacks.push(attack)
      state.assignments[attack.id] = []
      state.paused = true

      store.assignUnit(knights.id, attack.id)
      store.resume()
      while (store.currentEvent()) store.acknowledgeEvent()

      const live = state.attacks.find((a) => a.id === attack.id)!
      const expected = store.previewAttack(live)!
      const absorbed = expected.unitDamage.find((d) => d.unitId === knights.id)!.absorbed
      const wallHealth = wall.health
      const knightsHealth = knights.health
      const knightsEndurance = knights.endurance

      expect(store.isUnitLocked(knights.id)).toBe(true)
      store.unassignUnit(knights.id)
      expect(store.unitsOnAttack(live.id).map((u) => u.id)).toEqual([knights.id])

      for (let i = 0; i < ATTACK_TICKS; i++) playTick()

      expect(state.attacks.some((a) => a.id === attack.id)).toBe(false)
      expect(wallHealth - wall.health).toBe(Math.min(wallHealth, expected.tileDamage))
      expect(knightsHealth - knights.health).toBe(Math.max(0, absorbed - knightsEndurance))
      expect(store.isUnitLocked(knights.id)).toBe(false)
    },
  )

  it('rushes units sent into a running fight in at half strength', () => {
    startBattle()
    const wall = state.tiles.find((t) => t.def.id === 'wall')!
    const [first, late] = state.units
    const attack: Attack = {
      id: 'attack-rush',
      tileId: wall.id,
      strength: 40,
      merged: 0,
      status: 'incoming',
      duration: ATTACK_TICKS,
      elapsed: 0,
      tileDamageDealt: 0,
    }
    state.attacks.push(attack)
    state.assignments[attack.id] = []
    state.paused = true

    store.assignUnit(first.id, attack.id)
    expect(store.isRushed(first.id)).toBe(false)

    store.resume()
    while (store.currentEvent()) store.acknowledgeEvent()
    const live = state.attacks.find((a) => a.id === attack.id)!
    delete live.event

    store.assignUnit(late.id, attack.id)
    expect(store.isRushed(first.id)).toBe(false)
    expect(store.isRushed(late.id)).toBe(true)

    const absorbed = (id: string) =>
      store.previewAttack(live)!.unitDamage.find((d) => d.unitId === id)!.absorbed
    expect(absorbed(first.id)).toBe(first.def.strength)
    expect(absorbed(late.id)).toBe(Math.ceil(late.def.strength / 2))
  })

  it('ends the day with a card draft and starts the next day after it', () => {
    startBattle()
    for (let i = 0; i < DAY_TICKS * 3 && state.phase !== 'draft'; i++) {
      while (store.currentEvent()) store.acknowledgeEvent()
      if (state.paused) store.resume()
      store.tick()
    }
    expect(state.phase).toBe('draft')
    expect(state.tick).toBe(DAY_TICKS)
    expect(store.canTick()).toBe(false)

    store.skipDraft()
    expect(state).toMatchObject({ phase: 'battle', day: 2, tick: 0 })
  })
})
