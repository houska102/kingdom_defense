import { reactive, ref, watch } from 'vue'
import { exposedSides, spawnAttack } from './attacks'
import { PREVENT_BATTLE_EVENT_COST, battleTotal, describeBattleEffect } from './battleEvents'
import {
  bonusRecruits,
  cityConfig,
  createCity,
  garrisonPicks as picksForPool,
  garrisonPool as poolForUnlocks,
  isFreePick,
  isLastCity,
  mergeUnlocks,
  newCampaign,
  payUpkeep,
  upkeepOf,
} from './campaign'
import { caravanGold as caravanGoldOf, fillHoards } from './caravan'
import { applyCard, draftSize, rollDraft } from './cards'
import { resolveAttack, type CombatResult, type StrengthContext } from './combat'
import { ALL_TILE_DEFS, ALL_UNIT_DEFS } from './data'
import {
  createTile,
  createUnit,
  escapes,
  isAdjacent,
  isEscape,
  maxEndurance,
  nextId,
  passiveTotal,
  tilePassives,
} from './entities'
import { EVENT_CHANCE, eventModifiers, goodEventChance, inspiringBonus, rollEvents } from './events'
import { createRng, type Rng } from './rng'
import { loadSave, writeSave } from './save'
import {
  ATTACK_TICKS,
  DAY_TICKS,
  ENDURANCE_REGEN_TICKS,
  applyAbsorbed,
  remainingPortion,
  spawnCount,
  tickPortion,
} from './ticks'
import type {
  Attack,
  BattleEffectKind,
  BattleEvent,
  Card,
  Direction,
  GameEvent,
  GameState,
  Tile,
  TriggeredEvent,
  Unit,
  UnitDef,
} from './types'

const saved = loadSave()
let rng: Rng = createRng(saved?.seed ?? Date.now())

export const state = reactive<GameState>(saved?.state ?? newCampaign(rng))
if (state.phase === 'battle') state.paused = true

watch(state, () => writeSave(state, rng.seed()), { deep: true })

// Queries

export const currentCity = () => cityConfig(state.cityIndex)
export const garrisonPool = (): UnitDef[] => poolForUnlocks(state.unitUnlocks)
export const battleModifier = (kind: BattleEffectKind) => battleTotal(state.battleEvents, kind)
export const garrisonPicks = (): number =>
  Math.max(
    1,
    picksForPool(garrisonPool().filter((u) => !isFreePick(u)).length) +
      battleModifier('garrisonPicks'),
  )
const pickedDefs = () => state.pickedUnitDefIds.map((id) => ALL_UNIT_DEFS[id])
/** Picked units that use a garrison pick. */
export const pickedCount = () => pickedDefs().filter((u) => !isFreePick(u)).length
const pickedUpkeep = () => pickedDefs().reduce((sum, u) => sum + upkeepOf(u), 0)

/** Whether `def` can be added to the picked garrison. */
export function canPickUnit(def: UnitDef): boolean {
  if (state.pickedUnitDefIds.includes(def.id) || !garrisonPool().some((u) => u.id === def.id)) {
    return false
  }
  return isFreePick(def)
    ? state.gold >= pickedUpkeep() + upkeepOf(def)
    : pickedCount() < garrisonPicks()
}
export const totalDays = () => state.cityResults.reduce((sum, r) => sum + r.days, 0)

export const tileAt = (cell: number) => state.tiles.find((t) => t.cell === cell)
export const tileById = (id: string) => state.tiles.find((t) => t.id === id)
export const unitById = (id: string) => state.units.find((u) => u.id === id)
export const attackOnTile = (tileId: string) => state.attacks.find((a) => a.tileId === tileId)
export const incomingAttacks = () => state.attacks.filter((a) => a.status === 'incoming')

export function attackOfUnit(unitId: string): Attack | undefined {
  return state.attacks.find((a) => state.assignments[a.id]?.includes(unitId))
}

/** Units on a fight that already started can't be recalled or moved until it ends. */
export const isUnitLocked = (unitId: string) => attackOfUnit(unitId)?.status === 'fighting'

/** Sent into its fight after it started, so it fights at reduced strength. */
export const isRushed = (unitId: string) => !!attackOfUnit(unitId)?.rushed?.includes(unitId)

export function unitsOnAttack(attackId: string): Unit[] {
  return (state.assignments[attackId] ?? [])
    .map(unitById)
    .filter((u): u is Unit => u !== undefined)
}

