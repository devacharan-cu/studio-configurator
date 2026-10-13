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
