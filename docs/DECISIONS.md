# Decision records

Short records of consequential choices. Status: **accepted** unless noted.

## D1 — Building representation: node–wall graph + explicit room cycles

**Options:**
1. *Room polygons with derived walls.* Simple drawing, but shared walls are duplicated, so moving one
   desynchronises neighbours, and openings have no single host.
2. *Pure wall graph with rooms detected as faces.* Rooms are never stale, but they have no stable
   identity: names, finishes and furniture must be re-matched after every topology change.
3. *Hybrid (chosen).* A wall graph is canonical, and rooms are explicit node cycles that commands keep
   in sync (for example, a split inserts the new node into every boundary that used the edge).

**Evidence:** react-planner, verified in `src/models.js`, uses vertices/lines/holes (with `offset` along
the line) and areas as vertex lists on layers. blueprint3d uses corners/walls/rooms. Both are
unmaintained (last commits 2019 and 2016), so the pattern is borrowed but not the code. Help pages of
Space Designer 3D, Chief Architect and pCon describe the same user model: rooms close from connected
walls, walls are dragged to resize rooms, and doors and windows snap into walls.

**Consequence:** the invariants are stricter, with explicit T-junctions and no crossing walls. In
return, every view and the collision system read one graph.

## D2 — Geometry without CSG

Wall faces are decomposed into rectangles around openings, and reveals are generated explicitly.
three-bvh-csg describes itself as "experimental", needs watertight brushes and has no interactive
benchmarks. Rectangular openings in planar faces are exactly representable without it.

**Revisit if** arched or non-rectangular openings, or sloped walls, are needed.

## D3 — Pure commands + whole-model validation + snapshot history

Commands return a new project or an error. They never throw and never half-apply. Undo/redo stores
snapshots. Copy-on-write keeps unchanged entities shared, so a 200-step history stays small. Inverse
operations were rejected as error-prone (every command would need a correct inverse).

## D4 — Strict file parsing (zod)

Imported and stored projects are untrusted. zod (MIT, already widespread) gives exhaustive structural
checks with little code, and engine invariants run after it. zod silently drops `__proto__` keys, so a
pre-scan rejects prototype keys explicitly; a unit test covers this.

## D5 — Asset licensing as data

Every asset entry carries an SPDX licence, attribution and source. Only CC0 (Poly Haven) and CC-BY 4.0
(Khronos/Wayfair sofa, credited in-app) third-party models are used. Kitchen, bed, wardrobe, bathroom
fixtures and rug are modelled in code and labelled as such. No CC0 models of adequate quality were
found for them.

## D6 — 2D plan in SVG (not Canvas)

The plan is a single SVG whose `viewBox` is in metres. That gives exact shared units with the model,
per-element hit-testing (walls, corners, openings, items are real elements), crisp non-scaling strokes,
accessible structure and deterministic E2E targeting. A Canvas renderer would only win at thousands
of elements; a house has tens to hundreds. **Revisit** for very large multi-unit buildings.

## D7 — No post-processing

Phase 1 measured 500–880 ms GPU stalls from the EffectComposer (with or without AO) on an integrated
GPU. The editor renders directly with Neutral tone mapping and MSAA; furniture grounding uses cheap
contact-shadow quads. Measured result on the multi-room home: no frames over 100 ms in any interaction.

## D8 — Select first, then drag (3D)

In 3D, walls fill most of the view, so drag-to-edit on first contact would turn every attempt to orbit
into a structural edit. A first click selects; dragging an already-selected element edits it. 2D keeps
direct drag (no camera conflict there).

## D9 — Phones: view and walk, not structural editing

Structural editing needs precision pointing and screen room; on < 768 px the editor opens on the 3D
view with the walkthrough (touch joystick + look pad) and hides the tool rail. Tablets and desktops get
the full editor.

## D10 — Garden Room kept, isolated

The Phase 1 configurator is a separate module at `/garden-room` with its own tests. It is not built on
the new engine (it is a single curated scene); it remains as a working client-presentation demo and
regression baseline until the presentation mode is rebuilt on the building model.