/** Reduction applied to attacks on `tile` by passives of other living tiles. */
export function cityReduction(tile: Tile): number {
  const neighbors = state.tiles.filter(
    (t) => t.id !== tile.id && isAdjacent(t.cell, tile.cell, state.gridSize),
  )
  return passiveTotal(neighbors, 'adjacentAttackReduction')
}

/** Cheapest mercenary price offered by a standing tile, or undefined if none can hire. */
export function mercenaryCost(): number | undefined {
  const costs = state.tiles
    .filter((t) => t.health > 0)
    .flatMap((t) => tilePassives(t, 'mercenaryHire'))
    .map((p) => p.cost)
  return costs.length ? Math.min(...costs) : undefined
}

export const goldIncome = () => passiveTotal(state.tiles, 'goldIncome')
export const caravanGold = () => caravanGoldOf(state.tiles)

export function canHireMercenary(): boolean {
  const cost = mercenaryCost()
  return state.phase === 'battle' && cost !== undefined && state.gold >= cost
}

/** Sides from which the enemy can currently reach `tile`. Empty if it is shielded. */
export function exposedSidesOf(tile: Tile): Direction[] {
  return exposedSides(tile, state.tiles, state.attackDirection, state.gridSize)
}

function combatContext(tile: Tile): StrengthContext {
  return { exposedSides: exposedSidesOf(tile).length, fallenUnits: state.fallenUnits }
}

/** Outcome of the whole fight with the current defenders, as if it dealt everything at once. */
function resolveFight(attack: Attack, event?: GameEvent): CombatResult | undefined {
  const tile = tileById(attack.tileId)
  if (!tile) return undefined
  const outcome = event ? eventModifiers(event, attack) : { attack, mods: {} }
  return resolveAttack(
    outcome.attack,
    tile,
    unitsOnAttack(attack.id),
    cityReduction(tile),
    { ...outcome.mods, rushed: attack.rushed },
    combatContext(tile),
  )
}

/** Whole-fight outcome for an attack with the current assignments and its event, if any. */
export const previewAttack = (attack: Attack) => resolveFight(attack, attack.event)

/** Like `previewAttack`, but tile and unit damage only count the fight ticks still to come. */
export function remainingPreview(attack: Attack): CombatResult | undefined {
  const full = previewAttack(attack)
  if (!full) return undefined
  const left = (total: number) => remainingPortion(total, attack.elapsed, attack.duration)
  return {
    ...full,
    tileDamage: left(full.tileDamage),
    unitDamage: full.unitDamage.map((d) => {
      const absorbed = left(d.absorbed)
      const enduranceLoss = Math.min(absorbed, unitById(d.unitId)?.endurance ?? 0)
      return { unitId: d.unitId, absorbed, enduranceLoss, healthLoss: absorbed - enduranceLoss }
    }),
  }
}

export const currentEvent = (): TriggeredEvent | undefined => state.pendingEvents[state.eventIndex]

/** Battle event waiting to be shown in the setup modal. The first city skips the modals. */
export const currentBattleEvent = (): BattleEvent | undefined =>
  state.phase === 'setup' && state.cityIndex > 0
    ? state.battleEvents[state.battleEventIndex]
    : undefined

export function acknowledgeBattleEvent() {
  if (currentBattleEvent()) state.battleEventIndex++
}

/** The bad omen shown in the setup modal can be bought off before its effects apply. */
export function canPreventBattleEvent(): boolean {
  const event = currentBattleEvent()
  return !!event && !event.good && state.gold >= PREVENT_BATTLE_EVENT_COST
}

export function preventBattleEvent() {
  const event = currentBattleEvent()
  if (!event || !canPreventBattleEvent()) return
  state.battleEvents.splice(state.battleEventIndex, 1)
  state.gold -= PREVENT_BATTLE_EVENT_COST
  logLine(`Prevented [${event.title}] for ${PREVENT_BATTLE_EVENT_COST} gold.`)
}

export interface EventImpact {
  tile: Tile
  attackBefore: number
  attackAfter: number
  before: CombatResult
  after: CombatResult
}

/** Before/after view of how an event changes its fight. */
export function eventImpact(triggered: TriggeredEvent): EventImpact | undefined {
  const attack = state.attacks.find((a) => a.id === triggered.attackId)
  const tile = attack && tileById(attack.tileId)
  if (!attack || !tile) return undefined
  const before = resolveFight(attack)
  const after = resolveFight(attack, triggered.event)
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
    state.tiles.some((t) => t.def.essential) &&
    pickedCount() === garrisonPicks() &&
    state.gold >= pickedUpkeep()
  )
}

