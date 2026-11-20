import { describe, expect, it } from 'vitest'
import { attackCount } from './attacks'
import { UNIT_DEFS } from './data'
import { createUnit } from './entities'
import { createRng } from './rng'
import {
  ATTACKS_PER_DAY_FACTOR,
  DAY_TICKS,
  applyAbsorbed,
  remainingPortion,
  spawnCount,
  spawnRate,
  tickPortion,
} from './ticks'

describe('tickPortion', () => {
  it('splits a total over the fight so the shares sum to it', () => {
    for (let duration = 1; duration <= 6; duration++) {
      for (let total = 0; total <= 25; total++) {
        const shares = Array.from({ length: duration }, (_, i) => tickPortion(total, i, duration))
        expect(shares.reduce((sum, s) => sum + s, 0)).toBe(total)
        expect(Math.max(...shares) - Math.min(...shares)).toBeLessThanOrEqual(1)
      }
    }
  })
})

describe('remainingPortion', () => {
  it('is what the remaining ticks still deal', () => {
    const duration = 4
    for (let total = 0; total <= 15; total++) {
      expect(remainingPortion(total, 0, duration)).toBe(total)
      expect(remainingPortion(total, duration, duration)).toBe(0)
      for (let elapsed = 0; elapsed < duration; elapsed++) {
        let rest = 0
        for (let i = elapsed; i < duration; i++) rest += tickPortion(total, i, duration)
        expect(remainingPortion(total, elapsed, duration)).toBe(rest)
      }
    }
  })
})

describe('spawning', () => {
  it('spreads the attacks of a day over its ticks', () => {
    const daily = attackCount(1, 4) * ATTACKS_PER_DAY_FACTOR
    expect(spawnRate(1, 4)).toBe(daily / DAY_TICKS)
    expect(spawnRate(1, 4, 1)).toBe((daily + 1) / DAY_TICKS)
  })

  it('spawns about the daily attack count per day on average', () => {
    const rng = createRng(7)
    const days = 500
    let spawned = 0
    for (let i = 0; i < days * DAY_TICKS; i++) spawned += spawnCount(4, 4, 0, rng)
    expect(spawned / days).toBeCloseTo(attackCount(4, 4) * ATTACKS_PER_DAY_FACTOR, 0)
  })

  it('spawns several attacks in one tick once the rate passes 1', () => {
    const rng = createRng(3)
    const extra = DAY_TICKS * 2
    const rate = spawnRate(1, 4, extra)
    for (let i = 0; i < 20; i++) {
      const count = spawnCount(1, 4, extra, rng)
      expect(count).toBeGreaterThanOrEqual(Math.floor(rate))
      expect(count).toBeLessThanOrEqual(Math.ceil(rate))
    }
  })
})

describe('applyAbsorbed', () => {
  it('takes endurance first, then health', () => {
    const unit = createUnit({ nextId: 0 }, UNIT_DEFS.militia)
    unit.endurance = 2
    unit.health = 3
    expect(applyAbsorbed(unit, 1)).toEqual({ enduranceLoss: 1, healthLoss: 0 })
    expect(applyAbsorbed(unit, 3)).toEqual({ enduranceLoss: 1, healthLoss: 2 })
    expect(unit).toMatchObject({ endurance: 0, health: 1 })
  })

  it('never takes health below 0', () => {
    const unit = createUnit({ nextId: 0 }, UNIT_DEFS.militia)
    unit.endurance = 0
    unit.health = 2
    expect(applyAbsorbed(unit, 5)).toEqual({ enduranceLoss: 0, healthLoss: 2 })
    expect(unit.health).toBe(0)
  })
})
