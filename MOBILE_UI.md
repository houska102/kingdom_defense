# Mobile vs desktop UI

The game has two layouts that share the same game rules and store (`web/src/game/store.ts`).
Only the way the player interacts with it differs.

## Switching

- At a viewport width of **900px or less** the mobile layout is used, otherwise the desktop layout.
- `web/src/composables/useMobile.ts` watches `matchMedia('(max-width: 900px)')`.
- `web/src/App.vue` renders `MobileGame` on mobile and the three-column layout on desktop.
- Resizing the window switches layouts live, the game state is kept.

## Overview

| | Desktop | Mobile |
| --- | --- | --- |
| Default view | Garrison, grid and side panels side by side | Only the grid |
| Building | Pick in the Buildings palette, click an empty cell | Tap a cell, pick in the build modal |
| Garrison picking | Always visible next to the grid during setup | Separate step behind "Pick garrison" |
| Assigning units | Select a unit, then click an attack or its tile | Tap an attacked tile, tap units in its modal |
| Card draft | Side panel | Modal |
| Omens, treasury, log, unlocks | Always visible in the side panel | Small buttons above the grid, each opens a modal |
| City fallen / game over | Side panel | Modal that can't be dismissed |

## Setup

Desktop:
- Battle omens pop up (city 2 onwards).
- The player picks buildings from the palette and clicks cells, clicking a placed tile removes it.
- The garrison picker is shown at the same time, "Defend the city" starts the battle.

Mobile:
1. Battle omens pop up (city 2 onwards), same modal as desktop.
2. **Build step**: only the grid is shown. Tapping a cell opens `BuildModal`:
   - empty cell: list of remaining buildings, tapping one places it.
   - placed tile: Remove button and the other buildings to replace it with.
   - prebuilt tile: info only, can't be moved.
3. "Pick garrison" at the bottom (enabled once the Keep is placed) ends the build step.
4. **Garrison step**: `GarrisonModal` shows the garrison picker and setup hints.
   "Back to building" returns to the grid, "Defend the city" starts the battle.

## Battle

Desktop:
- Select a unit in the garrison list, then click an attack in the Attacks panel or its tile on the grid.
- The Attacks panel lists every attack with its combat preview.

Mobile:
- Attacked tiles are highlighted on the grid. Tapping one opens `DefendModal`:
  - the attack info from the desktop Attacks panel (`AttackRow`): strength, merged or half strength,
    combat preview, assigned defenders with recall.
  - the garrison: tapping a unit sends it here (moving it from another attack if needed),
    tapping it again recalls it.
- Tapping a tile that isn't attacked does nothing.
- The bottom bar shows how many attacks are defended and the "End turn" button.
- Per-attack event modals are the same as on desktop.

## Card draft

Desktop: the draft replaces the Attacks panel. Tile cards target a tile on the grid, unit cards target a unit
in the garrison list.

Mobile: the draft opens as a modal.
- Unit cards: the garrison appears inside the modal, tap the unit to target.
- Tile cards: the modal hides, the bottom bar says "tap a standing tile" with a Cancel button
  that brings the draft back.

## Shared

- Game rules, store and state, including the mobile-only helpers `assignUnit`, `placeTile(cell, defId)`
  and `cancelPendingCard`.
- `EventModal` (battle omens and per-attack events), always on top of the mobile modals.
- Panel components reused inside the mobile modals: `AttackRow`, `UnitCard`, `UnitPicker`, `UnitRoster`,
  `CardDraft`, `GameOver`, `BattleEventsPanel`, `TreasuryPanel`, `TurnLog`, `UnlocksPanel`, `SetupHint`.
- `CityGrid` and `GridCell`, with tighter spacing and fonts at 900px or less.

## Files

Mobile-only components live in `web/src/components/mobile/`:
- `MobileGame.vue`: mobile root (header, info buttons, grid, bottom action bar, modal routing).
- `MobileModal.vue`: shared modal shell.
- `BuildModal.vue`, `GarrisonModal.vue`, `DefendModal.vue`, `DraftModal.vue`.
