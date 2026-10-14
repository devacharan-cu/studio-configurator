# Testing record

## Phase 3 — M4 first batch of house templates (2026-10-15)

| Command | Result |
|---|---|
| `npx tsc -b` / `npx oxlint` / build | pass / 0 / pass |
| `npx vitest run` | 225/225 (the invariant suite now runs for all 7 houses) |
| `npx playwright test` | 57 passed, 2 skipped (viewport-specific) |

**Seven templates** (one existing plus six new). Every one passes the invariant suite:
- valid model and an exact save/load round trip;
- known finishes, assets and variants;
- furniture inside rooms and clear of walls;
- a front door, with every room reachable on foot from it;
- daylight in habitable rooms;
- numbers derived from the model;
- a captured thumbnail.

**New E2E `templates.spec.ts`**, for **each** of the six new houses in the production build:
- open it from the gallery, and check the saved project has the preview's room count and the plan
  draws the rooms;
- the 3D canvas renders;
- **walk into every room** through "Go to room", and the HUD agrees each time;
- change the first room's floor to terrazzo, then reload, and it persists;
- no console errors or failed requests.

The gallery test also checks each card's numbers.

**Hands-on tour** (dev server; scratch script):
- every template opened from the gallery and every room visited in the walkthrough: 7 houses,
  73 rooms;
- the aerial view with roof checked;
- no console errors.
- Screenshots: `docs/screenshots/editor/p3m4-*.jpg`.

**Defects found while building the templates, all fixed before commit:**
- **Engine:** a balcony's glazed door counted as the house's front door, so the walkthrough started
  on the balcony. Entrances must now lead outside, not to a parapet-enclosed balcony or courtyard.
- **Layout:**
  - furniture overlapping walls by 1–10 cm (seven items);
  - doors blocked by a dining table, a bookcase, a bed, a wardrobe and a pooja console;
  - a bedroom too tight for a double bed plus a wardrobe;
  - a corridor too narrow for a bench;
  - a picnic table filling a terrace;
  - two 1.2 m wall segments too short for a 1 m passage (the engine refused, correctly).
- **Display:** a studio card read "0 bed" (now "Studio"); the charcoal facade in shade read as black
  (lightened).
- **Test race:** the corrupted-save E2E failed only in the full run. Under load, the lazily loaded
  editor ran after the test had written the corrupted save, and persisted its template over it before
  the reload. The test now waits for the editor before corrupting the save. Its assertions are
  unchanged.

---

## Phase 3 — M3 materials and interior realism (2026-10-15)

| Command | Result |
|---|---|
| `npx tsc -b` / `npx oxlint` / build | pass / 0 / pass; no dev handles or studio in `dist/` |
| `npx vitest run` | 183/183 |
| `npx playwright test` | **50 passed, 2 skipped** (device-specific), 0 failed, 7.8 min |
| Thumbnail capture of the 19 rebuilt or new parametric pieces + mirror | 20/20 rendered, 0 load errors |

**New tests:**
- **Unit:**
  - every finish (15 floors, 9 walls, 6 facades) has its texture set on disk, and ids are unique;
  - the facade is validated, undoable and survives save/load;
  - per-asset completeness for the 12 new parametric entries.
- **E2E:**
  - change the facade from the project panel, then undo and redo;
  - give the kitchen run walnut fronts with a terrazzo worktop;
  - reload, and both persist.

**Visual inspection:**
- `p3m3-parametric-sheet.jpg`: every parametric piece.
- In the house: kitchen run, island, bathroom, bedroom and study in walk and fly
  (`p3m3-kitchen*.jpg`, `p3m3-bathroom.jpg`).
- `p3m3-mirror-reflection.jpg`: the real mirror reflection.
- `p3m3-site-lawn.jpg`: aerial view of the lawn and terrace.

**Defects found by inspection and fixed:**
- Marble worktops showed a tile grid: the texture is a tiled floor.
- Glossy steel and the hob reflected the green lawn.
- The first WC model was malformed.
- The shower tray was too brown.
- Quartz rendered dark grey: the colour map was dark.

**Performance** (production build, headed, Radeon 610M, 1×). Median / p95 ms:

| Level | Orbit | Walk | Fly |
|---|---|---|---|
| Performance | 16.5 / 16.8 | 8.3 / 12.5 | 12.5 / 12.6 |
| Balanced | 16.7 / 16.8 | 8.4 / 12.6 | 12.5 / 16.7 |

- No frames over 50 ms.
- The mirror costs about +4 ms at Quality (D21).
- Startup main-thread blocking is in D22.
## Phase 3 — M2 asset library (2026-10-15)