// Setup actions

export function selectTileDef(defId: string | null) {
  state.selectedTileDefId = state.selectedTileDefId === defId ? null : defId
}

export function placeTile(cell: number, defId = state.selectedTileDefId) {
  if (!defId || tileAt(cell) || (state.palette[defId] ?? 0) <= 0) return
  state.tiles.push(createTile(state, ALL_TILE_DEFS[defId], cell))
  state.palette[defId]--
  if (state.palette[defId] === 0 && state.selectedTileDefId === defId) state.selectedTileDefId = null
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
  } else if (canPickUnit(ALL_UNIT_DEFS[defId])) {
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
  state.day = 1
  state.tick = 0
  state.paused = false
  state.attacks = []
  state.assignments = {}
  applyBattleEvents()
  state.phase = 'battle'
}

/** Applies the one-time effects of the battle events and the battle-long tile defense. */
function applyBattleEvents() {
  for (const event of state.battleEvents) {
    const effect = event.effect
    switch (effect.kind) {
      case 'gold':
        state.gold += effect.amount
        break
      case 'recruits':
        for (let i = 0; i < effect.amount; i++) {
          state.units.push(createUnit(state, rng.pick(Object.values(ALL_UNIT_DEFS))))
        }
        break
      case 'unitHealthLoss':
        for (const unit of state.units) unit.health = Math.max(1, unit.health - effect.amount)
        break
      case 'tileDamage':
        for (const tile of rng.shuffle(state.tiles).slice(0, effect.count)) {
          tile.health = Math.max(1, tile.health - effect.amount)
        }
        break
    }
    logLine(`[${event.title}] ${describeBattleEffect(effect)}.`)
  }
  for (const tile of state.tiles) tile.bonusDefense = battleModifier('tileDefense')
}

// Time

const tickHolds = ref(0)

/** Stops ticks until the returned release is called, e.g. while a modal is open. Not saved. */
export function holdTicks(): () => void {
  tickHolds.value++
  let released = false
  return () => {
    if (released) return
    released = true
    tickHolds.value--
  }
}

/** Ticks run during the battle unless paused, held, or an event is waiting to be seen. */
export const canTick = () =>
  state.phase === 'battle' &&
  !state.paused &&
  tickHolds.value === 0 &&
  state.pendingEvents.length === 0

export function pause() {
  if (state.phase === 'battle') state.paused = true
}

/** Starts every incoming fight with its current defenders and lets time run again. */
export function resume() {
  if (state.phase !== 'battle') return
  startFights()
  state.paused = false
}

export function togglePause() {
  if (state.paused) resume()
  else pause()
}

export function setSpeed(speed: number) {
  state.speed = speed
}

/** One tick of the battle: fights deal their slice, idle units recover, attacks spawn, days end. */
export function tick() {
  if (!canTick()) return
  state.tick++
  fightTick()
  if (state.phase !== 'battle') return
  regenTick()
  if (state.tick >= DAY_TICKS) endDay()
  else spawnTick()
}

function startFights() {
  const incoming = incomingAttacks()
  if (incoming.length === 0) return
  for (const attack of incoming) attack.status = 'fighting'
  const defended = incoming.filter((a) => (state.assignments[a.id]?.length ?? 0) > 0)
  const baseChance = goodEventChance(state.tiles) + battleModifier('goodEventChance')
  const goodChance = (attack: Attack) =>
    Math.min(1, Math.max(0, baseChance + inspiringBonus(unitsOnAttack(attack.id))))
  const triggered = rollEvents(defended, rng, EVENT_CHANCE, goodChance)
  for (const t of triggered) {
    const attack = state.attacks.find((a) => a.id === t.attackId)
    if (attack) attack.event = t.event
  }
  state.pendingEvents.push(...triggered)
}

/** Every running fight deals this tick's share of its whole-fight outcome. */
function fightTick() {
  const fighting = state.attacks.filter((a) => a.status === 'fighting')
  for (const attack of fighting) {
    const tile = tileById(attack.tileId)
    const result = previewAttack(attack)
    if (!tile || !result) continue
    for (const d of result.unitDamage) {
      const unit = unitById(d.unitId)
      if (unit) applyAbsorbed(unit, tickPortion(d.absorbed, attack.elapsed, attack.duration))
    }
    const damage = Math.min(
      tile.health,
      tickPortion(result.tileDamage, attack.elapsed, attack.duration),
    )
    tile.health -= damage
    attack.tileDamageDealt += damage
    attack.elapsed++
  }
  removeFallenUnits()
  for (const attack of fighting) {
    const tile = tileById(attack.tileId)
    if (!tile || tile.health === 0 || attack.elapsed >= attack.duration) endFight(attack)
  }
  checkCityFall()
}

