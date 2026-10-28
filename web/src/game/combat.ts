import { tileDefense } from './entities'
import type { Attack, Tile, Unit } from './types'

export interface UnitDamage {
  unitId: string
  absorbed: number
  enduranceLoss: number
  healthLoss: number
}

export interface CombatResult {
  attackId: string
  tileId: string
  incoming: number
  reduction: number
  effective: number
  blockedByTile: number
  absorbedByGarrison: number
  unitDamage: UnitDamage[]
  tileDamage: number
}

export interface CombatModifiers {
  defenseBonus?: number
  ignoreDefense?: boolean
  /** Added to each defending unit's strength (floored at 0). */
  strengthBonus?: number
}

/** Splits `total` between weights proportionally, rounding with largest remainders. */
export function splitProportionally(total: number, weights: number[]): number[] {
  const weightSum = weights.reduce((sum, w) => sum + w, 0)
  if (weightSum <= 0 || total <= 0) return weights.map(() => 0)

  const raw = weights.map((w) => (total * w) / weightSum)
  const shares = raw.map(Math.floor)
  let leftover = total - shares.reduce((sum, s) => sum + s, 0)

  const order = raw
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index)

  for (const { index } of order) {
    if (leftover <= 0) break
    shares[index]++
    leftover--
  }
  return shares
}

export interface StrengthContext {
  /** Sides from which the enemy can reach the defended tile. */
  exposedSides: number
  /** Units that died in the current city. */
  fallenUnits: number
}

const NO_CONTEXT: StrengthContext = { exposedSides: 0, fallenUnits: 0 }

/** Strength of `unit` with passives applied, given every unit defending the same attack. */
export function unitStrength(unit: Unit, units: Unit[], ctx: StrengthContext = NO_CONTEXT): number {
  const others = units.filter((u) => u.id !== unit.id)
  const banner = others.reduce(
    (sum, u) => sum + (u.def.passive?.kind === 'banner' ? u.def.passive.amount : 0),
    0,
  )
  return unit.def.strength + banner + ownBonus(unit, others, ctx)
}

function ownBonus(unit: Unit, others: Unit[], ctx: StrengthContext): number {
  const passive = unit.def.passive
  switch (passive?.kind) {
    case 'spearWall':
      return passive.amount * others.filter((u) => u.def.id === unit.def.id).length
    case 'lastStand':
      return unit.health === 1 ? passive.amount : 0
    case 'flanker':
      return ctx.exposedSides > 1 ? passive.amount : 0
    case 'bloodlust':
      return passive.amount * ctx.fallenUnits
    default:
      return 0
  }
}

/**
 * Resolves one attack against a tile and the units assigned to it.
 * `cityReduction` covers reductions from other tiles, such as adjacent watchtowers.
 */
export function resolveAttack(
  attack: Attack,
  tile: Tile,
  units: Unit[],
  cityReduction = 0,
  mods: CombatModifiers = {},
  ctx: StrengthContext = NO_CONTEXT,
): CombatResult {
  const unitReduction = units.reduce(
    (sum, u) => sum + (u.def.passive?.kind === 'attackReduction' ? u.def.passive.amount : 0),
    0,
  )
  const reduction = Math.min(attack.strength, unitReduction + cityReduction)
  const effective = attack.strength - reduction

  const defense = mods.ignoreDefense ? 0 : Math.max(0, tileDefense(tile) + (mods.defenseBonus ?? 0))
  const blockedByTile = Math.min(effective, defense)
  let remaining = effective - blockedByTile

  const strengths = units.map((u) =>
    Math.max(0, unitStrength(u, units, ctx) + (mods.strengthBonus ?? 0)),
  )
  const totalStrength = strengths.reduce((sum, s) => sum + s, 0)
  const absorbedByGarrison = Math.min(remaining, totalStrength)
  remaining -= absorbedByGarrison

  const shares = splitProportionally(absorbedByGarrison, strengths)
  const unitDamage = units.map((unit, i) => {
    const absorbed = shares[i]
    const enduranceLoss = Math.min(absorbed, unit.endurance)
    return { unitId: unit.id, absorbed, enduranceLoss, healthLoss: absorbed - enduranceLoss }
  })

  return {
    attackId: attack.id,
    tileId: tile.id,
    incoming: attack.strength,
    reduction,
    effective,
    blockedByTile,
    absorbedByGarrison,
    unitDamage,
    tileDamage: remaining,
  }
}