| Command | Result |
|---|---|
| `npx tsc -b` / `npx oxlint` / build | pass / 0 / pass; no dev handles or studio in `dist/` |
| `npx vitest run` | 169/169 |
| `npx playwright test` | **49 passed, 2 skipped** (device-specific), 0 failed, 7.8 min |
| `node scripts/capture-thumbnails.mjs assets` (dev server) | **82 assets rendered by the real renderer, 0 load errors** (the capture fails on any console or page error, so it is a load test of the whole library) |

**New tests:**
- **Unit, every catalogue entry** (82 × the completeness test): real GLB, licence, source,
  plausible size, thumbnail.
- **Unit, placement:**
  - a mirror snaps flat to the nearest wall, facing in, at its mounting height;
  - a vase dropped on a table stands on its top, travels with the table, and goes back to the floor
    elsewhere;
  - wall, ceiling and tabletop items are not walkthrough obstacles;
  - the library holds ≥ 60 distinct third-party models with licence records.
- **E2E, through the library UI:**
  - wall art placed near a wall hangs at 1.25 m against its face;
  - a vase placed on the coffee table stands at 0.39 m;
  - the Credits section shows the author and licence.
- **E2E, production build:** every model in `docs/asset-manifest.json` is served as a binary glTF.

**Visual inspection:**
- every thumbnail on a contact sheet (`docs/screenshots/editor/p3m2-catalogue-sheet.jpg`);
- a showcase built with the real commands (art, vase on the table, pendant, ceiling fan, wall mirror,
  cooker, bar stools, armchair, cushions on the sofa), walked and flown through
  (`p3m2-art-and-pendant.jpg`, `p3m2-ceiling-fan.jpg`, `p3m2-wall-mirror.jpg`,
  `p3m2-cooker-stools.jpg`).

**Not verified:**
- **Performance with every model in one scene.** Templates in M4/M5 will exercise realistic room
  loads, and frame times are re-measured there.
- **Memory.** Texture megapixels per model are recorded in the manifest (3.1–7.3 MP each), but GPU
  memory wasn't measured.

---

## Phase 3 — M1 template and asset architecture (2026-10-14)

| Command | Result |
|---|---|
| `npx tsc -b` / `npx oxlint` / build | pass / 0 / pass; no dev handles or `/__studio` in `dist/` |
| `npx vitest run` | 107/107 |
| `npx playwright test` | **47 passed, 2 skipped** (device-specific), 0 failed, 7.5 min |

**New unit suites:**
- `templates.test.ts` runs the invariant suite for **every** template:
  - valid model and an exact save/load round trip;
  - known finishes, assets and variants;
  - furniture inside its room and clear of walls;
  - a front door, with every room reachable by walking from it (flood fill with collisions);
  - daylight in habitable rooms;
  - card numbers derived from the model;
  - a fresh id per build;
  - a captured thumbnail.
- `assets.test.ts`, per catalogue entry:
  - a real GLB file (magic bytes), a source URL and a licence;
  - a plausible size;
  - a thumbnail on disk;
  - unique variants.
  - It also covers duplicate (beside the original, staying in the room, flipping away from a wall),
    finishes validated against the asset, and save/load.

**New E2E `library.spec.ts`:**
- **Designs:** card facts and a loaded thumbnail; search with an empty state; the preview shows the
  real plan and its 6 rooms. Creating a project, editing it (deleting a room), then creating again from
  the same design gives back the complete house with a new id.
- **Library:**
  - search → thumbnail → place on the plan → duplicate (button);
  - change finish → Ctrl+D (the copy keeps the finish) → undo;
  - reload: everything persists;
  - recently used is shown.
- **Room suggestions:** a bedroom offers beds, not kitchens.

**Defects found by the new invariants** (existing template):
- the lounge chair's rotated footprint entered the north wall by about 5 cm;
- the study armchair's entered the south wall.

Both are fixed.

---

## Phase 2 — M2 rendering (2026-10-14)

| Command | Result |
|---|---|
| `npx tsc -b` / `npx oxlint` | pass / 0 warnings |
| `npx vitest run` | 70/70 (new `site.test.ts`: skirting, roof coverage incl. an L-plan, entrances; navigation: room entries, in-room arrival over low furniture, no corner-facing arrival, quality values from storage) |
| `npx playwright test` | **44 passed, 2 skipped** (device-specific), 0 failed, 7.0 min |

**New E2E `rendering.spec.ts`:**
- The sky and lighting files load from our origin.
- **Street view** (canvas pixels): sky above (blue clearly exceeds red) and lawn below (green clearly
  exceeds blue).
