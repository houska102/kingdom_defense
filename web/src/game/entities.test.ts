import { describe, expect, it } from 'vitest'
import { ALL_TILE_DEFS, ALL_UNIT_DEFS } from './data'
import {
  createTile,
  createUnit,
  escapes,
  hasPassive,
  isEscape,
  maxEndurance,
  passiveTotal,
  tilePassives,
} from './entities'

const build = (defIds: string[]) => {
  const ids = { nextId: 0 }
  return defIds.map((id, cell) => createTile(ids, ALL_TILE_DEFS[id], cell))
}

describe('tile passives', () => {
  it('reads every passive on a tile with more than one', () => {
    const [camp] = build(['mercenaryCamp'])
    expect(tilePassives(camp, 'goldIncome')).toEqual([{ kind: 'goldIncome', amount: 1 }])
    expect(tilePassives(camp, 'mercenaryHire')).toEqual([{ kind: 'mercenaryHire', cost: 3 }])
    expect(hasPassive(camp, 'laneAnchor')).toBe(false)
  })

  it('sums amounts over standing tiles only', () => {
    const tiles = build(['watchtower', 'ballista', 'watchtower', 'house'])
    expect(passiveTotal(tiles, 'adjacentAttackReduction')).toBe(4)
    tiles[1].health = 0
    expect(passiveTotal(tiles, 'adjacentAttackReduction')).toBe(2)
    expect(passiveTotal(tiles, 'goldIncome')).toBe(0)
  })
})

describe('maxEndurance', () => {
  it('grows by 1 per fallen unit for the Warlord only', () => {
    const ids = { nextId: 0 }
    const warlord = createUnit(ids, ALL_UNIT_DEFS.warlord)
    const knights = createUnit(ids, ALL_UNIT_DEFS.knights)
    expect(maxEndurance(warlord, 0)).toBe(warlord.def.endurance)
    expect(maxEndurance(warlord, 3)).toBe(warlord.def.endurance + 3)
    expect(maxEndurance(knights, 3)).toBe(knights.def.endurance)
  })
})

describe('escape', () => {
  it('is only possible for tiles with the escape passive', () => {
    const [caravan, house] = build(['refugeeCaravan', 'house'])
    expect(isEscape(caravan)).toBe(true)
    expect(isEscape(house)).toBe(false)
  })

  it('succeeds only when ordered and taking no damage', () => {
    const [caravan] = build(['refugeeCaravan'])
    expect(escapes(caravan, { tileDamage: 0 })).toBe(false)
    caravan.escaping = true
    expect(escapes(caravan, { tileDamage: 0 })).toBe(true)
    expect(escapes(caravan, { tileDamage: 1 })).toBe(false)
  })
})
