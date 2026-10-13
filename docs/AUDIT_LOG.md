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
