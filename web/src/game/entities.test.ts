import { describe, expect, it } from 'vitest'
import { ALL_TILE_DEFS } from './data'
import { createTile, hasPassive, passiveTotal, tilePassives } from './entities'

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