---

# Phase 2 — immersive home experience

## D11 — Keep three.js `WebGLRenderer` + R3F; no engine switch

**Goal first.**
- Convincing interiors at human scale on integrated graphics: physically based materials, image-based
  lighting, soft grounded shadows, believable exteriors through windows, game-like navigation.
- Direct editing of the same model must keep working.

**Evaluated (official docs, fetched 2026-10-13):**
- **three.js `WebGPURenderer`.** The manual still calls it *experimental*: "depending on your scene
  you may hit missing features or get better performance from `WebGLRenderer`".
  - It does not support `ShaderMaterial`, `onBeforeCompile` or `EffectComposer`; code must be ported
    to TSL node materials.
  - Gain for us: SSGI and a new post stack. We already measured post-processing as the cause of
    300–900 ms stalls on this GPU (D7).
- **PlayCanvas.** Documented runtime lightmapper, clustered lighting, area lights, IBL, Basis texture
  compression, splats.
  - The lightmapper is the one feature we would want. Lightmaps can also be fed to three.js (`aoMap`
    and `lightMap` on a second UV set), so this is not exclusive to PlayCanvas.
  - Migration would replace R3F, Drei `CameraControls`, the picking and manipulation layer and every
    scene component, for no measured gain yet.
- **Babylon.js 8.** Announced IBL shadows and area lights.
  - Same migration cost.
  - three.js already has `RectAreaLight` and environment lighting.

**Decision:** stay on three.js r186 `WebGLRenderer`. Spend the effort on assets, materials, lighting
set-up and baked data, which transfer to any engine. No proof of concept was built, because nothing
showed a compelling, measurable advantage worth the migration.

**Revisit if:** we need hundreds of dynamic lights (clustered lighting), or `WebGPURenderer` leaves
experimental status and benchmarks faster on integrated GPUs.

## D12 — Three camera controllers, not one

Orbit, walk and fly have different constraints: a target versus none, collisions versus none,
grounded versus free vertical motion, editing picks versus pointer lock. One controller with mode
flags couples all of them.

Instead, each mode is a small component that owns the camera while mounted; the editor mounts exactly
one. Shared concerns (input, pointer lock, settings) live in `useNavInput` and the store.

Drei's `PointerLockControls` was not used:
- it has no pitch-limit API beyond polar angles;
- it has no movement model;
- our controllers need yaw and pitch as state for transitions, viewpoints, HUD and tests.

## D13 — New openings go to the nearest free span

Clicking an opening tool on an existing door or window used to fail validation with "Two openings
overlap on the same wall". That was the duplicated warning in the reported screenshot: every click
added another identical notice.

Now:
- **`addOpening`** looks for the free spans the existing openings leave on the wall (keeping the 5 cm
  clearance) and places the new opening at the nearest one, with an info note.
- **A full wall** is refused with "No free space on this wall …".
- **Validation is unchanged:** moving an opening onto another is still rejected.
- **Notices with identical text** replace one another instead of stacking.

## D14 — The sun is a light, not part of the sky image

The Meadow 2 HDRI holds 72% of its energy in the sun disc. Image-based light has no occlusion, so
with the sun left in, every surface indoors was lit by it through solid walls and roof.

Instead:
- the lighting copy of the HDRI has the sun clamped to the surrounding sky;
- one shadow-casting directional light stands in for it, pointed along the direction measured from the
  HDRI (azimuth 36°, elevation 27°), so sunlight enters only through windows and doors;
- indoors, sky light is turned down (environment intensity 1 → 0.28) and the fill becomes a warm
  hemisphere light (bounce from floors and walls) instead of blue sky above and green lawn below.

**Rejected:**
- *Light probes / irradiance volumes:* they need a baked grid that every wall edit invalidates.
- *SSAO or SSGI post-processing:* SSAO caused frame spikes in Phase 1 (D7), and three.js has SSGI only
  in the experimental WebGPU renderer (D11).