- **Aerial view:** a neutral-grey roof where the rooms used to be visible.
- The walkthrough starts about 1 m inside the front door, facing north.
- **Quality levels** at device pixel ratio 2: the canvas renders at 1×, 1.25× or 2×; Quality fetches the
  4K sky; the choice survives a reload and is not stored in the project; it can be changed from the
  walkthrough settings too.

**Performance.** Measured headed on a Radeon 610M (integrated) on the production build, with the mouse
dragging in orbit and walking/flying with mouse look. Median/p95 frame times in ms:

| Screen | Level | Orbit | Walk | Fly |
|---|---|---|---|---|
| 1× | Performance | 12.5 / 12.6 | 12.5 / 16.7 | 8.3 / 12.5 |
| 1× | Balanced | 8.4 / 12.6 | 12.5 / 16.7 | 12.4 / 12.6 |
| 1× | Quality | 16.7 / 20.9 | 16.8 / 25.1 | 16.6 / 16.8 |
| 1.5× | Performance | 8.4 / 12.5 | 8.3 / 12.5 | 8.4 / 12.6 |
| 1.5× | Balanced | 12.5 / 16.7 | 12.5 / 16.8 | 4.2 / 20.8 |
| 1.5× | Quality | 29.2 / 33.4 | 20.9 / 29.2 | 25.0 / 29.3 |

- 0 frames over 50 ms except a single one in Quality at 1.5×.
- Values snap to multiples of the panel's ~4.2 ms refresh interval, and run-to-run noise is about one
  interval.
- Load: about 1.3–1.6 s to a lit scene; 6.7 MB transferred on a cold cache (7.8 MB with the 4K sky).
- Draw calls (dev build, Balanced): orbit 446, walk 245–306, fly 216–392; about 0.2–0.4 M triangles;
  14 shader programs.

**Cost isolation** (dev build, walking, headed): resolution dominates. 1× → 1.5× doubles the frame
time even with shadows, lights and background off. The sun shadow costs ~4 ms. One room light costs
~0; six cost 20–30 ms more (D16).

**Visual inspection** (screenshots `docs/screenshots/editor/p2m2-*.jpg`):
- split and 3D views on the site;
- full height and cut-away;
- the front-door arrival;
- living room, kitchen and study entries;
- sun through the study window;
- street, aerial (roof) and garden views.

**Defects found by inspection and fixed:**
- arrival through a doorway or into a corner;
- olive ceilings from green ground bounce indoors;
- fixtures floating in the cut-away;
- a black roof (tint);
- six point lights' cost.

All are described in AUDIT_LOG P2-M2.

**Not verified:**
- other GPUs (only one integrated GPU was measured);
- Firefox/Safari rendering;
- shadow acne on unusual wall angles (the templates are orthogonal).

---

## Phase 2 — M1 navigation (2026-10-13)

| Command | Result |
|---|---|
| `npx tsc -b` / `npx oxlint` | pass / 0 warnings |
| `npx vitest run` | 61/61 (new `tests/unit/engine/navigation.test.ts`, 8 tests) |
| `npx playwright test` | 41 passed, 2 skipped (device-specific), 0 failed |

**How the walkthrough is tested with real input.**
- Headless Chromium grants pointer lock and reports `movementX/Y`. The tests click "Click to look
  around", assert `document.pointerLockElement` is the canvas, and turn with relative mouse moves.
- Yaw, pitch and position are read back from the HUD's `data-walk-*` / `data-fly-*` attributes.
- `walkTo()` steers with the mouse and walks with W like a person, and is used for a tour through
  every doorway.
- Only the browser's own Esc-releases-lock cannot be synthesised; tests call
  `document.exitPointerLock()`, which is what that Esc does.
- A headed (visible-window) run repeated the session with frame timing (AUDIT_LOG P2-M1).

**Not verified:** Firefox/Safari pointer lock; real touch devices for the fly mode; a real Esc key
press. A human can confirm these in seconds.

---


## Building editor milestone (2026-10-13)

Environment: Windows 11, Node 24.20, Playwright 1.64 Chromium on a real GPU (AMD Radeon 610M integrated,
ANGLE/D3D11). E2E runs against the **production build** served with the production security headers.

### Layers