function removeUnits(ids: Set<string>) {
  state.units = state.units.filter((u) => !ids.has(u.id))
  for (const attackId of Object.keys(state.assignments)) {
    state.assignments[attackId] = state.assignments[attackId].filter((id) => !ids.has(id))
  }
}

function removeFallenUnits() {
  const fallen = state.units.filter((u) => u.health <= 0)
  if (fallen.length === 0) return
  for (const unit of fallen) logLine(`${unit.def.name} fell in battle.`)
  state.fallenUnits += fallen.length
  removeUnits(new Set(fallen.map((u) => u.id)))
}

/** Frees the defenders with their after-fight endurance and settles an escape order. */
function endFight(attack: Attack) {
  const tile = tileById(attack.tileId)
  const cityRegen = passiveTotal(state.tiles, 'garrisonRegen')
  for (const unit of unitsOnAttack(attack.id)) {
    const unitRegen = unit.def.passive?.kind === 'enduranceRegen' ? unit.def.passive.amount : 0
    unit.endurance = Math.min(
      maxEndurance(unit, state.fallenUnits),
      unit.endurance + 1 + unitRegen + cityRegen,
    )
  }
  state.attacks = state.attacks.filter((a) => a.id !== attack.id)
  delete state.assignments[attack.id]
  if (!tile) return

  const prefix = attack.event ? `[${attack.event.title}] ` : ''
  if (tile.health === 0) {
    logLine(`${prefix}${tile.def.name} was destroyed!`)
  } else {
    const outcome =
      attack.tileDamageDealt > 0 ? `took ${attack.tileDamageDealt} damage` : 'the tile held'
    logLine(`${prefix}Attack on ${tile.def.name} ended, ${outcome}.`)
  }
  if (!tile.escaping) return
  const away = escapes(tile, { tileDamage: attack.tileDamageDealt })
  delete tile.escaping
  if (away) departTile(tile)
  else logLine(`${tile.def.name} could not break away.`)
}

function regenTick() {
  const elapsed = (state.day - 1) * DAY_TICKS + state.tick
  if (elapsed % ENDURANCE_REGEN_TICKS !== 0) return
  for (const unit of state.units) {
    if (isUnitLocked(unit.id)) continue
    unit.endurance = Math.min(maxEndurance(unit, state.fallenUnits), unit.endurance + 1)
  }
}

/** New attacks pause the game so defenders can be sent before the fight starts. */
function spawnTick() {
  const count = spawnCount(state.day, state.gridSize, battleModifier('extraAttacks'), rng)
  for (let i = 0; i < count; i++) {
    const spawned = spawnAttack({
      day: state.day,
      tiles: state.tiles,
      attacks: state.attacks,
      rng,
      makeId: () => nextId(state, 'attack'),
      direction: state.attackDirection,
      gridSize: state.gridSize,
      duration: ATTACK_TICKS,
      bonus: currentCity().attackBonus + battleModifier('attackBonus'),
    })
    if (!spawned) continue
    const { attack, isNew } = spawned
    const name = tileById(attack.tileId)?.def.name ?? '?'
    if (isNew) {
      state.attacks.push(attack)
      state.assignments[attack.id] = []
      const half = attack.deep ? ', half strength' : ''
      logLine(`The enemy attacks ${name} (ATK ${attack.strength}${half}).`)
    } else {
      logLine(`More enemies join the attack on ${name} (ATK ${attack.strength}).`)
    }
    state.paused = true
  }
}

function checkCityFall() {
  const keepLost = state.tiles.some((t) => t.def.essential && t.health === 0)
  const allLost = state.tiles.every((t) => t.health === 0)
  if (!keepLost && !allLost) return
  fallCity(keepLost ? 'The Keep was destroyed.' : 'Every tile was destroyed.')
}