## D15 — No baked lighting while the building is editable

Evaluated:
- three.js `ProgressiveLightMap` (accumulates soft shadows into a lightmap over many frames);
- drei `AccumulativeShadows` and `BakeShadows`;
- an offline bake (Blender) of the template homes.

All of them assume static geometry with a non-overlapping lightmap UV atlas. Here, walls, rooms,
openings and furniture change on every edit, and wall UVs are in metres for tiling textures, not an
atlas. A bake would be invalid after the first edit and would need a re-unwrap and re-bake each time
(seconds to minutes).

Real-time shadows from one sun (soft PCF) plus skirting and contact shadows give the grounding we can
afford. A one-off "presentation bake" of a finished design remains a possible later feature.

## D16 — Quality levels change only measured costs

On the integrated GPU, frame time is driven by pixel count: going from 1× to 1.5× resolution doubled
it. The sun shadow costs about 4 ms; one room light about 0.

| Level | Resolution | Sun shadow | Room lights | Sky |
|---|---|---|---|---|
| Performance | 1× | 1024, light blur | off | 2K |
| Balanced (default) | up to 1.25× | 2048, soft | on | 2K |
| Quality | up to 2× | 4096, soft | on | 4K |

**Room lights.** There is one real light, which follows the camera into the room it is in; every room
still shows its ceiling fixture. Six point lights added 20–30 ms per frame over one (16.8 → 37.5 and 45.9 ms, two runs at the same
resolution), because three.js' forward renderer shades every light on every pixel. A light count that never changes also avoids
recompiling shaders when switching modes.

The level is kept per viewer, with the navigation settings, not in the project.

## D17 — Templates are declarative specs replayed through the editor's commands

A house template is a `HouseSpec`: rooms (rectangles or polygons), openings given as points on walls,
and furniture with finishes. `buildHouse` replays it through `createRoom`, `addOpening` and `addItem`,
exactly as a user would.

Consequences:
- **A template can't contain geometry the editor couldn't make.** It goes through the same validation,
  and a build step that fails or moves an opening throws.
- **Each template is a fresh project** with new ids, so a user's copy never aliases the template.
- **Card numbers are computed from the built model** (bedrooms, bathrooms, floors, net area), never
  typed in.
- **Every template must pass an invariant suite** (`tests/unit/engine/templates.test.ts`):
  - valid model, and an exact save/load round trip;
  - known finishes and assets;
  - furniture inside its room, clear of walls;
  - a front door, with every room reachable by walking from it;
  - daylight in habitable rooms;
  - a thumbnail.

**Rejected:**
- *Static JSON project files:* they would need migrating with every schema change, and wouldn't
  exercise the commands.
- *Hand-built 3D scenes per template:* they would diverge from the editable model (brief requirement).

## D18 — Thumbnails are captured from the real renderer

**Assets:** `scripts/capture-thumbnails.mjs` loads a development-only page (`/__studio`, excluded from
production builds by `import.meta.env.DEV`, which the release grep confirms). The page renders one
catalogue item with the editor's own `Items` renderer on a transparent background.

**Templates:** each house is opened through the real UI (Designs → card → create → 3D overview) and
its canvas is captured.

Thumbnails are therefore pictures of the actual asset or house as the user will see it, and they can
be regenerated after any visual change. If a picture is missing, the UI falls back to drawings from
data: the footprint for assets, the plan for templates.

## D19 — Open-air rooms are rooms

Balconies, terraces and courtyards are rooms with an outdoor type. They:
- get no ceiling or roof slab, skirting or room light;
- count as "outside" for `wallSides(p, indoorOnly)`, so the walls facing them get the facade finish,
  external sills and eaves;
- can be enclosed by low parapet walls (minimum wall height lowered to 0.9 m), which still block the
  walkthrough.

This keeps courtyards and balconies as editable model data, with no special-case geometry.

## D20 — Where an item sits is decided by the engine, from the asset's mounting

