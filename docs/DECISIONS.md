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
