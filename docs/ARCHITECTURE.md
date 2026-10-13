# Architecture — building engine

The project model is the single source of truth. The 2D plan, the 3D scene, the walkthrough and saved
files are all *derived* from it. Nothing reads geometry back out of the WebGL scene.

```
src/engine/        pure TypeScript, no React / three.js — unit-tested in Node
  model/types.ts     schema v1, units, tolerances, limits
  model/query.ts     read-only topology queries
  model/validate.ts  structural invariants (the definition of a "valid building")
  model/project.ts   factory, strict parsing of untrusted JSON (zod + invariants), versioning
  geometry/          vec, polygon (area, simplicity, inset, ear-clipping), walls (junctions, solids)
  commands/          pure edit operations → new Project or a structured error
  history.ts         snapshot undo/redo
  metrics.ts         areas, dimensions for labels/inspector
  walk.ts            walkthrough colliders + swept collision
  templates.ts       templates built through the public commands
  assets/            asset + finish metadata (licence, footprint, normalisation)
src/editor/        React app: store, 2D plan (SVG), 3D view (R3F), walkthrough, UI   (from M2)
src/garden-room/   Phase 1 configurator, preserved at /garden-room as a regression baseline (from M2)
```

## Units & coordinates

- Metres everywhere in the model; display formatting is separate (`fmtLen`, `fmtArea`).
- Plan `(x, y)`: x → east, y → south. World: `X = x`, `Z = y`, `Y` = up. The plan SVG uses the same
  numbers (viewBox in metres), so 2D and 3D cannot disagree on scale.
- A level has `elevation` (finished floor) and a default wall `height`. Walls carry their own height.
- Item origin = footprint centre on the floor; `rotation` about +Y, counter-clockwise seen from above;
  at rotation 0 an asset's front faces +y (south). Assets are normalised to this with `yaw`/`scale`.
- Tolerances: points within 5 mm are equal; drawing snaps within 2 cm; minimum wall 0.2 m, room 0.8 m².

## The model (schema v1)

| Entity | Key fields | Notes |
|---|---|---|
| Level | elevation, height | multi-storey ready; one level used by the slice |
| Node | level, x, y | a wall junction / corner |
| Wall | a, b (nodes), thickness, height | an edge of the planar graph; **shared** by the rooms on both sides |
| Room | boundary (node cycle), name, type, finishes | consecutive boundary nodes must be joined by a wall |
| Opening | wall, kind, offset, width, height, sill, hinge, swing | `offset` = distance from wall node `a` to the opening centre |
| Item | asset, level, x, y, rotation | furniture/fixtures from the asset catalogue |

Why a node–wall graph with explicit room cycles (see DECISIONS.md D1): shared walls are one entity,
so moving it updates both rooms by construction; openings belong to exactly one host wall; rooms keep a
stable identity and their properties across edits; and the same graph feeds 2D rendering, 3D solids
and walkthrough collision.

### Invariants (`validateProject`)
References resolve; walls ≥ 0.2 m, sensible thickness/height, no duplicates; **walls never cross**
except at shared nodes; **no node lies inside a wall** (T-junctions are explicit splits); walls don't meet
at < 10°; rooms are closed by walls, simple, ≥ 0.8 m² and don't overlap; openings fit inside the
usable (inner-face) length of their wall with 5 cm clearance and don't overlap; items reference known assets.

## Commands

Every edit is a pure function `(project, args) → { ok, project, label, warnings } | { ok: false, error }`.
Commands work on a copy-on-write `Draft` and finish by running `validateProject` on the *whole*
result, so a rejected edit returns an explanation and the previous project is untouched — there is no
half-applied state to roll back.

| Command | Behaviour |
|---|---|
| `createRoom(points)` | corners snap to existing corners; corners landing on a wall split it (T-junction); edges reuse existing walls and pick up corners lying on them → adjacent rooms share walls |
| `moveWall(wall, distance)` | moves the wall's **collinear run** along its normal (so a wall split by a T-junction moves as one straight wall); connected walls stretch |
| `moveNode` | moves a corner; connected walls follow |
| `setRoomSize(axis, size)` | numeric width/depth for square-cornered rooms (moves the east/south wall run) |
| `updateWall`, `updateRoom`, `deleteRoom`, `addLevel` | |
| `addOpening`, `moveOpening`, `updateOpening`, `deleteOpening` | |
| `addItem`, `moveItem`, `rotateItem`, `replaceItem`, `deleteItem` | |

After structural moves, two coherence passes run before validation:
1. **Openings re-anchor**: each opening's old world centre is projected onto its wall's new axis and
   clamped into the usable range — doors stay put when a wall is stretched from the other end; if one
   can no longer fit, the whole edit is rejected with a message naming it.
2. **Furniture is pushed** inside its room's inner faces when a wall moves into it; if it can't fit, the
   edit succeeds with a warning.

## Geometry derivation

- **Junctions** (`wallOutline`): at each node, incident walls are sorted by angle; each corner is the
  intersection of one wall's left face line with the next wall's right face line (a mitre, limited to
  4× half-thickness). Handles L/T/X junctions and mixed thicknesses without booleans.
- **Solids** (`wallSolid`): each long face is a rectangle in wall coordinates (u along the wall, v up),
  with openings removed by decomposing it into rectangles (strips + below-sill + above-head). Reveals
  (jambs, head, sill), end caps and a top polygon are added. No CSG — deterministic, cheap, testable.
  `displayHeight` gives cut-away views without touching the model.
- **Floors/ceilings**: room polygons, ear-clipped.
- **Wall sides → rooms** (`wallSides`) drive per-side finishes; sides with no room are exterior.

## Editing & synchronisation

One store holds `history.present` (the project). The 2D plan and 3D view both render from it. A drag
is a sequence of *previews* (the command applied to the drag's start project, validated, not committed)
and one *commit* on release — a single undo step. Invalid previews keep the last valid shape and show
the reason. 2D and 3D manipulators call the same commands, so they cannot diverge.

## Persistence

`serializeProject` → JSON. `parseProject` (import, local storage) rejects oversized input, prototype
keys, unknown schema/versions, fails strict zod validation (ids, ranges, no extra fields, key/id
match), migrates by version, and finally runs `validateProject`. Projects autosave to `localStorage`.