/** Income, upkeep, healing and hoards, then the card draft. Running fights carry over. */
function endDay() {
  const income = goldIncome()
  if (income > 0) {
    state.gold += income
    logLine(`The treasury gains ${income} gold (${state.gold} total).`)
  }
  const goldBeforeUpkeep = state.gold
  const upkeep = payUpkeep(state.units, state.gold)
  state.gold = upkeep.gold
  if (state.gold < goldBeforeUpkeep) {
    logLine(`Paid ${goldBeforeUpkeep - state.gold} gold upkeep (${state.gold} left).`)
  }
  for (const unit of upkeep.dismissed) logLine(`${unit.def.name} left, the pay ran out.`)
  removeUnits(new Set(upkeep.dismissed.map((u) => u.id)))

  const cityHeal = passiveTotal(state.tiles, 'garrisonHeal')
  for (const unit of state.units) unit.health = Math.min(unit.def.health, unit.health + cityHeal)
  fillHoards(state.tiles)

  state.draft = rollDraft(state, rng, draftSize(state.tiles) + battleModifier('draftSize'))
  state.pendingCard = null
  state.phase = 'draft'
}

// Battle actions

export function unassignUnit(unitId: string) {
  if (state.phase !== 'battle' || isUnitLocked(unitId)) return
  for (const attackId of Object.keys(state.assignments)) {
    state.assignments[attackId] = state.assignments[attackId].filter((id) => id !== unitId)
  }
}

/**
 * Sends a unit to an attack, moving it from an incoming one. Running fights take reinforcements,
 * rushed in at reduced strength.
 */
export function assignUnit(unitId: string, attackId: string) {
  const attack = state.attacks.find((a) => a.id === attackId)
  if (
    state.phase !== 'battle' ||
    !unitById(unitId) ||
    !attack ||
    !state.assignments[attackId] ||
    isUnitLocked(unitId)
  ) {
    return
  }
  unassignUnit(unitId)
  state.assignments[attackId].push(unitId)
  if (attack.status === 'fighting') (attack.rushed ??= []).push(unitId)
}

export function acknowledgeEvent() {
  if (!currentEvent()) return
  state.eventIndex++
  if (state.eventIndex >= state.pendingEvents.length) {
    state.pendingEvents = []
    state.eventIndex = 0
  }
}

export function cancelPendingCard() {
  state.pendingCard = null
}

/** Adds a line to the current day's battle log entry. */
function logLine(line: string) {
  const report = state.reports[0]
  if (report?.day === state.day) report.lines.push(line)
  else state.reports.unshift({ day: state.day, lines: [line] })
}

export function hireMercenary() {
  const cost = mercenaryCost()
  if (!canHireMercenary() || cost === undefined) return
  const def = rng.pick(Object.values(ALL_UNIT_DEFS))
  state.gold -= cost
  state.units.push(createUnit(state, def))
  logLine(`Hired ${def.name} for ${cost} gold.`)
}

export const canEscape = (tile: Tile) =>
  state.phase === 'battle' && tile.health > 0 && isEscape(tile)

/** Tile damage that stops the tile from escaping its fight: dealt so far plus what is still to come. */
export function escapeDamage(tile: Tile): number {
  const attack = attackOnTile(tile.id)
  return attack ? attack.tileDamageDealt + (remainingPreview(attack)?.tileDamage ?? 0) : 0
}

/** Removes the tile from the city, its hoard is kept for the next city. */
function departTile(tile: Tile) {
  const gold = tile.hoard ?? 0
  state.tiles = state.tiles.filter((t) => t.id !== tile.id)
  state.escapedGold += gold
  logLine(
    gold > 0
      ? `${tile.def.name} escaped with ${gold} gold for the next city.`
      : `${tile.def.name} escaped.`,
  )
}

/** Unattacked tiles leave at once, attacked ones toggle an escape order for the end of their fight. */
export function escapeTile(tileId: string) {
  const tile = tileById(tileId)
  if (!tile || !canEscape(tile)) return
  if (attackOnTile(tile.id)) tile.escaping = !tile.escaping
  else departTile(tile)
}

function fallCity(reason: string) {
  state.fallReason = reason
  state.cityResults.push({ name: currentCity().name, days: state.day - 1, fallReason: reason })
  Object.assign(state, mergeUnlocks(state, state.unlocks))
  state.attacks = []
  state.assignments = {}
  state.pendingEvents = []
  state.eventIndex = 0
  state.paused = false
  state.phase = isLastCity(state.cityIndex) ? 'campaignOver' : 'cityFallen'
}

// Draft actions

function endDraft() {
  state.draft = []
  state.pendingCard = null
  state.day++
  state.tick = 0
  state.phase = 'battle'
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
    gold: state.gold + state.escapedGold,
  }
  Object.assign(state, createCity(progress, state.nextId, rng))
}

export function restart() {
  rng = createRng(Date.now())
  Object.assign(state, newCampaign(rng))
}
