# Audit log

Each milestone records: what changed, commands run with real results, risks, remaining issues.

## M0 — Baseline & environment audit (2026-10-13)

**Changes:** initialised Git (none existed — verified `git rev-parse` failed). Repo-local identity `devacharan-cu <devacharan@gmail.com>` (no global config was set; nothing global was changed). Hardened `.gitignore` (env files, keys, local Claude settings, caches) and added `.gitattributes` (LF, binary assets). Baseline commit `9cb62cc` on `main` = Phase 1 Garden Room, unchanged. Feature branch `feature/building-engine` created from it.

**Remote:** `github.com/devacharan-cu/studio-configurator` is **public** and was empty (GitHub API: size 0, no refs; `git ls-remote` returned nothing). Nothing to preserve or overwrite. Only the feature branch is pushed; `main` is not pushed without approval.

**Environment (verified):** Windows 11; Node 24.20.0; npm 11.19.0; Claude Code 2.1.296; Git 2.55 with Git Credential Manager; `gh` CLI not installed. MCP: Claude Docs + Google Drive connected, Figma needs auth. Claude in Chrome extension available. Official marketplace offers `context7` and `playwright` plugins — not installed (MCP tools from a newly installed plugin only load in a new session; Playwright is already a project-local dev dependency; official docs fetched directly instead). Firecrawl unavailable (needs a paid key) — not used. Semgrep 1.180 (isolated in `~/.cache/sc-tools`), Gitleaks 8.30.1 (checksum-verified), npm audit available.

**Regression baseline (run before any change):**
| Command | Result |
|---|---|
| `npx tsc -b` | pass |
| `npx oxlint` | 0 warnings |
| `npx vitest run` | 26/26 passed |
| `npx playwright test` | 19 passed, 1 skipped (intentional) |
| `npm audit` | 0 vulnerabilities |
| `gitleaks git .` | no leaks |

**Risks:** the repository is public — every pushed file is world-readable; commits carry the configured email.

## M1 — Building engine (commit `be71f43`)

