# Progress

## Phase 2 — immersive home experience

Branch: `feature/immersive-home-experience`, created from `feature/building-engine` @ `262b47e` (verified
equal to `origin/feature/building-engine` after `git fetch`). Pushes go to the same-named remote branch;
`main` is never pushed.

| # | Milestone | Status | Commit | Evidence |
|---|---|---|---|---|
| P2-M1 | Game-like navigation: full-screen walk + free camera + orbit presets; fixed overlapping-opening warnings | Done | _see AUDIT_LOG_ | 61/61 unit; E2E (see AUDIT_LOG); headed + headless browser validation; audit 0, Semgrep 0, Gitleaks 0 |
| P2-M2 | Real-time rendering quality (materials, lighting, environment, framing) | Planned | | |
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