Real homes have mirrors and art on walls, pendants and fans on ceilings, and vases and lamps on tables.
The catalogue describes this with three fields:
- `mount: 'wall' | 'ceiling'`, plus `wallHeight` for wall items;
- `surface`: the height of a usable top;
- `onSurfaces`: small items that stand on whatever top is under them.

`placeItem` (pure, in `engine/commands/placement.ts`) resolves the actual position on every
add/move/rotate/duplicate. One rule therefore serves the 2D plan, 3D picking, templates and the
walkthrough:
- **Wall items** snap flat against the nearest inner wall face long enough to hold them, face into the
  room, and get `z` set to the mounting height. Rotating them is ignored (the wall decides), and they
  re-snap when walls move.
- **Items on surfaces** take the highest top under their centre (stacking works), or the floor.
  Moving a table carries what stands on it.
- **Ceiling items** hang from the level's ceiling; the renderer resolves this from the level height,
  so changing the storey height keeps them on the ceiling.
- **Walkthrough collisions ignore** wall and ceiling items and anything raised above 25 cm.

`Item.z` is optional and bounded (0–4 m) in the parser, so older projects load unchanged.

**Rejected:** free 3D placement with gravity or physics. It is heavier, harder to make predictable,
and not needed for furnishing a home.

## D21 — Kitchens, bathrooms, beds and wardrobes are parametric; mirrors reflect only at Quality

No redistributable, realistic, contemporary models of these were found (RESEARCH.md Phase 3).
Professional tools model cabinetry parametrically anyway, so these are built in code from real parts:
- **Cabinetry:** recessed plinths, carcasses, separate fronts with 3 mm shadow gaps, bar pulls.
- **Worktops:** extruded slabs with real cut-outs, so an undermount sink is visible through the hole.
- **Appliances:** a ceramic hob with burner rings, a built-in oven, a swept-tube gooseneck tap.
- **Sanitaryware:** an extruded hollow bath shell, a lathed vessel basin, a lathed wall-hung WC.
- **Bedroom:** channel-tufted headboards, pillows and a folded duvet.

Every surface is a CC0 PBR texture set (veneers, quartz, terrazzo, ceramic, fabrics), cached per
spec. Finish variants (front + worktop + handle metal; cabinet colour; upholstery) are validated item
variants (D20), so they undo and save.

**Mirrors:**
- At the **Quality** level, a mirror is a true planar reflection (three's `Reflector`: one extra
  render of the scene into a 512-px target), only while the camera is within 6 m.
- Otherwise it is a polished metal surface reflecting the environment map, at no extra cost.
- **Measured** in the bathroom, at Quality and 1× resolution: 20.9 ms with the reflection versus
  16.8 ms for Quality without one in P3-M2, about +4 ms.
- **Rejected:** reflections on every glossy surface (SSR) or cube cameras. They cost a pass per
  probe or per frame, for little gain in a home tour.

## D22 — Startup: compile shaders in parallel before the first frame

Opening the editor froze the main thread for 3–4 s. A CPU profile showed three.js linking about
16 shader programs synchronously in the first draw (3.6 s) and uploading textures (1.9 s), on
ANGLE/D3D11.

The fix: a `Precompile` component calls `renderer.compileAsync(scene, camera)`, which uses
KHR_parallel_shader_compile, after the scene's assets load. The render loop is held at `'never'`
until it resolves, so the page stays responsive meanwhile.

**Measured on the production build** (long tasks over the first 9 s, same machine):

| | Total blocked | Longest freeze |
|---|---|---|
| P3-M2 build | 5.0 s | 3.2 s |
| P3-M3 build | 3.9 s | 1.75 s |

That is with more materials than before.

**Also:**
- Finish textures now load only for finishes in use; the library has about 30 sets.
- The fixtures' surface textures and the project's finishes are preloaded in parallel. On-demand
  loading inside a multi-surface component had serialised requests: the walnut on a bed's legs
  started 5 s late.

**Rejected:** turning off three's shader error checks in production. Measured, it only moves the
stall to the first draw.