**Changes:** `src/engine/` (pure TS): schema v1 types, queries, invariants, polygon & wall-junction geometry, wall solids with openings, copy-on-write commands, snapshot history, strict parser (zod 4.6.7, MIT, new runtime dependency), metrics, walkthrough collision, compact-home template, asset/finish metadata. 7 CC0 models added (Poly Haven; authors recorded in the catalogue). `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, research appended.

**Commands & results:**
| Command | Result |
|---|---|
| `npx tsc -b` | pass |
| `npx oxlint` | 0 warnings |
| `npx vitest run` | 50/50 passed (26 Phase 1 + 24 engine) |
| `npm run build` | pass |
| `npm audit` | 0 vulnerabilities |
| Semgrep (js, ts, secrets, owasp) on `src/engine`, `tests/unit/engine` | 0 findings / 113 rules / 16 files |
| E2E | not re-run: no application code changed in M1 (engine is not yet imported by the app) |

**Found during the milestone:** zod silently strips `__proto__` keys → added explicit rejection (test). Two test expectations of mine were wrong (area sum under a T-junction move is not conserved) — fixed the test, not the engine.

**Risks / remaining:** junction mitres fall back to square ends beyond a 4× limit (very acute angles are rejected anyway at < 10°). Furniture push works per inner face — can leave items in a corner overlapping slightly in concave rooms (warning emitted). Multi-level exists in the schema only.

## M2 — Editor shell, 2D plan, derived 3D (commit `2046f23`)

**Changes:** `src/editor/` (store, SVG plan editor, R3F scene derived from the engine, inspector, library, shell). Garden Room moved under `src/garden-room/` and routed at `/garden-room` (`src/Root.tsx`); its unit tests and E2E tests were moved and repointed, not rewritten. Correction: the M0 commit is `f37f00f` (an earlier PROGRESS entry mistyped it).

**Commands & results:**
| Command | Result |
|---|---|
| `npx tsc -b` | pass |
| `npx oxlint` | 0 warnings |
| `npx vitest run` | 50/50 |
| `npx playwright test` (production build + headers) | 27 passed, 1 skipped (intentional) — 8 editor + 19 Garden Room across desktop/tablet/mobile |
| `npm run build` | pass (three chunk 401 KB gzip; editor 51 KB gzip) |
| `npm audit` | 0 vulnerabilities |
| Semgrep (js, ts, react, secrets, owasp) on `src`, `tests` | 0 findings / 114 rules / 67 files |
| Gitleaks on `src` | no leaks |

**Defects found and fixed during the milestone:**
- Wall geometry memo omitted its signature → moving a shared corner would not have rebuilt neighbouring walls (fixed before first run).
- Window glazing/frames extended above cut-away walls (fixed, clipped to displayed height).
- Constrained drags committed silently → now explained ("Stopped at the last valid position — …").
- "Saved" label shown before anything was saved → project now persisted on open.
- Two E2E test bugs of mine (click target on a door symbol; offset direction assumption) — fixed in the tests; the engine behaved correctly in both.

**Risks / remaining:** 3D direct manipulation not yet implemented (M3). Plan editor is mouse/pen-first; touch pinch-zoom on the plan is not implemented. A leftover Vite dev server from Phase 1 was found on port 5173 and stopped before testing.

## M3 — Direct 3D structural editing (commit `a248826`)

**Changes:** `src/editor/scene/Manipulator.tsx` (ray → horizontal plane through the grab point → plan delta → `moveWall` / `moveOpening` / `moveItem`, the same commands as 2D; controls suspended during edit drags), pick rules and 3D tools in `Scene3D.tsx`, `tests/e2e/editor/camera.ts` (reproduces the initial camera to target real geometry), `tests/e2e/editor/scene3d.spec.ts`.

**Commands & results:**
| Command | Result |
|---|---|
| `npx tsc -b` / `npx oxlint` | pass / 0 warnings |
| `npx vitest run` | 50/50 |
| `npx playwright test` | 31 passed, 1 skipped (intentional) |
| `npm audit` | 0 vulnerabilities |
| Semgrep on `src`, `tests` | 0 findings |
| Gitleaks on `src` | no leaks |

**Found:** tall furniture (2.2 m wardrobe) stands above cut-away walls and can hide items in neighbouring rooms from the default camera — recorded as a limitation; test retargeted to an unobstructed item. A session interruption occurred mid-milestone; on resume the working tree was checked (only the two M3 files modified) and checks re-run.

**Risks / remaining:** no transform gizmo for rotation in 3D (rotation via inspector, Q key, or the 2D handle). No snapping guides in 3D beyond 5 cm steps.

## M4 — Walkthrough (commit `0f94fbd`)

**Changes:** `src/editor/scene/Walkthrough.tsx`, `walkInput.ts`, `src/editor/ui/WalkHud.tsx`, store walk state, `roomCentres` in `src/engine/walk.ts`, `tests/e2e/editor/walk.spec.ts`.

**Commands & results:**
| Command | Result |
|---|---|
| `npx tsc -b` / `npx oxlint` | pass / 0 warnings |
| `npx vitest run` | 50/50 |
| `npx playwright test` | 35 passed, 2 skipped (touch test on desktop; mobile-layout test on desktop) |
| `npm audit` / Semgrep / Gitleaks | 0 / 0 / no leaks |

**Measured (desktop, AMD Radeon 610M iGPU, Chromium via ANGLE D3D11):** frame time while walking median 16.7 ms, p95 16.7 ms, max 16.8 ms (180 frames). E2E asserts p95 < 100 ms while moving.

**Observations:** the hall door leaf is rendered open at 85° into the hall and fills much of the starting view; window views show a plain sky colour (no exterior environment). Pointer lock is requested on click; where it is refused (headless, iframes) drag-to-look is used.

**Risks / remaining:** single-level walkthrough (no stairs yet); no head bob or footstep audio (intentionally); the visitor can't open/close doors (doors are always open).

## M5 — Performance, review fixes, documentation (commit `61839e0`)

**Changes:** `tests/unit/engine/perf.test.ts`; responsive defaults and compact top bar (`store.ts`, `EditorApp.tsx`); plan label level-of-detail and fit margins (`PlanView.tsx`); aspect-aware orbit framing (`Scene3D.tsx`, mirrored in `tests/e2e/editor/camera.ts`); dev-only `__gl` probe (verified absent from `dist/`); README rewritten for the editor, Phase 1 README moved to `docs/GARDEN_ROOM.md`; ARCHITECTURE, DECISIONS (D6–D10), TESTING, SECURITY updated; screenshots under `docs/screenshots/editor/`.

**Commands & results (final run):**
| Command | Result |
|---|---|
| `npx tsc -b` / `npx oxlint` | pass / 0 warnings |
| `npx vitest run` | 53/53 |
| `npm run build` | pass |
| `npx playwright test` | 35 passed, 2 skipped (device-specific) |
| `npm audit` | 0 vulnerabilities |
| Semgrep (5 rulesets) on `src`, `tests`, `scripts` | 0 findings / 114 rules / 70 files |
| Gitleaks `git .` (full history) and `dir src` | no leaks |

**Performance (measured):** see TESTING.md — engine edit 0.79 ms; browser p95 16.8 ms with 0 frames > 100 ms in drags, orbit, view switches and walking on an AMD Radeon 610M iGPU; 376 draw calls / 421k triangles in split view.

**Found in review:** phone layout unusable in split view; colliding plan labels on tablet; portrait 3D framing cropped; one E2E test assumed a fixed canvas size while the library panel was open (fixed in the test).

**Remaining issues:** single-level UI; rectangle-only room drawing; no 3D rotation gizmo; tall furniture occludes the cut-away overview; procedural fixtures are placeholder quality; only Chromium tested; not tested on physical mobile devices.

---

# Phase 2 — immersive home experience

## P2-M0 — Repository verification, visual diagnosis, tool audit, plan (2026-10-13)

**Repository:**
- `git fetch origin`: `origin/feature/building-engine` = `262b47e` = local HEAD, working tree clean.
- `main` (`9cb62cc`) is local only.
- Identity is `devacharan-cu <devacharan@gmail.com>` (repo config).
- New branch `feature/immersive-home-experience` was created from `262b47e`.

**Tools:**
- Available: Playwright 1.64 (project-local); Claude in Chrome (available, not needed because
  Playwright headed runs covered real-window validation); WebFetch/WebSearch; Semgrep 1.180 and
  Gitleaks 8.30.1 (isolated in `~/.cache/sc-tools`); npm audit.
- Not installed: Context7, Firecrawl (paid key), plugins. Official docs were fetched directly instead.
- `gltf-transform` is not installed. It will be run from an isolated scratch install when assets need
  optimising (M3), as in Phase 1, because its CLI pulls advisories into the dev tree.
- Nothing global was changed.

**Visual diagnosis.** Reproduced on the production build (headless Chromium, real GPU), with
screenshots inspected, and ranked by user impact:

1. **Walkthrough arrival was disorienting.**
   - The hall spawn faced an 85°-open door leaf 30 cm away.
   - "Go to room" kept the previous heading, so you arrived staring at a blank wall.
   - The 45° lens (the orbit lens) felt like looking through a tube at human scale.
2. **Walking happened inside the editor frame.** The top bar, rail and inspector stayed on screen;
   there was no settings panel, no free camera and no way to inspect ceilings or exteriors freely.
3. **The overview was framed from a fixed formula, not the viewport.**
   - The building filled about a third of the 3D pane, centred in a large beige field.
   - A tighter sphere fit (first attempt in this milestone) then cropped portrait panes. Fixed with an
     exact box fit (below).
4. **"Two openings overlap on the same wall" stacked as duplicate red notices.**
   - The opening tool used the click position verbatim, so clicking on or near an existing window
     produced an invalid project, which was correctly rejected.
   - Each click added another identical notice.
   - The templates themselves are valid (unit-tested); the cause was the tool, not the data.
5. **Visual quality (M2 scope).**
   - The exterior is a flat beige disc and pale sky; windows look onto nothing.
   - Ceilings and walls are flat and evenly lit.
   - The floor reads dark in the overview; window frames are black boxes with no visible glass from
     outside.
   - Code-modelled kitchen, bath and wardrobe are plain boxes.
6. **Library (M3 scope).** 24 entries (14 models plus 10 code-modelled). No thumbnails: the cards
   show a grey footprint rectangle.

**Plan (dependency order):**
- **M1 navigation:** the camera system the visual work will be judged from.
- **M2 rendering:** environment, lighting, materials, architecture details, measured.
- **M3 assets and materials:** catalogue, thumbnails, browser UX, duplicate.
- **M4 templates:** three or more distinct complete homes, plus room/furnishing presets.
- **M5 polish and regression.**

## P2-M1 — Game-like camera and navigation

**What changed:**
- **Three camera controllers** (D12): `Walkthrough` (rewritten), `FreeFly` (new) and `OrbitRig`
  (presets, frame selection, restore, exact framing), with shared input in `useNavInput`.
- **Walk:**
  - velocity-based movement with frame-rate-independent acceleration; Shift runs;
  - pointer lock with raw input; ±85° pitch with no roll;
  - field of view 62°;
  - arrival at a free point facing the most open indoor view.
- **Fly:** E/Q/Space/C vertical, wheel for speed, viewpoints (aerial, street, garden, a high corner of
  each room), never below ground.
- **Immersive layout:** editing chrome is hidden. The HUD has the mode switch, settings
  (sensitivity/speed/invert, persisted per viewer), full screen, a controls legend and a capture
  prompt.
- **Orbit:**
  - Views menu (overview, top, four elevations), frame selection (F), frame home (H);
  - an exact box-corner fit for any aspect;
  - an untouched overview refits on viewport change;
  - returning from walk/fly glides back to the exact orbit pose.
- **Engine:**
  - `addOpening` places a new opening in the nearest free span, or refuses with a reason (D13);
  - `bestHeading`, `clearDistance` and `walkablePoint`;
  - "go to room" targets are now free points.
- **Store:**
  - camera mode `fly`; `nav` settings; `pointerLocked`; `viewCmd`; `flyTo`;
  - identical notices no longer stack;
  - selection is kept through walk/fly.
- **Library shortcut:** moved from F to L, because F now frames the selection.

**Defects found in this milestone and fixed at the cause:**

| # | Defect | Cause | Fix |
|---|---|---|---|
| 1 | Duplicate overlap warnings | Tool ignored existing openings; notices not deduplicated | D13 |
| 2 | Walk arrival faced a door leaf or wall | Fixed spawn yaw toward the plan centre; teleports kept the old yaw | `bestHeading` over engine colliders |
| 3 | First fix faced *out* of the front door | The probe counted outdoors | Probe stops at the building edge |
| 4 | Room teleports could land on a table | `interiorPoint` ignores furniture | `walkablePoint` |
| 5 | Portrait split pane cropped the overview (my sphere fit) | A sphere underestimates the diagonal silhouette | Exact box-corner fit, unit-tested at 5 aspects × 6 presets |
| 6 | Returning from fly reframed instead of restoring | The reframe effect ran on remount in the same commit | Reframe only when level/project actually change |
| 7 | Leaving fly overwrote the remembered overview | The canvas resized while the rig was still mounted, and on remount it saw the stale full-screen size | Act only on genuine resizes after mount, in orbit mode |

**Browser validation (real interaction, production build):**
- **Headless Chromium on the real GPU:** entered the walkthrough, acquired pointer lock (verified
  `document.pointerLockElement === CANVAS`), and looked left/right/up/down (yaw and pitch read back
  from the HUD).
- **Movement:** walked forward/back, strafed, ran, walked through the hall→bathroom and
  hall→bedroom doorways, used "Go to room" for all 6 rooms, and released the mouse.
- **Free camera:** switched to fly, rose 3 m in 1 s, used the aerial, inside-kitchen and street
  viewpoints, and exited back to the restored split view.
- **Orbit:** used the front preset and frame-home.
- **Headed run** (visible window, same steps plus frame timing): no console errors.

**Commands & results:**

| Command | Result |
|---|---|
| `npx tsc -b` | pass |
| `npx oxlint` | 0 warnings |
| `npx vitest run` | 61/61 (8 new: opening placement ×2, reachability of every room by walking, no tunnelling at a 5 m step, arrival heading, key mapping, frame-rate-independent easing, framing at 5 aspects × 6 presets) |
| `npm run build` | pass; dev handles (`__editor`, `__gl`, `__three`) absent from `dist/` |
| `npx playwright test` (desktop, tablet, Pixel 7) | **41 passed, 2 skipped** (device-specific), 0 failed, 6.1 min |
| New E2E `navigation.spec.ts` (6) | full-screen walk + pointer lock + full turn + pitch clamps ±85° + Esc twice; WASD/strafe/Shift/speed setting; **walking tour through every doorway visiting all six rooms**, plus running into a wall for 3 s; free camera up/down/along-view/ground clamp/wheel speed/viewpoints and exact orbit restore (pixel diff < 2%); mode switches keep selection and project, presets and F/H framing; opening placement beside and full-wall refusal shown once |
| `npm audit` | 0 vulnerabilities |
| Semgrep (5 rulesets) on `src`, `tests` | 0 findings, 114 rules, 73 files |
| Gitleaks: `src` and full history | no leaks |

**Performance (headed Chromium, AMD Radeon 610M, ANGLE/D3D11, high-refresh panel):**
- walking with mouse look: median 8.3 ms, p95 12.5 ms, max 12.6 ms;
- flying up and forward with look: median 4.2 ms, p95 8.4 ms, max 16.8 ms;
- 0 frames over 100 ms.

**Screenshots:** `docs/screenshots/editor/p2m1-*.png`
- split overview, 3D framed, front preset;
- walk arrival, walk in the living room, walk looking up;
- fly inside the kitchen, fly aerial, fly street view.

**Known limitations after M1:**
- Visuals are unchanged in this milestone: the flat exterior, plain ceilings and no glass from
  outside are M2.
- There is no roof, so the aerial view looks into the rooms.
- Pointer-lock Esc can only be exercised by a human (automation uses `exitPointerLock`).
- A touch fly mode exists (joystick plus up/down) but was only exercised by unit-level input mapping,
  not on a device.
- Stairs and levels are not navigable, because the editor is single-storey. The controllers read the
  level elevation, so another level is a data change, not a rewrite.

**Commit:** `3e08119`, pushed to `origin/feature/immersive-home-experience` (new branch, normal push, no
force), authored by `devacharan-cu <devacharan@gmail.com>`, no co-author trailer.

## P2-M2 — Real-time rendering quality

**What changed:**
- **Site and sky** (`scene/Site.tsx`, `scene/sky.ts`):
  - a real CC0 HDRI ("Meadow 2") as the background and image-based light;
  - its sun replaced by a matching shadow-casting light (D14);
  - a lawn that fades into the horizon, a paved terrace and a path from the front door;
  - a flat gravel roof with a rendered fascia in walk and fly;
  - indoor fill switches from sky/lawn to a warm bounce;
  - one room light follows the camera, and every room has a ceiling fixture (D16).
- **Architectural detail:**
  - skirting stopped at doors (`skirtingRuns`);
  - window frames, mullions, glass, an external sill and an internal board;
  - door/passage linings and architraves on both faces;
  - door leaves with lever handles; a dark front door;
  - textured plaster ceilings.
  - Engine geometry is in `engine/geometry/site.ts` (`skirtingRuns`, `roofPlan`, `entrances`), pure
    and unit-tested.
- **Quality levels** (`scene/quality.ts`, `ui/QualityPicker.tsx`): Performance / Balanced / Quality
  in the Views menu and the walkthrough settings, kept per viewer (D16).
- **Arrival:**
  - the walkthrough starts inside the front door;
  - "Go to room" stands you just inside each room's main entrance, facing in (`roomEntries`);
  - rooms with no door use the widest in-room field of view over low furniture (`arrivalHeading`).
- **Assets** (all CC0, Poly Haven, listed in the new `docs/ASSETS.md` with authors and processing):
  - Meadow 2 HDRI: sun clamped for lighting; tone-mapped 2K/4K backgrounds;
  - Grass Ground, Rectangular Paving and Gravel Floor 03 textures.
- **Docs:** D14–D16, RESEARCH M2, ARCHITECTURE rendering and arrival, TESTING, SECURITY, README.

**Defects found in this milestone and fixed at the cause:**

| # | Defect | Cause | Fix |
|---|---|---|---|
| 1 | Interiors lit through solid walls (first sky pass) | Image-based light has no occlusion, and 72% of the HDRI's energy is the sun | Sun clamped out of the lighting copy and made a real shadowed light (D14) |
| 2 | Olive-green ceilings indoors | Downward faces lit by the HDRI's green lawn and a green hemisphere ground colour | Indoors: sky light down to 0.28, neutral warm bounce |
| 3 | Room fixtures floating over the cut-away | Fixtures mounted in every mode | Visible only with ceilings (walk/fly) |
| 4 | Black roof | Dark gravel texture × grey tint | White tint, so the gravel shows its own mid-grey |
| 5 | Six room lights pushed walking to 30–45 ms per frame | Forward renderer shades every light on every pixel (measured +20–30 ms) | One light that follows the camera (D16) |
| 6 | Balanced at 1.5× resolution was ~29 ms per frame | Fill rate: resolution dominates (isolated) | Balanced capped at 1.25×; Quality documented for dedicated GPUs |
| 7 | Bedroom arrival faced the door at arm's length | The heading probe followed walkable space out through the doorway, and the bed blocked the probe | Probe sight lines within the room, over furniture below 1.4 m |
| 8 | Kitchen arrival faced a corner | In a rectangle the longest single ray is the diagonal | Score the field of view, then present rooms from their entrance (`roomEntries`) |
| 9 | Hall arrival stared into an open door leaf | Spawn at the hall's free centre | Start ~1 m inside the front door, like a visitor |
| 10 | E2E "walls block movement" walked into the bedroom | The test assumed the old spawn and a north-facing arrival (the app was right) | Test walks past the door first and turns north with the mouse |
| 11 | `isQuality` accepted prototype keys (`"constructor"`) from storage (diff review) | `in` checks the prototype chain | `Object.hasOwn`; unit test with hostile values |
| 12 | Choosing Quality blanked the whole scene while the 4K sky loaded | The sky texture suspended the scene-wide Suspense boundary | The sky has its own boundary, with the cached 2K sky as its fallback |
| 13 | E2E "library places furniture on a 3D floor" clicked mid-glide (first full run: 43 passed, 1 failed) | The test clicked ~0.1 s after closing the library while the untouched overview was still gliding back to fit (~1.5 s); heavier frames made the race visible | The test waits for the glide; the spec passed twice, then the full suite passed |

**Browser validation (real interaction):**
- **Dev and production builds, headless and headed Chromium on the real GPU:**
  - split, 3D cut-away and full-height views;
  - walkthrough from the front door, "Go to room" for all six rooms;
  - free-camera street, garden and aerial viewpoints, plus inside each room;
  - quality switching in both menus.
- **Screenshots inspected for every iteration;** the final set is `docs/screenshots/editor/p2m2-*.jpg`.
- **Console:** no errors. The only warning is three.js' own "THREE.Clock deprecated", which comes from
  @react-three/fiber 9's internal clock, not our code.

**Commands & results:** see TESTING "Phase 2 — M2" (unit 70/70; E2E **44 passed, 2 skipped** (device-specific), 0 failed, 7.0 min; performance table).
`npm audit` 0; Semgrep 0 findings, 78 files; Gitleaks no leaks in `src`, `public`, `docs`, `tests` or the
history; dev handles absent from `dist/`.

**Known limitations after M2:**
- **Lighting:**
  - No ambient occlusion or bounced light: corners and contact areas are lit evenly apart from the sun
    shadow (D7, D15).
  - Only the current room's light is real; other rooms show lit fixtures without light.
- **Reflections:** mirrors and glass reflect the outdoor HDRI, not the room (no reflection probes).
- **Site:** the lawn texture repeats visibly from high above; the terrace is a rectangle around the
  bounding box, not the footprint.
- **Code-modelled pieces** (kitchen, bed, wardrobe, bath, desk) are still simple shapes: that is M3.
- **Hardware:** measured on one integrated GPU only.

**Commit:** `2412408`, pushed to `origin/feature/immersive-home-experience` (fast-forward from `52bbb9d`,
normal push, no force), authored by `devacharan-cu <devacharan@gmail.com>`, no co-author trailer.

## P3-M0 — Baseline, audit, research and roadmap (2026-10-14)

**Repository state:**
- After `git fetch`, the remote heads are `feature/building-engine` @ `262b47e` and
  `feature/immersive-home-experience` @ `0a89fc6`.
- The latter holds P2-M2 (`2412408`) and its records commit. Author and committer on both are
  `devacharan-cu <devacharan@gmail.com>`.
- The local branch equalled origin. New branch `feature/house-library-and-assets` was created from it.

**Baseline checks on `0a89fc6`:**

| Check | Result |
|---|---|
| tsc / oxlint / build | pass / 0 / pass |
| vitest | 70/70 |
| `npm audit` | 0 |
| Playwright | Not re-run: the last full run (44 passed, 2 skipped, 0 failed) was on identical code an hour earlier (P2-M2 gate) |

**Inventory:**
- **Templates:** 1 house (`compact-home`, 6 rooms) plus a blank project. They are defined as code that
  calls engine commands (good: validated), but there is no metadata (style, bedrooms, area), no
  thumbnails and no gallery, just a menu list.
- **Assets:** 26 catalogue entries, of which 15 are glTF (14 distinct third-party files; the velvet
  sofa uses a variant) and 10 are code-modelled. The 3 kitchen and 3 bathroom pieces, the bed, the
  wardrobe and the desk are block-like.
- **Library UI:** a text list with a footprint-rectangle icon and a search box, but no thumbnails,
  loading states or recents.
- **Item operations:** add, move, rotate, replace, delete, undo/redo, save. No duplicate. `variant`
  exists in the schema but there is no UI for item materials.
- **Finishes:** 4 floor, 4 wall, 1 exterior.
- **Multi-storey:** `levels` and `addLevel` exist in the schema and engine, but there is no level UI,
  no stairs, no slab openings, and the walkthrough is single-level.
- **Known visual gaps** (from the P2-M2 report): a visibly tiled lawn, a rectangular terrace, mirrors
  reflecting the sky, no AO/GI.

**Ranked gaps:**
1. Templates (1 → 10–15).
2. Real models (14 → ≥40).
3. Asset browser without previews.
4. Block-like kitchen, bathroom and bedroom pieces.
5. No multi-storey.
6. No variants or presentation for developers.
7. Site realism.

Full backlog with acceptance criteria: PRODUCT_ROADMAP §3.

**Research:**
- RESEARCH.md "Phase 3": 9 products plus the three.js source, asset licences verified on
  Poly Haven's licence and API ToS pages.
- Two sources were unreachable (DNS) and are recorded as such.

**Tool audit:**
- Available: Playwright, WebFetch/WebSearch, Claude in Chrome, Semgrep, Gitleaks, npm audit, and
  `@gltf-transform/cli` (installed earlier in the session scratchpad, not a project dependency).
- Context7 and Firecrawl are not installed and were not needed.

**Roadmap:** PRODUCT_ROADMAP.md, covering the capability matrix, ranked backlog, milestone sequence
and an honest commercial-readiness section with a validation plan (no customers exist yet).

## P3-M1 — Template and asset architecture

**What changed and why:**
- **Templates as data** (D17), in `src/engine/templates/`:
  - `HouseSpec` and `buildHouse` replay a spec through the editor's commands;
  - a registry with kind, style, tags and description;
  - card stats computed from the built model;
  - the compact home converted to a spec.
  - Content can now grow without touching the editor, and every template is validated.
- **House library UI** (`TemplateGallery`):
  - type filter and search;
  - cards with a captured thumbnail and computed facts (bedrooms, bathrooms, floors, m²);
  - a preview showing the captured 3D view, the real plan drawn from data, the room list and tags;
  - "Create a project from this design" makes a fresh copy, and the template never changes.
  - Opened from the new **Designs** button and the Project menu.
- **Asset library** (`AssetLibrary`):
  - real thumbnails;
  - grouping by category, with empty categories hidden;
  - search including tags;
  - "For <room>" suggestions when a room is selected;
  - recently used, kept per viewer and validated on read;
  - dimensions and licence on every card.
- **Item workflows:**
  - `duplicateItem` (Inspector button, Ctrl+D), which stays inside the room;
  - `setItemVariant` with Inspector finish swatches: 5 fabrics for the sofa, 4 bouclés for the bed
    and rug.
- **Thumbnails** (D18): `scripts/capture-thumbnails.mjs` plus the dev-only `/__studio` page; 24 asset
  thumbnails and 1 template thumbnail captured from the real renderer.
- **Engine:**
  - room types `dressing`, `pooja`, `laundry`, `garage`, `balcony`, `terrace` and `courtyard`;
  - open-air rooms (D19): `wallSides(p, indoorOnly)`, no roof slab, ceiling, skirting or light, a
    facade finish facing them, parapets allowed (minimum wall height 0.9 m);
  - asset categories `lighting`, `plants` and `outdoor`.

**Defects found and fixed:**

| # | Defect | Cause | Fix |
|---|---|---|---|
| 1 | Lounge chair and study armchair partly inside walls in the original house | Rotated footprints were never checked | New invariant "furniture inside its room, clear of walls"; both moved |
| 2 | Library showed empty category chips | Categories listed from the type, not the data | Only categories with items are shown |
| 3 | First E2E run of the new spec tested a stale build | A type error in the new test stopped `npm run build`, so Playwright used the previous `dist/` | Fixed the test helper types; re-ran on a fresh build (the gate script builds before testing and its output is checked) |
| 4 | Dev server served a 404 for the moved templates module | Vite's module graph went stale after `templates.ts` became a folder | Restarted the dev server (found by a page-error check) |

**Browser validation:**
- Production build, Playwright headless on the real GPU: the Designs gallery, search, preview and
  create flow, the library, placing, duplicating, changing finishes, undo and reload.
- Screenshots inspected: `docs/screenshots/editor/p3m1-gallery.jpg`, `p3m1-preview.jpg`,
  `p3m1-library.jpg`. No console errors.

**Commands & results:** see TESTING "Phase 3 — M1".
- unit 107/107;
- E2E 47 passed, 2 skipped, 0 failed;
- `npm audit` 0, Semgrep 0 (86 files), Gitleaks 0.

**Known limitations after M1:**
- Only one house template exists; the batches are P3-M4/M5.
- Ten catalogue entries are parametric (code-modelled), and five of them are visibly crude
  (kitchen, bath, vanity, WC, wardrobe). They are replaced in P3-M3.
- The plan view doesn't yet draw open-air rooms differently from indoor rooms.

**Commit:** `086dcf9`, pushed to `origin/feature/house-library-and-assets` (fast-forward, no force), author and committer `devacharan-cu <devacharan@gmail.com>`, no co-author trailer.

## P3-M2 — Asset pipeline and furniture library

**What changed and why:**
- **The library grew from 26 to 82 entries.** There are 72 distinct third-party models (55 newly
  sourced from Poly Haven, 3 already bundled for the Garden Room and now in the editor, and the 14
  from before) plus 10 parametric pieces.
- **Coverage:** seating, tables and nightstands, storage, a bed, a cooker, lighting (desk lamp,
  pendants, chandelier, ceiling fan, wall light, diya lantern), decor (mirror, framed art, vases,
  cushions, baskets, clock), indoor plants, and outdoor and garden items.
- **Pipeline** (docs/ASSETS.md):
  - API download with a unique user-agent, per Poly Haven's ToS;
  - multi-variant packs split;
  - glTF-Transform (meshopt, WebP 1024) run outside the project dependencies;
  - bounds, triangles and textures measured from the optimised files;
  - thumbnails from the real renderer;
  - contact-sheet review and in-room inspection.
- **Placement** (D20): wall items snap to walls, ceiling items hang, and small items stand on tables,
  counters and sofas (which carry them when moved). Collisions ignore anything not on the floor.
- **Asset register:**
  - a generated `docs/asset-manifest.json` (id, name, category, file, licence, attribution and
    whether it is required, source, footprint, mount, triangles, texture MP, kB, thumbnail);
  - a human-readable table in `docs/ASSETS.md`;
  - an in-product **Credits** section on every item showing the author, licence and source.
- **The capture script fails on load errors**, so regenerating thumbnails is also a load test of
  every model in the real renderer.

**Defects found and fixed:**

| # | Defect | Cause | Fix |
|---|---|---|---|
| 1 | Plants measured 2.5–6.9 m wide | Poly Haven packs 4–6 variants per file, and the optimiser joined them | Extract one variant (root node), re-centre, prune |
| 2 | Framed print and photo frame looked black | Glass material without factors → glTF default metalness 1 | Materials named *glass* load as clear, thin, non-metallic panes |
| 3 | Ceiling fittings' thumbnails tiny and off-frame | Studio hung them from a 2.7 m ceiling | Studio ceiling = the fitting's height |
| 4 | Vase and cushions fell to the floor on old tables and the sofa | Earlier catalogue entries had no usable top | Added `surface` to 13 entries |
| 5 | Downloads failed on long texture paths | Windows MAX_PATH with deep scratch paths | Extended-length paths in the fetch script |
| 6 | Two frames got the wrong 180° yaw while investigating #2 | I misread the dark glass as the back | Reverted after the material fix showed the art |
| 7 | New E2E ran against a stale build again (missing `z` on the test type) | `npm run build` aborts on type errors | Gate now runs browser tests only after a successful build |
| 8 | One gate run stalled for 2 h, with one 3D door-placement test failing inside it | Abnormal run (likely the machine slept mid-run; a new worker spawned after 2 h) | Stopped and re-ran the full suite: 49 passed. The failure didn't reproduce, so it's recorded as a possible flake to watch |

**Excluded models:** the CRT TV, the 2.27 m chair, an 18 cm stool, a spread-out tea set, and
FBX-only books (reasons in ASSETS.md).

**Commands & results:** see TESTING "Phase 3 — M2".
- unit 169/169;
- E2E **49 passed, 2 skipped** (device-specific), 0 failed, 7.8 min;
- 82/82 assets load;
- `npm audit` 0, Semgrep 0 findings, 88 files, Gitleaks 0.

**Known limitations:**
- **Third-party furniture style is mostly vintage, rustic or traditional** (photo-scanned, real-scale).
  No redistributable contemporary sofas, beds, kitchens or sanitaryware were found. The parametric
  pieces fill that gap and are rebuilt in P3-M3.
- **Mirrors reflect the outdoor sky.**
- **The heaviest model has 154k triangles** (a leafy plant).

**Commit:** `6aff0eb`, pushed to `origin/feature/house-library-and-assets` (fast-forward, no force), author and committer `devacharan-cu <devacharan@gmail.com>`. The in-progress P3-M3 edits were kept out of this commit, and a rebuild produced identical bundle hashes to the build the browser suite tested.

## P3-M3 — Materials and interior realism

**What changed and why:**
- **Finish library:**
  - floors 4 → 15: light oak, parquet, terrazzo, terracotta, checkerboard, granite, polished
    concrete, pebble mosaic, teak deck, patio, crazy paving;
  - walls 4 → 9: warm greige, white wall tile, white panelling, whitewashed brick, stone cladding;
  - a new per-project **facade** with 6 finishes (render, stucco, sandstone, charcoal, brick, stone),
    picked in the project panel.
  - All are CC0 textures with physical tile sizes, and textures load only when a finish is used.
- **Parametric fixtures** (D21) replace the block placeholders:
  - kitchen: run in 3 m and 2.4 m, an island with a seating overhang and waterfall ends, wall units,
    a tall fridge housing, a steel fridge, a cooker hood; with 5 finish combinations (fronts,
    worktop and handles);
  - bathroom: freestanding bath, vanity (4 finishes), wall-hung WC, walk-in shower, mirror;
  - bedroom and study: beds in single, double and king; wardrobes with 2 and 3 doors (5 finishes);
    desk; dining tables of 1.8 m and 1.4 m.
  - Kitchen runs, vanities, WCs, showers, tall units and hoods snap to walls.
- **Mirrors:** a true planar reflection at Quality only, with its cost measured (D21).
- **Site:**
  - the terrace follows the house footprint (roof outline offset 1.2 m);
  - the lawn breaks up its repetition with a two-scale, two-texture blend under a low-frequency
    variation (a shader patch on the lawn only).
- **Startup** (D22): parallel shader precompile, preloaded surfaces and project finishes, lazy
  finish textures. The longest main-thread freeze went from 3.2 s to 1.75 s, with total blocking from
  5.0 s to 3.9 s.

**Defects found and fixed:**

| # | Defect | Cause | Fix |
|---|---|---|---|
| 1 | Worktops showed a tile grid | Poly Haven `marble_01` is a tiled floor | Quartz surface: fine-grain set, tinted, without its colour map |
| 2 | Steel and the hob looked olive or blue | Mirror-like metal reflecting the green lawn HDRI | Brushed steel at 0.75 metal, 0.42 rough; hob at 0.18 rough |
| 3 | Malformed WC (seat beside a hemisphere) | The first geometry attempt | Lathed elongated bowl, torus seat, oval lid, carrier box |
| 4 | Load "regressed" to 6–7 s | A 3–4 s main-thread stall that already existed in P3-M2; the earlier metric (time to first sky) hid it | Profiled: shader linking and texture upload; fixed (D22) |
| 5 | A bed's walnut texture was requested 5 s late | Sequential suspensions inside one component | Parallel preload of the fixtures' surface textures |
| 6 | Docs: texture names vanished from an ASSETS.md section | An unquoted shell heredoc ran the backticks as commands | Rewrote that section from a file |
| 7 | P3-M3 edits were made before P3-M2 was committed | Process slip | Backed up the M3 edits, committed M2 alone (identical bundle hashes to the tested build), then restored them |

**Commands & results:** see TESTING "Phase 3 — M3".
- unit 183/183;
- E2E **50 passed, 2 skipped** (device-specific), 0 failed, 7.8 min;
- `npm audit` 0, Semgrep 0 findings, 93 files, Gitleaks 0.

**Known limitations:**
- **Indirect light:** there is still no bounced light or ambient occlusion beyond contact shadows and
  skirting.
- **Startup** still spends about 1.9 s uploading textures and compiles late-loading models' shaders
  on first use.
- **Third-party furniture style** is mostly traditional or rustic (P3-M2).

**Commit:** `915793b`, pushed to `origin/feature/house-library-and-assets` (fast-forward, no force), author and committer `devacharan-cu <devacharan@gmail.com>`.
