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
