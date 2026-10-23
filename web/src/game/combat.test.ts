import { describe, expect, it } from 'vitest'
import { resolveAttack, splitProportionally } from './combat'
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
