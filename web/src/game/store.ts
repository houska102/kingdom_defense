import { reactive } from 'vue'
import { exposedSides, generateAttacks } from './attacks'
import {
  bonusRecruits,
  cityConfig,
  createCity,
  garrisonPicks as picksForPool,
  garrisonPool as poolForUnlocks,
  isLastCity,
  mergeUnlocks,
  newCampaign,
} from './campaign'
import { applyCard, rollDraft } from './cards'
import { resolveAttack, type CombatResult } from './combat'
import { ALL_TILE_DEFS, ALL_UNIT_DEFS } from './data'
import { createTile, createUnit, isAdjacent, nextId } from './entities'
import { eventModifiers, rollEvents } from './events'
import { createRng, type Rng } from './rng'
import type {
  Attack,
  Card,
  Direction,
  GameState,
  Tile,
  TriggeredEvent,
  Unit,
  UnitDef,
} from './types'

let rng: Rng = createRng(Date.now())

export const state = reactive<GameState>(newCampaign(rng))

// Queries

export const currentCity = () => cityConfig(state.cityIndex)
export const garrisonPool = (): UnitDef[] => poolForUnlocks(state.unitUnlocks)
export const garrisonPicks = (): number => picksForPool(garrisonPool().length)
export const totalTurns = () => state.cityResults.reduce((sum, r) => sum + r.turns, 0)

export const tileAt = (cell: number) => state.tiles.find((t) => t.cell === cell)
export const tileById = (id: string) => state.tiles.find((t) => t.id === id)
export const unitById = (id: string) => state.units.find((u) => u.id === id)
export const attackOnTile = (tileId: string) => state.attacks.find((a) => a.tileId === tileId)

export function attackOfUnit(unitId: string): Attack | undefined {
  return state.attacks.find((a) => state.assignments[a.id]?.includes(unitId))
}

export function unitsOnAttack(attackId: string): Unit[] {
  return (state.assignments[attackId] ?? [])
    .map(unitById)
    .filter((u): u is Unit => u !== undefined)
}

/** Reduction applied to attacks on `tile` by passives of other living tiles. */
export function cityReduction(tile: Tile): number {
  return state.tiles
    .filter((t) => t.health > 0 && t.id !== tile.id && isAdjacent(t.cell, tile.cell, state.gridSize))
    .reduce(
      (sum, t) =>
        sum + (t.def.passive?.kind === 'adjacentAttackReduction' ? t.def.passive.amount : 0),
      0,
    )
}

/** Sides from which the enemy can currently reach `tile`. Empty if it is shielded. */
export function exposedSidesOf(tile: Tile): Direction[] {
  return exposedSides(tile, state.tiles, state.attackDirection, state.gridSize)
}

/** Combat outcome for an attack with the current assignments, ignoring events. */
export function previewAttack(attack: Attack): CombatResult | undefined {
  const tile = tileById(attack.tileId)
  if (!tile) return undefined
  return resolveAttack(attack, tile, unitsOnAttack(attack.id), cityReduction(tile))
}

function resolveWithEvent(attack: Attack, triggered?: TriggeredEvent): CombatResult | undefined {
  if (!triggered) return previewAttack(attack)
  const tile = tileById(attack.tileId)
  if (!tile) return undefined
  const outcome = eventModifiers(triggered.event, attack)
  return resolveAttack(
    outcome.attack,
    tile,
    unitsOnAttack(attack.id),
    cityReduction(tile),
    outcome.mods,
  )
}

export const currentEvent = (): TriggeredEvent | undefined => state.pendingEvents[state.eventIndex]

export interface EventImpact {
  tile: Tile
  attackBefore: number
  attackAfter: number
  before: CombatResult
  after: CombatResult
}

/** Before/after view of how an event changes its attack. */
export function eventImpact(triggered: TriggeredEvent): EventImpact | undefined {
  const attack = state.attacks.find((a) => a.id === triggered.attackId)
  const tile = attack && tileById(attack.tileId)
  if (!attack || !tile) return undefined
  const before = previewAttack(attack)
  const after = resolveWithEvent(attack, triggered)
  if (!before || !after) return undefined
  return {
    tile,
    attackBefore: attack.strength,
    attackAfter: eventModifiers(triggered.event, attack).attack.strength,
    before,
    after,
  }
}

