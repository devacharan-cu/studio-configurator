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
src/editor/        React app: store, 2D plan (SVG), 3D view (R3F), manipulator, walkthrough, UI
src/garden-room/   Phase 1 configurator, preserved at /garden-room as a regression baseline
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

## Rendering

- **One material per finish**, shared by every wall/floor using it; textures tile at physical size via
  metre UVs. Each wall is one mesh with material groups (left face, right face, trims, top).
- **Incremental regeneration**: each wall mesh is memoised on a *signature* of everything that affects
  it (its corners, every wall at its two junctions, its openings, the finishes on both sides, display
  height). Dragging a wall rebuilds only the walls whose junctions changed.
- **Cut-away** lowers walls to 1.15 m for the overhead view by passing `displayHeight` into the same
  solid generator — the model's heights never change. Windows and frames are clipped to match.
- **Site and lighting (Phase 2 M2, `Site.tsx`, `sky.ts`, `quality.ts`)**:
  - the sky is a real HDRI (Poly Haven "Meadow 2", CC0): a tone-mapped JPEG as the background and a
    copy with the sun clamped out for image-based light;
  - one shadow-casting sun along the HDRI's measured sun direction, with soft PCF shadows;
  - a lawn that fades into the horizon, a paved terrace and a path from the front door
    (`entrances()`);
  - a flat gravel roof (`roofPlan()`) in walk and fly, so sunlight reaches rooms only through openings;
  - indoors, sky light is turned down and a warm bounce fill takes over (D14);
  - one room light follows the camera, and every room has a ceiling fixture (D16);
  - no post-processing (D7) and no baking (D15); quality levels in D16.
- **Architectural detail** (derived, never stored; `engine/geometry/site.ts`, `Building.tsx`):
  - skirting along every inner wall face, stopped at doors and passages (`skirtingRuns()`);
  - windows: slim frames, mullions, glass, an external sill and an internal board;
  - doors and passages: linings and architraves on both faces;
  - door leaves with lever handles on both sides;
  - textured plaster ceilings.
- Per-item soft contact shadows ground the furniture.
- **Frame loop**: on-demand while editing (renders only on change); continuous in walk and fly.

## 3D editing

Picking uses R3F pointer events on the derived meshes; selection is the same store value the 2D plan
uses. A press on an *already selected* wall, opening or item starts an edit drag: the pointer ray is
intersected with a horizontal plane through the grab point and the plan-space delta is turned into
`moveWall` / `moveOpening` / `moveItem` — the same commands, previews and single-step commits as 2D.
Camera controls are suspended only for that drag; a press on anything unselected orbits as normal.

## Camera modes and navigation (Phase 2)

There are three camera modes, each a separate controller, rather than one controller doing every job
(`store.camera`):

| Mode | Controller | Purpose | Constraints |
|---|---|---|---|
| `orbit` | `OrbitRig` (drei `CameraControls`) | editing and inspection: orbit, pan, dolly to cursor, presets, frame selection | above the ground (polar ≤ 88.9°) |
| `walk` | `Walkthrough` | human-scale experience | engine colliders; eye height 1.6 m; pitch ±85°; no roll |
| `fly` | `FreeFly` | unconstrained architectural inspection | no collisions; never below 0.12 m; pitch ±89°; no roll |

- **Input** (`useNavInput`, shared by walk and fly):
  - Clicking the canvas, or the "Click to look around" prompt, takes pointer lock with raw input
    (`unadjustedMovement`), falling back to plain pointer lock, then to drag-to-look.
  - Esc releases the lock (the browser's own behaviour). A second Esc returns to the editor; the first
    Esc's keydown is ignored for 250 ms after unlocking.
  - Keys go into a shared `walkInput` set that the controllers read every frame. The touch joystick,
    look pad and up/down buttons write to the same object.
- **Movement** is velocity-based. The approach toward the target speed is `1 − e^(−rate·dt)`, which is
  frame-rate independent (unit-tested). Walking accelerates at 9/s and decelerates at 12/s; Shift
  multiplies speed by 2.2.
  - Walk motion goes through `moveWithCollisions`, sub-stepped at half the body radius, so even a 5 m
    single-frame step cannot pass a wall (unit-tested).
  - After each step the velocity is set to the displacement actually achieved. Walking along a wall
    keeps its tangential component; walking straight into it stops.
- **Look** is yaw and pitch on an Euler YXZ with z = 0, so there is never roll. Yaw is unrestricted.
- **Field of view** is 45° in orbit and 62° in walk/fly (about 90° horizontally on 16:10), eased on
  every mode change.
- **Arrival** (`spawnPoint`, `arrivalHeading`, `walkablePoint`):
  - The walkthrough starts about 1 m inside the front door (the widest exterior door), like a visitor.
  - On arriving in a room you look along its longest sight line *within that room*, over furniture
    below 1.4 m (you can see over a bed, not a wardrobe). Probing walkable space instead sent the view
    out through the nearest doorway.
  - "Go to room" places you at a free point inside the room, nearest its centre (rooms often have a
    table or bed in the middle).
- **Transitions**:
  - Entering walk glides from the orbit camera in 0.8 s.
  - Fly starts exactly where the orbit camera was.
  - Leaving either mode glides back to the orbit pose the user left (`savedOrbit`, module state that
    survives the rig unmounting).
  - Walk ↔ fly switch directly.
  - Selection and the project are untouched by navigation (E2E-tested).
- **Immersive layout**: in walk and fly, the top bar, tool rail, library, inspector and plan are not
  rendered, so the canvas fills the window. The HUD carries:
  - exit, the mode switch, "Go to room" (walk) or "Viewpoints" (fly);
  - navigation settings (look sensitivity, walk/fly speed, invert Y), persisted per viewer, with
    validated reads;
  - a full-screen toggle and a collapsible controls legend.
- **Orbit framing** (`framing.ts`, pure):
  - `presetPose` computes the exact distance at which all eight corners of the building box are on
    screen for the viewport's aspect (overview, top, four elevations). Unit-tested at five aspects and
    six presets, and reused by the E2E picking helper.
  - An untouched overview refits when the viewport changes shape (split ↔ 3D).
  - F frames the selection and H frames the home.

## Walkthrough collision

`buildColliders` turns walls into capsules along their centrelines, interrupted at doors and passages
(windows stay closed), plus furniture footprints taller than 25 cm. The visitor is a 0.25 m circle;
`moveWithCollisions` sub-steps the motion (no tunnelling) and resolves penetrations iteratively, so the
visitor slides along walls. Eye height 1.6 m above the current level. Room awareness uses the room
polygons; "go to room" jumps to each room's interior point. Ceilings are shown while walking.

## Performance (measured — see TESTING.md)

Engine, compact home (Node): `moveWall` + full validation 0.79 ms; `validateProject` 0.31 ms; all 19
wall solids 0.29 ms; one collision step 40 µs. Browser (AMD Radeon 610M iGPU): 2D wall drag, 3D orbit,
view switches and walking all held median/p95 16.7/16.8 ms with zero frames over 100 ms.