**Remaining:**
- texture upload (~1.9 s): KTX2/Basis compression would cut it, but needs the KTX toolchain;
- shaders for models that finish loading after the precompile still compile on first use.

## D23 — Multi-storey: floors are levels; stairs are a validated element; walking is one state machine

**Levels** already existed in the model, each with an elevation and a storey height. A new floor sits
one storey plus a 0.3 m slab above the one below. Only the top floor can be removed, and that also
removes the stairs to it, so no floor is left floating.

**Stairs** are a new optional `Project.stairs` record: a straight flight with a footprint (centre,
rotation, width, length) on the floor it rises from.
- Everything else is derived, never stored: the next floor up, the rise, the riser count (rise ÷
  0.175 m, rounded), the riser height and the going. A stair can therefore never disagree with the
  floors.
- Single-storey projects carry no `stairs` key, so earlier saves are unchanged and still valid.
- `validateProject` refuses:
  - a flight with no floor above;
  - a going outside 22–36 cm, or a width outside 0.8–2.4 m;
  - a flight not inside one room below, or a stairwell not inside one indoor room above (which also
    means neither crosses a wall);
  - no 0.5 m to step on or off;
  - floor-standing furniture on the flight or in the stairwell;
  - overlapping flights;
  - a flight that starts inside the stairwell of the flight below (stacked flights sit side by side,
    scissor-fashion).
- The same rules check the stair alone, fast enough for "Add stairs" to try every position in every
  room. Positions within 1 m of a doorway on either floor are skipped, and a clear message is given
  when there is no room.

**Walking** is a small state machine in the engine: `{x, y, level, stair}`.
- On a floor, that floor's colliders apply. A flight is fenced on its sides and at its head below, and
  its stairwell is guarded on three sides above.
- Stepping into a flight (only possible at its foot or from the landing) puts you on the stairs, where
  only the side rails constrain you and your height follows the run.
- Walking off either end lands you on that floor.
- The same `walkStep` drives the walkthrough, the template reachability test and the unit tests, so
  "every room is reachable" now includes climbing.

**Rendering:**
- Editing shows the active floor (cut away) on top of the floors below at full height. The floors
  above are lifted off.
- Walking and flying show the whole house.
- Each floor below another is capped by its roof slab and fascia, which reads as the slab band between
  storeys and is cut where stairs rise through it.
- Floors and ceilings get stairwell holes.
- Flights are parametric: timber steps with real-scale plank UVs, a plastered waist slab, a glass
  balustrade with steel handrail on open sides and a wall rail along walls. Stairwells get a slab-edge
  lining and a glass guard.

**Rejected:**
- Stairs as furniture items: they need two floors, their own validation and their own walking
  behaviour.
- Storing the step count: it would go stale when a storey height changes.

**Not yet:** L- and U-shaped flights with landings, spiral stairs, double-height voids without stairs,
and per-floor storey heights in templates.

## D24 — Fewer draw calls: merge joinery per material; hide furniture on floors out of sight

Multi-storey doubled what is on screen. The villa walked at 30 fps (1,220 draw calls). Counting
meshes by group showed door and window joinery at 481 calls (about 9 boxes per opening) and
furniture at 502.

**`MergedParts`:**
- It merges its static children into one mesh per material after mount.
- The original parts stay mounted as declarative JSX, but hidden and unpickable, so picking and
  editing are unchanged.
- A signature of the opening's shape triggers a re-merge. Moving an opening needs no re-merge,
  because the merge is in the opening's own frame.
- Joinery went from 481 to 138 calls. The compact home dropped from 584 to 478 calls; the villa walks
  at 60 fps median again.

**Off-floor furniture while walking:**
- Furniture on floors you can't see (not your own, and not the other end of a flight you are on or
  within 4 m of) is hidden.
- Walls and floors stay, so the view through a stairwell is intact.
- Hiding it rather than unmounting matters: the first version unmounted it and stalled 2.2 s when it
  came back.

**Next candidates:** merging walls per room (227 calls in the villa), and instancing repeated models.
