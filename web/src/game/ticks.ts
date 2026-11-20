import { attackCount } from './attacks'
import type { Rng } from './rng'
import type { Unit } from './types'

/** Real time of one tick at 1x speed. */
export const TICK_MS = 1000
export const SPEEDS = [1, 2, 4]
/** Ticks in a day. Each day ends with income, upkeep and the card draft. */
export const DAY_TICKS = 20
/** Ticks a fight lasts once it starts. */
export const ATTACK_TICKS = 4
/** Idle units regain 1 endurance every this many ticks. */
export const ENDURANCE_REGEN_TICKS = 3
/** A day sees this many times `attackCount` attacks. */
export const ATTACKS_PER_DAY_FACTOR = 1.5

/** Expected attacks per tick on `day`, spread so a whole day sees its share of attacks. */
export function spawnRate(day: number, gridSize: number, extraAttacks = 0): number {
  return (attackCount(day, gridSize) * ATTACKS_PER_DAY_FACTOR + extraAttacks) / DAY_TICKS
}

/** Attacks spawning this tick: the whole part of the rate, plus one more by chance for the rest. */
export function spawnCount(day: number, gridSize: number, extraAttacks: number, rng: Rng): number {
  const rate = spawnRate(day, gridSize, extraAttacks)
  return Math.floor(rate) + (rng.next() < rate % 1 ? 1 : 0)
}

/** Share of `total` dealt on fight tick `elapsed` (0-based). The shares of all ticks sum to `total`. */
export function tickPortion(total: number, elapsed: number, duration: number): number {
  return Math.floor((total * (elapsed + 1)) / duration) - Math.floor((total * elapsed) / duration)
}

/** Part of `total` still to be dealt after `elapsed` fight ticks. */
export function remainingPortion(total: number, elapsed: number, duration: number): number {
  return total - Math.floor((total * Math.min(elapsed, duration)) / duration)
}

/** Deals absorbed damage to a unit, endurance first, then health. Returns what it lost. */
export function applyAbsorbed(unit: Unit, amount: number) {
  const enduranceLoss = Math.min(amount, unit.endurance)
  const healthLoss = Math.min(amount - enduranceLoss, unit.health)
  unit.endurance -= enduranceLoss
  unit.health -= healthLoss
  return { enduranceLoss, healthLoss }
}
