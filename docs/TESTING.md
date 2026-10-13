# Testing record

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
