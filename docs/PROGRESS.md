# Progress

## Phase 3 — house library, asset library, realism, product workflows

Branch: `feature/house-library-and-assets`, created from `feature/immersive-home-experience` @ `0a89fc6`
(verified equal to origin after `git fetch`; that branch holds the latest verified rendering milestone).
The plan and backlog are in [PRODUCT_ROADMAP.md](PRODUCT_ROADMAP.md).

| # | Milestone | Status | Commit | Evidence |
|---|---|---|---|---|
| P3-M0 | Baseline, audit, research, product roadmap | Done, pushed | `ad8db3a` | tsc/lint/unit 70/70/build/audit re-run on `0a89fc6`; E2E 44 passed + 2 skips on identical code (P2-M2 run) |
| P3-M1 | Template + asset architecture, gallery, asset browser, duplicate, item finishes, outdoor rooms | Done, pushed | `086dcf9` | 107/107 unit; E2E 47 passed + 2 device skips; audit 0, Semgrep 0, Gitleaks 0 |
| P3-M2 | Asset pipeline; library 26 → 82 entries (72 distinct third-party models); wall/ceiling/tabletop placement; credits | Done, pushed | `6aff0eb` | 169/169 unit; E2E **49 passed, 2 skipped** (device-specific), 0 failed, 7.8 min; 82/82 assets load in the real renderer |
| P3-M3 | Finish library (15 floors, 9 walls, 6 facades); parametric kitchens/bathrooms/beds/wardrobes (22 parametric entries); planar mirror at Quality; footprint terrace; anti-tiling lawn; startup 3.2 s → 1.75 s longest freeze | Done, pushed | `915793b` | 183/183 unit; E2E **50 passed, 2 skipped** (device-specific), 0 failed, 7.8 min |
| P3-M4 | 6 new house templates (7 total): studio, 2BHK city apartment, 3BHK family apartment, L-shaped bungalow, courtyard house, 4-bed family home; glazed double doors | Done | 3573763 (pushed) | 225/225 unit; E2E 57 passed, 2 skipped (viewport-specific); every room of every house walked |
| P3-M5 | Multi-storey: floors, stairs (parametric, validated, walkable), floor bar, per-floor plan and 3D; 5 new houses (12 total: duplex, row house, villa, verandah bungalow, 1BHK) | Done | f9f3e77 (pushed) | 274/274 unit; E2E 64 passed, 2 skipped (viewport-specific); keyboard stair climb in the production build |
| P3-M6 | Variants, finish packages, presentation, still export | Planned | | |
| P3-M7 | End-to-end review | Planned | | |

**Next concrete task:** P3-M6, variants and presentation.
1. Finish packages: whole-house finish schemes applied in one undoable step.
2. Presentation mode: a clean full-screen view with guided viewpoints per floor.
3. Still-image export of the current view.
4. Duplicate a project from the menu.

---

## Phase 2 — immersive home experience

Branch: `feature/immersive-home-experience`, created from `feature/building-engine` @ `262b47e` (verified
equal to `origin/feature/building-engine` after `git fetch`). Pushes go to the same-named remote branch;
`main` is never pushed.

| # | Milestone | Status | Commit | Evidence |
|---|---|---|---|---|
| P2-M1 | Game-like navigation: full-screen walk + free camera + orbit presets; fixed overlapping-opening warnings | Done, pushed | `3e08119` | 61/61 unit; E2E 41 passed + 2 device skips; headed + headless browser validation; audit 0, Semgrep 0, Gitleaks 0 |
| P2-M2 | Real-time rendering: real sky + matched sun, lawn/terrace/path, roof, joinery, skirting, ceilings, room light, quality levels; entrance arrivals | Done, pushed | `2412408` | 70/70 unit; E2E 44 passed + 2 device skips; performance table in TESTING; audit 0, Semgrep 0 findings, 78 files, Gitleaks 0 |
| P2-M3 | Asset and material library | Planned | | |
| P2-M4 | Complete-home and room templates | Planned | | |
| P2-M5 | Product polish and final regression audit | Planned | | |

---

## Phase 1 / building-engine milestones

Branch: `feature/building-engine` (remote: github.com/devacharan-cu/studio-configurator). `main` holds the Phase 1 baseline locally and is not pushed without approval.

| # | Milestone | Status | Commit | Evidence |
|---|---|---|---|---|
| M0 | Git baseline, environment audit, regression baseline | Done | `9cb62cc` (baseline), `f37f00f` | typecheck/lint OK, 26/26 unit, 19/19 e2e (+1 skip), audit 0, gitleaks 0 |
| M1 | Building model, geometry kernel, commands, history, persistence (engine only) | Done | `be71f43` | 50/50 unit (24 new), typecheck, lint, build, audit 0, Semgrep 0 |

| M2 | Editor shell: 2D plan editor + derived 3D view on one store; undo/redo; autosave; inspector | Done | `2046f23` | 50/50 unit; E2E 27 passed + 1 skip (8 editor, 19 Garden Room); typecheck, lint, build, audit 0, Semgrep 0, Gitleaks 0 |

| M3 | Direct 3D editing (walls, openings, furniture) + 3D placement tools | Done | `a248826` | 50/50 unit; E2E 31 passed + 1 skip; typecheck, lint, audit 0, Semgrep 0, Gitleaks 0 |

| M4 | First-person walkthrough: collision, rooms, transitions, touch | Done | `0f94fbd` | 50/50 unit; E2E 35 passed + 2 skips (device-specific); lint, audit 0, Semgrep 0, Gitleaks 0 |

| M5 | Performance evidence, responsive/UX review fixes, documentation | Done | `61839e0` | 53/53 unit; E2E 35 passed + 2 skips; typecheck, lint, build, audit 0, Semgrep 0 (114 rules/70 files), Gitleaks (src + history) 0 |

## Recommended next milestone
**M6 — Presentation & review mode on the building model.** Rebuild the Garden Room's client flow (curated, approved options; save/compare variants; share link; structured brief) on top of the new engine, so a builder can publish a version of a real home and a client can walk it, choose from approved finishes and leave feedback. It reuses everything proven here (model, commands, walkthrough) and is the step that lets the product be validated with real builders and studios.

Close behind: multi-level UI with stairs (schema and commands already support levels); free-form polygon rooms and wall deletion; instancing/LOD for repeated furniture (draw calls 376, triangles 421k today).
