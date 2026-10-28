import { describe, expect, it } from 'vitest'
import { resolveAttack, splitProportionally, unitStrength } from './combat'
import type { Attack, Tile, TileDef, Unit, UnitDef } from './types'

const tileDef: TileDef = { id: 't', name: 'Tile', defense: 2, health: 8, description: '' }
const unitDef: UnitDef = {
  id: 'u',
  name: 'Unit',
  strength: 3,
  health: 2,
  endurance: 2,
  description: '',
}

const tile: Tile = { id: 'tile', def: tileDef, cell: 0, health: 8, bonusDefense: 0 }
const unit = (id = 'unit', def = unitDef): Unit => ({
  id,
  def,
  health: def.health,
  endurance: def.endurance,
})
const attack = (strength: number): Attack => ({ id: 'a', tileId: tile.id, strength, merged: 0 })

describe('resolveAttack (Game_idea.txt examples)', () => {
  it('attack 2 is cancelled by tile defense alone', () => {
    const r = resolveAttack(attack(2), tile, [unit()])
    expect(r.blockedByTile).toBe(2)
    expect(r.unitDamage[0]).toMatchObject({ enduranceLoss: 0, healthLoss: 0 })
    expect(r.tileDamage).toBe(0)
  })

  it('attack 4 removes 2 endurance', () => {
    const r = resolveAttack(attack(4), tile, [unit()])
    expect(r.unitDamage[0]).toMatchObject({ enduranceLoss: 2, healthLoss: 0 })
    expect(r.tileDamage).toBe(0)
  })

  it('attack 5 removes 2 endurance and 1 health', () => {
    const r = resolveAttack(attack(5), tile, [unit()])
    expect(r.unitDamage[0]).toMatchObject({ enduranceLoss: 2, healthLoss: 1 })
    expect(r.tileDamage).toBe(0)
  })

  it('attack 10 removes 2 endurance, 1 health and 5 tile health', () => {
    const r = resolveAttack(attack(10), tile, [unit()])
    expect(r.unitDamage[0]).toMatchObject({ enduranceLoss: 2, healthLoss: 1 })
    expect(r.tileDamage).toBe(5)
  })
})

describe('resolveAttack with multiple units', () => {
  it('splits absorbed damage by strength ratio', () => {
    const strong = unit('strong', { ...unitDef, strength: 4, endurance: 4 })
    const weak = unit('weak', { ...unitDef, strength: 2, endurance: 4 })
    const r = resolveAttack(attack(8), tile, [strong, weak])
    expect(r.absorbedByGarrison).toBe(6)
    expect(r.unitDamage.map((d) => d.absorbed)).toEqual([4, 2])
    expect(r.tileDamage).toBe(0)
  })

  it('applies unit and city reductions before tile defense', () => {
    const archer = unit('archer', {
      ...unitDef,
      passive: { kind: 'attackReduction', amount: 1 },
    })
    const r = resolveAttack(attack(10), tile, [archer], 1)
    expect(r.reduction).toBe(2)
    expect(r.effective).toBe(8)
    expect(r.tileDamage).toBe(3)
  })
})

describe('unit strength passives', () => {
  const spearDef: UnitDef = { ...unitDef, id: 'spear', passive: { kind: 'spearWall', amount: 1 } }

  it('spear wall adds strength per other unit of the same type', () => {
    const spears = [unit('s1', spearDef), unit('s2', spearDef), unit('s3', spearDef)]
    expect(spears.map((s) => unitStrength(s, spears))).toEqual([5, 5, 5])
    expect(unitStrength(spears[0], [spears[0], unit('other')])).toBe(3)
  })

  it('last stand adds strength only at 1 HP', () => {
    const def: UnitDef = { ...unitDef, health: 4, passive: { kind: 'lastStand', amount: 2 } }
    const berserker = unit('b', def)
    expect(unitStrength(berserker, [berserker])).toBe(3)
    const wounded = { ...berserker, health: 1 }
    expect(unitStrength(wounded, [wounded])).toBe(5)
    expect(resolveAttack(attack(20), tile, [wounded]).absorbedByGarrison).toBe(5)
  })

  it('flanker adds strength only when exposed from more than one side', () => {
    const skirm = unit('sk', { ...unitDef, passive: { kind: 'flanker', amount: 2 } })
    expect(unitStrength(skirm, [skirm], { exposedSides: 1, fallenUnits: 0 })).toBe(3)
    expect(unitStrength(skirm, [skirm], { exposedSides: 2, fallenUnits: 0 })).toBe(5)
  })

  it('bloodlust adds strength per fallen unit', () => {
    const warlord = unit('w', { ...unitDef, passive: { kind: 'bloodlust', amount: 1 } })
    expect(unitStrength(warlord, [warlord])).toBe(3)
    expect(unitStrength(warlord, [warlord], { exposedSides: 0, fallenUnits: 4 })).toBe(7)
    const r = resolveAttack(attack(20), tile, [warlord], 0, {}, { exposedSides: 0, fallenUnits: 2 })
    expect(r.absorbedByGarrison).toBe(5)
  })

  it('banner adds strength to every other unit on the attack', () => {
    const bearerDef: UnitDef = { ...unitDef, id: 'bearer', strength: 1, passive: { kind: 'banner', amount: 1 } }
    const bearer = unit('b', bearerDef)
    const other = unit('o')
    const squad = [bearer, other]
    expect(unitStrength(bearer, squad)).toBe(1)
    expect(unitStrength(other, squad)).toBe(4)
    const twoBearers = [bearer, unit('b2', bearerDef), other]
    expect(twoBearers.map((u) => unitStrength(u, twoBearers))).toEqual([2, 2, 5])
  })
})

describe('resolveAttack with event modifiers', () => {
  it('ignoreDefense skips tile defense', () => {
    const r = resolveAttack(attack(10), tile, [unit()], 0, { ignoreDefense: true })
    expect(r.blockedByTile).toBe(0)
    expect(r.absorbedByGarrison).toBe(3)
    expect(r.tileDamage).toBe(7)
  })

  it('defenseBonus adds to tile defense', () => {
    const r = resolveAttack(attack(10), tile, [unit()], 0, { defenseBonus: 2 })
    expect(r.blockedByTile).toBe(4)
    expect(r.tileDamage).toBe(3)
  })

  it('strengthBonus changes absorption and the split between units', () => {
    const strong = unit('strong', { ...unitDef, strength: 3, endurance: 5 })
    const weak = unit('weak', { ...unitDef, strength: 1, endurance: 5 })

    const rallied = resolveAttack(attack(20), tile, [strong, weak], 0, { strengthBonus: 1 })
    expect(rallied.absorbedByGarrison).toBe(6)
    expect(rallied.unitDamage.map((d) => d.absorbed)).toEqual([4, 2])

    const exhausted = resolveAttack(attack(20), tile, [strong, weak], 0, { strengthBonus: -1 })
    expect(exhausted.absorbedByGarrison).toBe(2)
    expect(exhausted.unitDamage.map((d) => d.absorbed)).toEqual([2, 0])
  })
})

describe('splitProportionally', () => {
  it('always sums to the total', () => {
    expect(splitProportionally(5, [1, 1, 1])).toEqual([2, 2, 1])
    expect(splitProportionally(7, [3, 2, 2]).reduce((a, b) => a + b)).toBe(7)
  })
})
