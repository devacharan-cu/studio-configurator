# Testing record — Phase 1 (2026-10-13)

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