| Layer | Where | What it proves |
|---|---|---|
| Engine unit (27) | `tests/unit/engine/` | room creation (shared walls, T-junction splits), overlap/self-crossing/size rejection without mutation, mitre geometry, wall solids with opening holes, shared-wall moves resizing both rooms, wall runs without notches, opening re-anchoring and fit, furniture pushed by walls, numeric room size, corner moves, room deletion keeping shared walls, history, JSON round-trip, hostile documents (incl. `__proto__`), template validity and room connectivity, walkthrough collision (walls, doorways, windows), performance budgets |
| Garden Room unit (26) | `tests/unit/garden-room/`, `tests/unit/headers.test.ts` | Phase 1 regression + header parity |
| Editor E2E — plan (8) | `tests/e2e/editor/plan.spec.ts` | clean load; 2D wall drag → model + room areas + 3D pixels; draw room → shared walls + 3D; rejected/constrained edits explained, model valid; doors/windows added and moved along walls (incl. rejection); numeric room width moves neighbour; undo/redo/reload; corrupted save refused |
| Editor E2E — 3D (4) | `tests/e2e/editor/scene3d.spec.ts` | 3D click selects in all views; first drag only orbits; 3D wall drag → model → 2D (+ one-step undo); 3D furniture drag; 3D placement of furniture and doors |
| Editor E2E — walkthrough (4) | `tests/e2e/editor/walk.spec.ts` | walk through a doorway into the next room; walls, furniture and windows block; go-to-room; frame p95 < 100 ms while moving; exit back to editing; touch joystick (Pixel 7) |
| Garden Room E2E (19 + 1 skip) | `tests/e2e/garden-room/` | Phase 1 workflows at `/garden-room` |

3D picking in E2E reproduces the editor's deterministic initial camera with three.js in the test runner
(`tests/e2e/editor/camera.ts`) to click real geometry — no test-only hooks ship in the app.
The canonical model is read from the validated autosave in local storage (the same document a reload restores).

### Results (final run)

| Command | Result |
|---|---|
| `npx tsc -b` | pass |
| `npx oxlint` | 0 warnings |
| `npx vitest run` | 53/53 |
| `npx playwright test` | 35 passed, 2 skipped (device-specific tests on the desktop project) |
| `npm run build` | pass (three ≈ 401 KB gzip, editor ≈ 52 KB gzip, Garden Room ≈ 18 KB gzip; lazy-loaded per route) |

### Performance (measured, not estimated)

| Measurement | Result |
|---|---|
| `moveWall` + full validation, compact home (Node) | 0.79 ms |
| `validateProject` | 0.31 ms |
| all 19 wall solids regenerated | 0.29 ms |
| one walkthrough collision step (25 capsules, 23 boxes) | 40 µs |
| Browser: view switches / 2D wall drag / 3D orbit drag (240 frames each) | median 16.7 ms, p95 16.8 ms, max 16.8 ms, 0 frames > 100 ms |
| Browser: walking (180 frames) | median 16.7 ms, p95 16.7 ms |
| Plan visible after reload | 387 ms (localhost) |
| Initial transfer | 3.6 MB |
| Render cost, split view (incl. shadow pass) | 376 draw calls, 421k triangles, 174 geometries, 102 textures, 11 programs |

All browser numbers are from one machine (integrated AMD GPU, 60 Hz display, so 16.7 ms is the vsync
floor). Not measured: low-end phones, discrete GPUs, Firefox/Safari.

### Defects found by review and testing in this milestone
Wall memo missing its dependency signature; window glazing above cut-away walls; constrained drags not
explained; "Saved" shown before saving; phones received an unusable split view; plan labels colliding at
low zoom; 3D framing cropping in portrait; zod silently stripping `__proto__` (now rejected). Test bugs of
my own (wrong area expectation, door-symbol click target, offset direction, occluded 3D target,
camera-size mismatch with the library open) were fixed in the tests after confirming the engine was right.

### Not verified
Real iOS/Android devices; Firefox/Safari; screen readers; multi-level editing in the UI (schema/engine
only); very large buildings (hundreds of rooms).

---

## Phase 1 — Garden Room (2026-10-13)

Environment: Windows 11, Node 24.20, Chromium (Playwright 1.64) with real GPU (AMD Radeon 610M via ANGLE/D3D11).

## Automated

