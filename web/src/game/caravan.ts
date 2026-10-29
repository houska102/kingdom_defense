import { tilePassives } from './entities'
import type { Tile } from './types'

export const isCaravan = (tile: Tile) => tile.def.id === 'refugeeCaravan'

/** Adds the `goldHoard` amount of every standing tile to its stored gold. */
export function fillHoards(tiles: Tile[]) {
  for (const tile of tiles.filter((t) => t.health > 0)) {
    const amount = tilePassives(tile, 'goldHoard').reduce((sum, p) => sum + p.amount, 0)
    if (amount > 0) tile.hoard = (tile.hoard ?? 0) + amount
  }
}

/** Gold stored on standing caravans, lost unless they escape. */
export const caravanGold = (tiles: Tile[]) =>
  tiles.filter((t) => t.health > 0 && isCaravan(t)).reduce((sum, t) => sum + (t.hoard ?? 0), 0)
