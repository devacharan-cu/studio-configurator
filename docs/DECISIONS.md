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