export function canStartCity(): boolean {
  return (
    state.tiles.some((t) => t.def.essential) && state.pickedUnitDefIds.length === garrisonPicks()
  )
}

// Setup actions

export function selectTileDef(defId: string | null) {
  state.selectedTileDefId = state.selectedTileDefId === defId ? null : defId
}

export function placeTile(cell: number) {
  const defId = state.selectedTileDefId
  if (!defId || tileAt(cell) || (state.palette[defId] ?? 0) <= 0) return
  state.tiles.push(createTile(state, ALL_TILE_DEFS[defId], cell))
  state.palette[defId]--
  if (state.palette[defId] === 0) state.selectedTileDefId = null
}

export function removeTile(cell: number) {
  const tile = tileAt(cell)
  if (!tile || tile.prebuilt) return
  state.tiles = state.tiles.filter((t) => t !== tile)
  state.palette[tile.def.id] = (state.palette[tile.def.id] ?? 0) + 1
}

export function toggleUnit(defId: string) {
  const picked = state.pickedUnitDefIds
  if (picked.includes(defId)) {
    state.pickedUnitDefIds = picked.filter((id) => id !== defId)
  } else if (picked.length < garrisonPicks() && garrisonPool().some((u) => u.id === defId)) {
    picked.push(defId)
  }
}

export function startCity() {
  if (!canStartCity()) return
  state.units = [
    ...state.pickedUnitDefIds.map((id) => ALL_UNIT_DEFS[id]),
    ...bonusRecruits(state.tiles),
  ].map((def) => createUnit(state, def))
  state.selectedTileDefId = null
  state.turn = 1
  beginTurn()
}

// Turn actions

function beginTurn() {
  state.attacks = generateAttacks(
    state.turn,
    state.tiles,
    rng,
    () => nextId(state, 'attack'),
    state.attackDirection,
    state.gridSize,
    currentCity().attackBonus,
  )
  state.assignments = Object.fromEntries(state.attacks.map((a) => [a.id, []]))
  state.selectedUnitId = null
  state.phase = 'assign'
}

export function selectUnit(unitId: string | null) {
  if (state.phase !== 'assign') return
  state.selectedUnitId = state.selectedUnitId === unitId ? null : unitId
}

export function unassignUnit(unitId: string) {
  if (state.phase !== 'assign') return
  for (const attackId of Object.keys(state.assignments)) {
    state.assignments[attackId] = state.assignments[attackId].filter((id) => id !== unitId)
  }
}

export function assignSelectedUnit(attackId: string) {
  const unitId = state.selectedUnitId
  if (state.phase !== 'assign' || !unitId || !state.assignments[attackId]) return
  unassignUnit(unitId)
  state.assignments[attackId].push(unitId)
  state.selectedUnitId = null
}

function describeResult(result: CombatResult, tile: Tile, attack: Attack): string {
  const parts = [`${tile.def.name} hit for ${result.incoming}`]
  if (attack.merged > 0) parts[0] += ` (${attack.merged + 1} attacks merged)`
  if (result.reduction > 0) parts.push(`reduced by ${result.reduction}`)
  if (result.blockedByTile > 0) parts.push(`defense blocked ${result.blockedByTile}`)
  for (const d of result.unitDamage) {
    const name = unitById(d.unitId)?.def.name ?? '?'
    parts.push(`${name} absorbed ${d.absorbed} (-${d.enduranceLoss} end, -${d.healthLoss} hp)`)
  }
  parts.push(result.tileDamage > 0 ? `${tile.def.name} took ${result.tileDamage} damage` : 'tile held')
  return parts.join(', ')
}

export function endTurn() {
  if (state.phase !== 'assign') return
  state.selectedUnitId = null
  const defended = state.attacks.filter((a) => (state.assignments[a.id]?.length ?? 0) > 0)
  state.pendingEvents = rollEvents(defended, rng)
  state.eventIndex = 0
  if (state.pendingEvents.length > 0) state.phase = 'event'
  else applyResolution()
}

