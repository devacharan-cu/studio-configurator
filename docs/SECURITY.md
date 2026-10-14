# Security review

## Phase 3 — M5 (2026-10-15)

| Check | Result |
|---|---|
| `npm audit` | 0 vulnerabilities (no new dependencies) |
| Semgrep (5 rulesets) over `src`, `tests`, `scripts` | 0 findings |
| Gitleaks over `src`, `scripts`, `public`, `docs` | no leaks |

**New input surface: `stairs` in saved and imported projects.**
- It is parsed by the same strict schema: `.strict()` objects, bounded numbers, id-pattern keys,
  record keys must match ids, and the prototype-pollution key check.
- It is then checked by the stair validation rules before the project is accepted.
- A file with stairs on a level that has no floor above, or with an unsafe going, is refused with a
  message, never half-loaded.

## Phase 3 — M4 (2026-10-15)

| Check | Result |
|---|---|
| `npm audit` | 0 vulnerabilities (no new dependencies) |
| Semgrep (5 rulesets) over `src`, `tests`, `scripts` | 0 findings |
| Gitleaks over `src`, `scripts`, `public`, `docs` | no leaks |

No new input surfaces. Templates are code built through the validated commands. Template thumbnails
are static images captured by the repository's script.

## Phase 3 — M3 (2026-10-15)

| Check | Result |
|---|---|
| `npm audit` | 0 vulnerabilities (no new dependencies) |
| Semgrep (5 rulesets) over `src`, `tests`, `scripts` | 0 findings, 93 files |
| Gitleaks over `src`, `scripts`, `public`, `docs` | no leaks |

**New surfaces:**
- **`Project.facade`** is an optional, length-bounded string in the parser. `setFacade` accepts only
  known facade finishes, and the renderer falls back to the default for unknown ids, so a hostile file
  can't select an arbitrary texture path.
- **The lawn's shader patch** is a fixed string compiled once; no user input reaches shader code.
- **Texture paths** come only from bundled finish and surface definitions.

## Phase 3 — M2 (2026-10-15)

| Check | Result |
|---|---|
| `npm audit` | 0 vulnerabilities (no new dependencies) |
| Semgrep (5 rulesets) over `src`, `tests`, `scripts` | 0 findings, 88 files |
| Gitleaks over `src`, `scripts`, `public`, `docs` | no leaks |

**New surfaces:**
- **58 new GLB files**, self-hosted and loaded only from our origin. All are CC0, and the licence was
  verified at source.
- **Asset optimisation** ran outside the project's dependency tree (as in Phase 1).
- **`Item.z`** is accepted from project files only as a finite number in 0–4 m, and it is optional.
- **The Credits link** opens third-party source pages with `rel="noopener noreferrer"`. The URLs come
  from the bundled catalogue, never from project data.

## Phase 3 — M1 (2026-10-14)

| Check | Result |
|---|---|
| `npm audit` | 0 vulnerabilities (no new dependencies) |
| Semgrep (5 rulesets) over `src`, `tests`, `scripts` | 0 findings, 86 files |
| Gitleaks over `src`, `scripts` | no leaks |

**New surfaces:**
- **Recently used assets** in `localStorage` are untrusted: only ids that exist in the catalogue
  survive the read, capped at 8, and failures are swallowed.
- **The `/__studio` thumbnail page** exists only in the development server (`import.meta.env.DEV`).
  The release grep confirms neither the route nor the component is in `dist/`.
- **Finish variants** are validated against the asset's own list in the command (`setItemVariant`).
  The parser already bounds `variant` to a 40-character string, and the renderer looks it up rather
  than evaluating it.
- **Project files from older versions** still parse: the new room types are additions to the enum, and
  the lower minimum wall height only accepts more.

## Phase 2 — M2 rendering (2026-10-14)

| Check | Result |
|---|---|
| `npm audit` | 0 vulnerabilities (no new dependencies) |
| Semgrep (same 5 rulesets) over `src`, `tests` | 0 findings, 78 files |
| Gitleaks 8.30.1 over `src`, `public`, `docs`, `tests` and the full git history | no leaks |

**New surfaces:**
- **New static assets** (an HDRI, two sky JPEGs, three texture sets) are bundled and served from our
  own origin, like every other asset. An E2E test still fails on any off-origin request, and the CSP is
  unchanged.
- **`quality`** joins the per-viewer navigation settings. It is validated against the three known
  levels on read; anything else falls back to Balanced.
  - The check uses own keys only: my first version used `v in QUALITY`, which accepts `"constructor"`
    or `"toString"` from storage and would have handed the canvas a function as its pixel-ratio range.
    Found in diff review; unit-tested.
  - It is never written into the project file (E2E-checked).
- **HDR parsing** uses three.js' own `HDRLoader`, and only on our bundled file. No user-supplied HDRs or
  images are loaded.

## Phase 2 — M1 navigation (2026-10-13)

| Check | Result |
|---|---|
| `npm audit` | 0 vulnerabilities (no new dependencies) |
| Semgrep 1.180 (`p/javascript p/typescript p/react p/secrets p/owasp-top-ten`) over `src`, `tests` | 0 findings, 114 rules, 73 files |
| Gitleaks 8.30.1 over `src` and the full git history | no leaks |

**New surfaces:**
- **Navigation settings** in `localStorage` (`roomset.editor.v1.nav`) are untrusted on read. Each value
  is type-checked and clamped to its range, and anything else falls back to the defaults. Reads and
  writes are wrapped, so blocked storage is harmless.
- **Pointer Lock and Fullscreen APIs** are requested only from user gestures (a click on the canvas or
  a HUD button), and every promise rejection is handled. Leaving walk/fly releases both.
