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
| Assigning units | Click an attacked tile or an attack row, two-column `DefendModal` | Tap an attacked tile, tap units in its modal |
| Card draft | Popup | Popup |
| Omens, treasury, log, unlocks | Always visible in the side panel | Small buttons above the grid, each opens a modal |
| City fallen / game over | Side panel | Modal that can't be dismissed |
| Restart | Small button next to the gold in the header | Small button at the top right of the title |

The restart button asks for confirmation and is hidden on the city fallen / game over screens,
which have their own "New campaign" button.

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

The battle runs on ticks (see the Ticks section in `Game_idea.txt`). Both layouts share:
- `TimeControls` (`web/src/components/layout/TimeControls.vue`): day number, a progress bar for the
  day's ticks, Pause / Resume, speed 1x / 2x / 4x, and a hint line ("New attack on X! Send defenders,
  then Resume." in red while an attack waits for orders).
- The clock (`useGameClock`, mounted once in `App.vue`): ticks while the battle isn't paused and no
  event modal is open. Space toggles pause, a hidden tab pauses.
- An open `DefendModal` holds the ticks (`holdTicks` in the store). Closing it lets time continue,
  unless the game was paused.
- A new attack pauses the game and opens its `DefendModal` on its own (`useDefendModal`).
  The modal footer gets a Resume button while an attack waits for orders, since the time controls
  sit behind the modal backdrop.
- Attack states on the grid (`GridCell`): an incoming attack's ATK badge pulses with a "!",
  a fighting one has a thin red progress strip along the top of the cell.
- Locked units: units in a running fight show a red "Fighting at X, n ticks" badge. They are disabled
  in other attacks' modals and can't be recalled from their own. Free units can still be rushed
  into a running fight as reinforcements, at half strength, marked with a "½" on their chip and card.
- Health bar threats (tile and units) only show the damage still to come in the fight.

Desktop:
- `TimeControls` sits at the top of the side panel, where the End turn button was.
- Attacked tiles are highlighted on the grid. Clicking one, or its row in the Attacks panel, opens
  `DefendModal` (the same modal as mobile, but wide, up to 1000px, with a fixed 6vh top margin
  so it doesn't jump when units move between the columns).
- The Attacks panel lists every running or incoming attack: strength, status (incoming, or a
  ticks-left bar), its event if one rolled, the whole-fight preview with the damage still to come,
  and the defenders (locked ones have no recall). Its rows only open the modal.
- `DefendModal` has two columns:
  - left: **available garrison**, every unit not on this attack. Clicking one sends it here
    (moving it from an incoming attack if needed). Resting units first, then units on incoming
    attacks, then units locked in other fights (disabled).
  - right: **defending this attack**, the units assigned here. Clicking one recalls it while the
    attack is still incoming.
- Above the columns: the tile's health bar (tile damage still to come in yellow),
  tile info and the attack info (`AttackRow`), same as mobile.
- Clicking a tile that isn't attacked still opens the building info.

Mobile:
- `TimeControls` fills the bottom bar during the battle.
- Attacked tiles are highlighted on the grid. Tapping one opens `DefendModal`:
  - the attack info from the desktop Attacks panel (`AttackRow`).
  - the garrison: tapping a unit sends it here (moving it from an incoming attack if needed),
    tapping it again recalls it. Units locked in other fights are disabled.
- Tapping a tile that isn't attacked opens the building info.
- Per-attack event modals are the same as on desktop. They pop up when a fight starts (on Resume).

## Card draft

The draft comes at the end of every day as a popup (`DraftModal`, "Day N survived"), shared by both
layouts and rendered once in `App.vue`. It can't be dismissed, only a card or Skip ends it. Ticks wait
until a card is picked or skipped, running fights carry over into the next day.

- Unit cards: the garrison appears inside the popup, click the unit to target.
- Tile cards: the popup hides and the standing tiles are highlighted. A bar says "click a standing tile"
  with a Cancel button that brings the popup back. On desktop the bar sits under the grid,
  on mobile it fills the bottom bar.

The cards and the garrison are single-column lists on both layouts. On desktop the popup is centered
(`MobileModal`'s `centered` prop) and the side panel keeps the time controls, treasury and Attacks panel
behind it.

## Shared

- Game rules, store and state, including the mobile-only helpers `assignUnit`, `placeTile(cell, defId)`
  and `cancelPendingCard`.
- `EventModal` (battle omens and per-attack events), always on top of the mobile modals.
- `DraftModal` (end of day card draft), see Card draft above.
- `DefendModal` is shared by both layouts. It switches on `useMobile()`: one tap-to-toggle list on mobile,
  two columns on desktop (`MobileModal` takes a `wide` prop for the wider, top-anchored desktop shell).
- Panel components reused inside the mobile modals: `AttackRow`, `UnitCard`, `UnitPicker`,
  `GameOver`, `BattleEventsPanel`, `TreasuryPanel`, `TurnLog`, `UnlocksPanel`, `SetupHint`.
- `UnitCard` shows the damage an assigned unit still takes in its fight (its event included):
  yellow segments on its health and endurance bars, a "Takes -X end, -Y hp" line, red with
  "will die!" when the hit is lethal. Badges: "Fighting at X, n ticks", "Defending X" (incoming
  attack) or "Resting".
- `CityGrid` and `GridCell`, with tighter spacing and fonts at 900px or less.
  The Refugee Caravan's gold is its own badge on the cell, so it stays visible on dense grids
  where the defense line is hidden.

## Files

Mobile-only components live in `web/src/components/mobile/`:
- `MobileGame.vue`: mobile root (header, info buttons, grid, bottom action bar, modal routing).
- `MobileModal.vue`: shared modal shell.
- `BuildModal.vue`, `GarrisonModal.vue`, `DefendModal.vue` (also used on desktop).

Shared battle pieces:
- `web/src/components/modals/DraftModal.vue`: the end of day card draft popup.
- `web/src/components/layout/TimeControls.vue`: day, tick progress, pause and speed.
- `web/src/composables/useGameClock.ts`: the tick interval, space to pause, pause on hidden tab.
- `web/src/composables/useDefendModal.ts`: which attack the Defend modal shows, opens on new attacks.