export function acknowledgeEvent() {
  if (state.phase !== 'event') return
  state.eventIndex++
  if (state.eventIndex >= state.pendingEvents.length) applyResolution()
}

function applyResolution() {
  const lines: string[] = []
  const fought = new Set<string>()

  const results = state.attacks.flatMap((attack) => {
    const triggered = state.pendingEvents.find((e) => e.attackId === attack.id)
    const result = resolveWithEvent(attack, triggered)
    const tile = tileById(attack.tileId)
    return result && tile ? [{ attack, tile, result, triggered }] : []
  })

  for (const { attack, tile, result, triggered } of results) {
    const line = describeResult(result, tile, attack)
    lines.push(triggered ? `[${triggered.event.title}] ${line}` : line)
    for (const d of result.unitDamage) {
      const unit = unitById(d.unitId)
      if (!unit) continue
      fought.add(unit.id)
      unit.endurance -= d.enduranceLoss
      unit.health = Math.max(0, unit.health - d.healthLoss)
    }
    tile.health = Math.max(0, tile.health - result.tileDamage)
    if (tile.health === 0) lines.push(`${tile.def.name} was destroyed!`)
  }

  for (const unit of state.units.filter((u) => u.health === 0)) {
    lines.push(`${unit.def.name} fell in battle.`)
  }
  state.units = state.units.filter((u) => u.health > 0)

  const cityRegen = state.tiles
    .filter((t) => t.health > 0)
    .reduce((sum, t) => sum + (t.def.passive?.kind === 'garrisonRegen' ? t.def.passive.amount : 0), 0)
  for (const unit of state.units) {
    if (fought.has(unit.id)) {
      const unitRegen = unit.def.passive?.kind === 'enduranceRegen' ? unit.def.passive.amount : 0
      unit.endurance = Math.min(unit.def.endurance, unit.endurance + 1 + unitRegen + cityRegen)
    } else {
      unit.endurance = unit.def.endurance
    }
  }

  for (const tile of state.tiles) tile.bonusDefense = 0

  state.reports.unshift({ turn: state.turn, lines })
  state.attacks = []
  state.assignments = {}
  state.selectedUnitId = null
  state.pendingEvents = []
  state.eventIndex = 0

  const keepLost = state.tiles.some((t) => t.def.essential && t.health === 0)
  const allLost = state.tiles.every((t) => t.health === 0)
  if (keepLost || allLost) {
    fallCity(keepLost ? 'The Keep was destroyed.' : 'Every tile was destroyed.')
    return
  }

  state.draft = rollDraft(state, rng)
  state.pendingCard = null
  state.phase = 'draft'
}

function fallCity(reason: string) {
  state.fallReason = reason
  state.cityResults.push({ name: currentCity().name, turns: state.turn - 1, fallReason: reason })
  Object.assign(state, mergeUnlocks(state, state.unlocks))
  state.phase = isLastCity(state.cityIndex) ? 'campaignOver' : 'cityFallen'
}

// Draft actions

function endDraft() {
  state.draft = []
  state.pendingCard = null
  state.turn++
  beginTurn()
}

export function pickCard(card: Card) {
  if (state.phase !== 'draft') return
  if (card.target === null) {
    applyCard(state, card)
    endDraft()
  } else {
    state.pendingCard = state.pendingCard?.id === card.id ? null : card
  }
}

export function chooseCardTarget(targetId: string) {
  if (!state.pendingCard) return
  if (applyCard(state, state.pendingCard, targetId)) endDraft()
}

export function skipDraft() {
  if (state.phase === 'draft') endDraft()
}

// Campaign actions

export function nextCity() {
  if (state.phase !== 'cityFallen') return
  const progress = {
    cityIndex: state.cityIndex + 1,
    cityResults: state.cityResults,
    tileUnlocks: state.tileUnlocks,
    unitUnlocks: state.unitUnlocks,
  }
  Object.assign(state, createCity(progress, state.nextId, rng))
}

export function restart() {
  rng = createRng(Date.now())
  Object.assign(state, newCampaign(rng))
}