- **Dev handles:** a new dev-only `__three` state getter sits next to `__editor` and `__gl`, behind
  `import.meta.env.DEV`. Its absence from `dist/` is checked by the release grep (AUDIT_LOG).


## Building editor milestone (2026-10-13)

| Check | Result |
|---|---|
| `npm audit` | 0 vulnerabilities (one new runtime dependency: zod 4.6.7, MIT) |
| Semgrep 1.180 (`p/javascript p/typescript p/react p/secrets p/owasp-top-ten`) over `src`, `tests` | 0 findings |
| Gitleaks 8.30.1 over `src` and git history | no leaks |
| E2E | corrupted/hostile saved project refused; Garden Room hostile-link and same-origin tests still pass |

**Untrusted input surfaces and handling**
- *Project files (import) and autosave.* Imported files are capped at 5 MB, then:
  - JSON parse;
  - explicit rejection of `__proto__`, `constructor` and `prototype` keys at any depth (zod would
    otherwise drop them silently);
  - nesting depth limit;
  - strict zod schema: id patterns, numeric ranges, string lengths, no unknown fields, key/id
    agreement, ≤ 5000 entities per collection;
  - version migration;
  - the full structural `validateProject`.

  A failure loads nothing and explains why. The editor still opens on the template.
- *Names entered by users.* Room names are stripped of control characters, limited to 40 characters and
  rendered as React text.
- *Export.* A Blob download of `serializeProject`. The filename is reduced to `[\w-]`.
- *Assets.* Loaded only from the same origin. The asset id must exist in the catalogue, so item asset
  strings never become URLs. Draco is disabled, so no decoder is fetched from a CDN.
- Dev-only handles (`__editor`, `__gl`) are behind `import.meta.env.DEV`; their absence from `dist/`
  was verified.

**Residual risks:** see the Phase 1 list below; they apply unchanged (`style-src 'unsafe-inline'`,
`'wasm-unsafe-eval'` for meshopt, header configuration depends on the host). Imported projects are
size-limited but a project at the entity limits could still be slow to render; there is no worker
isolation for parsing.

---

## Phase 1 — Garden Room

Scope: this repository only. There is no backend, no authentication and no outbound network calls.

## Checks run (2026-10-13)

| Check | Tool | Result |
|---|---|---|
| Dependency vulnerabilities | `npm audit` (prod + dev) | 0 vulnerabilities |
| Static analysis | Semgrep 1.180.0, rulesets `p/javascript p/typescript p/react p/secrets p/owasp-top-ten` (118 rules, 43 files) | 0 findings |
| Secret scanning | Gitleaks 8.30.1 (checksum-verified release) over `src tests scripts docs dist public/_headers vercel.json` | No leaks |
| Same-origin loading | Playwright test: records every request during load + option change | Only same-origin, `data:` and `blob:` |
| Served headers | Playwright test against `vite preview`; unit test that `vercel.json` / `public/_headers` match `vite.config.ts` | Pass |

Passing scans do not prove the application is secure; they reduce known classes of risk.

## Review notes (OWASP-informed)

- **XSS.** There's no `dangerouslySetInnerHTML`, `innerHTML`, `eval` or dynamic `Function`; React escapes all text. User-provided strings (design names, brief fields, notes) are rendered as text. The E2E suite submits HTML in notes and asserts no element is created.
- **Untrusted URL data.**
  - Share parameters are parsed with `URLSearchParams`. Each value must match `^[a-z0-9-]{1,48}$` and exactly equal an ID in the catalogue (array lookup, so prototype keys like `__proto__` are not matched).
  - Queries over 1 KB, duplicate keys, unknown versions and unknown templates are rejected.
  - Nothing from the URL reaches the DOM or the scene except as a validated ID.
- **Untrusted storage.**
  - Everything read from `localStorage` is re-validated: configurations through the same sanitiser, IDs by pattern, names stripped of control characters and length-limited.
  - Corrupted or tampered entries are dropped, and storage exceptions (private mode, quota) are handled.
- **Input validation.** The brief validates name, email, phone and notes with explicit length limits; control characters are stripped and whitespace normalised.
- **Secrets / env.** None exist; the app uses no `.env` variables. The dev-only store handle (`window.__store`) is behind `import.meta.env.DEV`, and its absence from `dist/` was verified.
- **External assets.**
  - All models, textures, fonts and the HDR are self-hosted.
  - Draco is disabled in the glTF loader, because drei would otherwise fetch a decoder from a CDN; meshopt decoding is bundled.
  - The only external links are the credit links (`rel="noopener noreferrer"`).
- **Headers** (`vite.config.ts` → `npm run headers` → `public/_headers`, `vercel.json`):
  - `Content-Security-Policy`: `default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; font-src 'self'; connect-src 'self' blob: data:; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'`.
  - Also `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (camera, microphone, geolocation and payment disabled) and `X-Frame-Options: DENY`.

## Residual risks / accepted for Phase 1

1. **`style-src 'unsafe-inline'`** is needed for React `style` props (swatches) and three.js/drei inline styles. Script injection is still blocked. Phase 2 could move swatch colours to CSS variables via classes and use nonces.
2. **`'wasm-unsafe-eval'`** is required by the meshopt WebAssembly decoder.
3. **Personal data in `localStorage`.** Briefs contain name, email and phone, stored unencrypted on the device. This is disclosed in the UI, and *About → Clear my data from this browser* removes everything. With a backend, briefs should move server-side with retention rules.
4. **Headers depend on the host.** `vite preview` and the provided `vercel.json` / `_headers` apply them. Any other host must be configured the same way.
5. **Build-time tooling not in the repo.** `@gltf-transform/cli` (used once for asset optimisation) has transitive `braces`/`micromatch` advisories, so it was run from an isolated scratch install and is not a project dependency.