| Suite | Result |
|---|---|
| `tsc -b` (app, node, tests) | Pass |
| `oxlint` | 0 warnings |
| Vitest — 26 tests (`tests/unit`) | 26 passed |
| Playwright — 20 tests over desktop 1440×900, tablet 820×1180 (touch), Pixel 7 | 19 passed, 1 intentionally skipped (mobile-only test on desktop) |
| `vite build` | Pass (three.js chunk ≈1.34 MB / 401 KB gzip; Vite's 1.5 MB chunk warning no longer triggers) |

E2E coverage (runs against the production build with production headers):
1. Loads with defaults: no console errors, page errors, failed requests or 4xx.
2. For each of the five groups, choosing an option (a) is committed by the 3D scene (`data-rendered`), (b) changes the canvas pixels with the camera fixed, (c) leaves the other four groups unchanged.
3. Five sequential changes accumulate; none resets another.
4. Camera: drag-orbit, wheel-zoom and each preset change the view, and the configuration survives.
5. Clicking a piece in the 3D room opens its option group.
6. Save A, change, save B; duplicate save detected; reload restores the working design and both saved designs; restore A is exact; compare shows exactly two differences; the A/B toggle switches the scene; back restores the working design; stored designs unchanged.
7. A share link opened in a **new browser context** (no storage) reproduces the exact five selections.
8. A partially invalid link keeps valid fields, names the defaulted ones and cleans the URL.
9. A hostile or garbage link (wrong template, `<img onerror>`, `__proto__`) falls back to defaults with an error notice, injects nothing, and logs no console errors.
10. Brief: empty submit shows errors and focuses the first field; an invalid email and a missing phone (when phone is preferred) are caught; a valid submit shows the confirmation; HTML in notes renders as text; the stored brief has the correct structure.
11. Mobile and tablet: tabs, swipeable option strip, actions and brief dialog work, with no horizontal overflow.
12. Keyboard: group headers toggle with Enter; arrow keys change the selected option.
13. Only same-origin requests are made; security headers are served.

## Manual / visual review (screenshots inspected)

Inspected: initial load, Overview / Window / Plan views, each group expanded, selected and unselected cards, the saved toast, the My designs sheet, compare A and B, the share dialog, brief errors and confirmation, About & credits, a partial-link notice, and mobile (390×844), tablet (820×1180) and laptop (1280×720) layouts.

### Issues found and fixed during review

| # | Issue | Fix |
|---|---|---|
| 1 | Floors looked mirror-glossy; the herringbone roughness map averaged 0.10 | Remapped roughness maps per material to plausible ranges |
| 2 | Microcement rendered near-black; jute and oak were over-saturated | Normalised tintable albedo to greyscale and re-tuned tints |
| 3 | Desktop and mobile panels were both in the DOM (hidden via CSS), duplicating radio-group names and test IDs | Render one layout via `matchMedia` |
| 4 | Share-link notices fired behind the loading screen and expired unseen | Notices queue until the room is visible |
| 5 | Compare put "Design B" in column A (designs listed newest first) | Pairs are ordered by save time |
| 6 | Toasts rendered underneath modal dialogs (top layer) | Toast region is a manual popover, re-raised on change |
| 7 | Sofa thumbnails dominated by wall art; ellipse thumbnail stale | Dedicated thumbnail framings, re-rendered from the live scene |
| 8 | Upholstery looked like plastic | Textile sheen (`MeshPhysicalMaterial`) on fabrics |
| 9 | Mobile hint covered a third of the 3D view | Short single-line hint on small screens |
| 10 | Corner sofa chaise intersected the ellipse table | Corner layout shifted to keep a walkway |
| 11 | "Champagne" velvet actually rendered taupe | Renamed and re-swatched so labels match what clients see |

### Performance investigation

Measured on the production build, frame times via `requestAnimationFrame`, with a Chrome trace for attribution:

| Configuration | Median frame | p95 frame | Long frames per 7–9 camera moves |
|---|---|---|---|
| EffectComposer (N8AO + 4×MSAA) | 16.7 ms | 150–200 ms | 7–9 (500–880 ms) |
| Composer without MSAA, + SMAA | 16.7 ms | 16.8 ms | 8–9 (180–720 ms) |
| **No composer, native Neutral tone mapping + contact shadows (shipped)** | **16.7 ms** | **16.8 ms** | **1 (≈320 ms)** |

The Chrome trace attributed the stalls to 660–700 ms WebGL command-buffer flushes in the GPU process. Since 60 fps steady state was already fine, the freeze at the start of each move was the user-visible problem. Screen-space AO was replaced with per-object soft contact shadows.

Load (local, unthrottled): scene ready in ≈5.1 s, dominated by GPU and shader setup rather than download (≈4.7 s with the network throttled to ~12 Mbps). Including background prefetch of every option, 101 requests and ≈8.7 MB.

## Not tested

- Real iOS Safari or Android devices (only Chromium emulation of Pixel 7 / touch tablet).
- Firefox and Safari engines.
- Discrete or high-end GPUs and very low-end phones.
- Screen-reader walkthrough (semantic structure was built for it but not verified with NVDA or VoiceOver).
