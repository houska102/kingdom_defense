# Canvas city grid

The city grid is drawn on a [CanvasEngine](https://canvasengine.net/) canvas (PixiJS underneath).
The canvas only draws the city. Stats, badges, highlights and clicks stay in the HTML cells on top of it.

## Layers

```
CityGrid.vue
├── CityCanvas.vue      canvas, absolutely positioned, pointer-events: none
└── .city-grid          HTML GridCell buttons, transparent, gap 0
```

- Cells sit flush (no gap) so each HTML cell lines up exactly with its canvas cell.
- `GridCell.vue` has no background of its own, only a dark fade at the bottom so the stats stay readable.
- Both the desktop and the mobile layout use `CityGrid`, so both get the canvas.

## Files

| File | Role |
| --- | --- |
| `web/src/game/cityLayout.ts` | Pure rules: which walls join, where roads go. Tested in `cityLayout.test.ts`. |
| `web/src/canvas/cityScene.ts` | Turns game tiles into scene data and holds it in CanvasEngine signals. |
| `web/src/canvas/CityScene.ce` | The CanvasEngine scene: three `Graphics` layers. |
| `web/src/canvas/drawTiles.ts` | All drawing code, plain Pixi `Graphics` calls. |
| `web/src/components/board/CityCanvas.vue` | Starts, resizes and destroys the canvas, feeds it the game state. |
| `web/src/canvas/ce.d.ts` | Lets TypeScript import `.ce` files. |

`vite.config.ts` registers the `@canvasengine/compiler` plugin, which compiles `.ce` files.

## Data flow

```
store.ts state (Vue reactive)
  -> watchEffect in CityCanvas.vue
  -> syncScene() / buildScene() in cityScene.ts
  -> signals: sceneTiles, sceneRoads, sceneGrid, sceneSize
  -> draw functions in drawTiles.ts (re-run when a signal they read changes)
```

- `bootstrapCanvas` can't pass props to the root scene, so the signals are module-level and the draw
  functions import them directly.
- A `Graphics` `draw` function runs inside an effect: every signal it reads makes it redraw.
- Each scene tile carries: `cell`, `defId`, `ruined`, `links` (sides joined to walls) and `gates`
  (road axes crossing a wall).

## Scene layers (`CityScene.ce`)

Drawn bottom to top, each one redraws the whole board:

1. **Ground**: grass checkerboard with faint grid lines.
2. **Roads**: dirt paths from cell centre to cell centre for every road link.
3. **Tiles**: every building, wall and ruin.

## Walls

- Wall tiles: Wall, Bastion, Stockade, Last Bastion (`WALL_DEF_IDS`).
- Fortified buildings: Keep, Watchtower, Barracks, Ballista Tower (`WALL_JOINING_IDS`).
- A tile joins a neighbour (up, down, left, right) when both are standing, both are walls or fortified,
  and at least one of them is a wall. Two fortified buildings never join each other.
- A join is drawn as a wall section from the cell centre to the shared edge, so neighbours meet seamlessly.
- Wall and fortified tiles are drawn centred in their cell so their sections line up.
- Ruined tiles (0 health) don't join anything and are drawn as rubble.

## Roads

- Roads start at the Keep. Without a standing Keep there are no roads.
- A breadth-first search spreads from the Keep through standing non-wall tiles (fortified buildings included).
- Every adjacent pair of reached tiles gets a road segment.
- **Gates**: a single standing wall tile with a reached tile on one side and a standing non-wall tile
  directly opposite is crossed. Both segments through the wall are added.
- Two walls in a row, or a wall with nothing behind it, block the road. Ruined tiles block it too.
- Gates are only visible on the Stockade (a road passage with wooden gate leaves). Wall, Bastion
  and Last Bastion are drawn solid over the road.

## Drawing style

- Everything is seen from directly above: buildings are roofs with a small shadow down-right,
  lit from the top left.
- Helpers in `drawTiles.ts`: `gableRoof`, `hipRoof`, `cone`, `roundTower`, `squareMerlons`, `shadow`, `shade`.
- Coordinates are 0..1 inside a cell, `cellAt()` maps them to canvas pixels.
- Non-fortified buildings are lifted up a bit (`BUILDING_LIFT`) because the stats overlay covers
  the bottom of the cell.
- Buildings without their own drawer get a hip roof coloured from a hash of their id.

| Tile | Drawing |
| --- | --- |
| Keep | Curtain wall, paved courtyard, slate roof in the middle, round corner towers |
| House | Red gable roof with a chimney |
| Watchtower | Round stone tower, ring of battlements, blue cone roof |
| Barracks | Walled compound: hall roof on top, training yard with a target below |
| Ballista Tower | Square tower with battlements, ballista on a wooden platform aimed north |
| Refugee Caravan | Covered wagon with wheels and a shaft |
| Wall / Bastion / Last Bastion | Stone post with battlements plus wall sections, Last Bastion has a red banner |
| Stockade | Wooden stakes, can show a gate |

## Canvas lifecycle (`CityCanvas.vue`)

- `bootstrapCanvas` runs on mount with `enableLayout: false`. CanvasEngine's flex layout would
  otherwise place the layers side by side instead of on top of each other.
- A `ResizeObserver` updates `sceneSize` and resizes the renderer, because the board width changes
  with the grid size and the layout, not only on window resize.
- On unmount the scene and the Pixi app are destroyed. An unmount during the async bootstrap is handled too.

## Notes

- CanvasEngine and Pixi add a ~1.1 MB chunk to the build (Vite warns about the size).
- `BootstrapOptions` types every Pixi option as required, hence the cast in `CityCanvas.vue`.
