# Security review — Phase 1

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
