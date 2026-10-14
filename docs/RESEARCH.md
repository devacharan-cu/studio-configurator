# Research record — Phase 1

Conducted 2026-10-13. "Observed" = seen first-hand in a browser or fetched page during this session.
"Vendor claim" = stated by the vendor, not verified. Hypotheses are marked as such.

## Tooling used
- Claude in Chrome (real browser, live interaction) — Polestar, Vitra, Planner 5D, pmndrs, Norm Architects, Studio McGee, Roomle.
- WebFetch (page → text) — DesignFiles, Programa, Houzz Pro, R3F docs. IKEA Kreativ URL returned 404 (not inspected).
- Poly Haven public API + Khronos glTF-Sample-Assets repo (asset discovery, licence metadata).
- Not available in this environment: Firecrawl, Context7, Playwright MCP. Playwright was used via npm instead for testing.

## Sources

| # | Source | What was actually observed | Insight / opportunity |
|---|--------|----------------------------|-----------------------|
| 1 | polestar.com/us/configure/polestar-4-coupe | (Mobile-width viewport, 492px.) Product image pinned at top with prev/next view arrows; options stacked below as large cards. Selected card = thin orange outline. Colour swatches as square tiles, with the selected swatch's name + one-line description under the grid ("Lightning — silver metallic…"). Options gated with plain-language reasons ("Only available with Performance pack"). Sticky bottom bar with running summary. URL carries `?state=…` encoding the configuration. Choosing an interior trim did **not** change the camera to the interior. | Adopt: named swatch + short description of the current pick; plain-language explanation for disabled states; config-in-URL. Improve on: bring the camera to the thing you're changing. |
| 2 | vitra.com/en-us/product/soft-modular-sofa | Product page → "Configure" opens a 3D configurator. At a 1010×915 window it showed only "Please rotate your screen." Page itself uses editorial photography of the sofa in a styled room. | The configurator has no portrait/square layout. Opportunity: a configurator that genuinely works in portrait. Editorial "in a room" imagery is how premium brands sell — product in context, not on white. |
| 3 | planner5d.com/editor | Redirected to a sign-up wall (Google / Apple / email) before any exploration. | Friction before value. Our client experience must open straight into the room, no account. |
| 4 | pmndrs.github.io/examples/shoe-configurator (R3F) | Clicking a part of the 3D shoe selects it and shows an unconstrained colour picker with the part name. | Adopt: click an object in the scene to jump to its options. Reject: free colour pickers — a studio needs a curated, approved palette. |
| 5 | roomle.com/en/configurator | Marketing page. Positioned at manufacturers: parts lists, live price calculation, "error-free orders", API/SDK, AR. Uplift statistics (+47% sales etc.) are **vendor claims**, unverified. Mentions a "Room Designer" for sets/rooms. | Incumbents serve manufacturers/retail (SKU → order). Gap (hypothesis): a studio-curated room with a *decision brief* back to the designer rather than a cart. |
| 6 | designfiles.co/features (fetched) | Client portal; clients approve/decline products with tracked history; templated presentations; 3D floor planner listed without detail; approved items flow into quotes/invoices. | Approval and history matter. Our brief should capture *exactly* which options were chosen, as structured data. |
| 7 | programa.design/features (fetched) | Per-line-item approve/reject/comment; live shareable schedules; branded client dashboard via a single link, **no client login**; per-view control of what the client sees. | Validates "one link, no login" for clients, and studio-branded presentation. |
| 8 | pro.houzz.com blog, "10 features…2026" (fetched) | Checklist: swap finishes live during client feedback, presentation + sharing, clients comment asynchronously, saved views. Does not mention formal approvals. | Saved camera views and asynchronous review are expected baseline. |
| 9 | normcph.com (Norm Architects) | Warm off-white ground, small letter-spaced uppercase headings, very generous whitespace, muted palette, photography-led. | Visual language reference for a calm, premium UI. |
| 10 | studio-mcgee.com | Deep muted grey-green hero, letter-spaced logotype, uppercase serif headline with an italic word for emphasis. | Serif display + italic accent + tracked small caps reads "design house", not "SaaS". |
| 11 | r3f.docs.pmnd.rs examples page (fetched) | Lists t-shirt and shoe configurators, "room-with-soft-shadows". | Confirms R3F + Drei patterns for configurators; no room configurator reference to copy. |
| 12 | three.js `webgl_loader_gltf_variants` example source | Selecting `KHR_materials_variants` via `parser.getDependency('material', …)` + `assignFinalMaterial`. | Used directly for the velvet sofa's fabric variants. |
| 13 | Poly Haven API + Khronos glTF-Sample-Assets metadata.json | Licence metadata per asset (see Assets section in README). | Real, CC0 scanned/modelled furniture and PBR textures are available; Poly Haven sofas are traditional in style. |

## Synthesis → design decisions
1. **Room first, no gate.** Opens directly into the 3D room (contrast: Planner 5D sign-up wall).
2. **Curated, named options** with short descriptions, not colour pickers (pmndrs, Polestar).
3. **Camera follows intent.** Selecting a group frames that object (Polestar weakness).
4. **Click-to-select in 3D** jumps to the object's option group (pmndrs).
5. **Works in portrait.** Bottom-sheet controls on phones (Vitra weakness).
6. **Config in the URL**, validated, no login to view (Polestar, Programa).
7. **Output is a decision brief, not a cart** (Roomle/DesignFiles serve procurement; studio clients need to communicate preferences).
8. **Visual identity**: warm neutral ground, serif display with italic accent, tracked small caps (Norm, Studio McGee).

## What was not verified
- No competitor pricing, market size, or adoption figures were collected or are claimed.
- IKEA Kreativ not inspected (URL 404). Planner 5D editor not inspected (sign-up required; account creation not permitted).

---

# Research — building engine milestone (2026-10-13)

| Source | Verified finding | Influence |
|---|---|---|
| github.com/cvdlab/react-planner — `src/models.js` (read raw source) | Layers hold `vertices`, `lines` (walls, referencing 2 vertices + holes), `holes` (openings with `offset` along their line), `areas` (vertex lists), `items`; Immutable records + a `HistoryStructure`. MIT. Last commit 2019-11-03 (GitHub API). | Confirms vertex/wall graph + openings parametric on a host wall + rooms as vertex cycles + per-level layering. Not used as a dependency (unmaintained, Redux/Immutable). |
| github.com/furnishup/blueprint3d | `model` (floorplan + items), `floorplanner` (2D), `three` (3D). README calls it a rushed prototype; todo list includes adding tests and removing jQuery. Last commit 2016-07-10. | Same corners/walls/rooms split; reinforces writing a tested kernel instead. |
| github.com/mfogel/polygon-clipping | Martinez-Rueda-Feito boolean ops, MIT; README warns round-off can cause infinite loops (guarded by env limits). | Not needed: with non-crossing walls, room overlap reduces to interior-point tests (D1). |
| github.com/gkjohnson/three-bvh-csg | Fast BVH CSG, MIT, "experimental, in progress"; needs two-manifold brushes; no interactive benchmarks; worker support on roadmap. | Rejected for openings (D2). |
| Help pages: Space Designer 3D, Chief Architect Room Planner, pCon.planner (via search results) | Rooms auto-detected when walls close; drag a wall to resize a room; drag corners; doors/windows snap into the nearest wall; split-wall tools. | Matches our interaction model: draw room, drag wall/corner, click a wall to add doors/windows. Floorplanner's own help pages did not appear in search — not verified. |
| cedreo.com/room-planner (fetched) | Product claims: 3D updates as you draw in 2D; live wall lengths and area table. Time-saving claims are marketing, unquantified. | Live dimensions and room areas in the plan; 2D/3D side by side. |

---

# Research — Phase 2: immersive navigation and real-time graphics (2026-10-13)

The tools in this environment are WebFetch and WebSearch, headless and headed Playwright Chromium on
the real GPU, and the Claude in Chrome extension. Context7 and Firecrawl are not installed (see
AUDIT_LOG, Phase 2 tool audit), so documentation was fetched from the official sites directly.

| Source | Verified finding | Influence |
|---|---|---|
| threejs.org/docs/pages/PointerLockControls.html | `lock(unadjustedMovement)` disables OS mouse acceleration; pitch is limited by `min/maxPolarAngle`; `pointerSpeed`; `moveForward` and `moveRight` move parallel to the xz-plane; lock/unlock events. | We call `requestPointerLock({ unadjustedMovement: true })` with a fallback, mirror the lock/unlock UI pattern, and write our own controller (D12). |
| threejs.org/manual/pages/webgpurenderer | "Experimental". Falls back to WebGL 2. No `ShaderMaterial`, `onBeforeCompile` or `EffectComposer`; node-based post-processing with SSGI. May be slower than `WebGLRenderer` for some scenes. `WebGLRenderer` remains maintained and recommended for pure WebGL 2. | Stay on `WebGLRenderer` (D11). |
| developer.playcanvas.com/user-manual/graphics | Runtime lightmapper; clustered lighting for hundreds of lights; area lights; IBL with HDR; SSAO in post; Basis texture compression; Gaussian splats; ACES and Neutral tone mapping. No dedicated GI system. | Lightmaps are the transferable idea; evaluated for M2 within three.js. |
| Babylon.js 8.0 announcement (blogs.windows.com, 2025-03-27, via search) | IBL shadows (Adobe contribution), area lights, Node Render Graph (alpha), WGSL core shaders. | Not compelling enough to justify a migration (D11). |

**What was measured rather than read:**
- Pointer lock in headless Chromium: the lock is granted and `movementX/Y` are reported for Playwright
  mouse moves, so look direction can be tested automatically.
- A synthetic Esc does **not** release the lock. Tests call `document.exitPointerLock()`, which is
  what a real Esc does.
- Frame times in a headed window: see TESTING.

## M2 — rendering (2026-10-14)

| Source | Verified finding | Influence |
|---|---|---|
| three r186 source, `WebGLShadowMap.js` | `PCFSoftShadowMap` has been removed: using it warns and falls back to `PCFShadowMap`. PCF now takes 5 Vogel-disk taps with hardware comparison, scaled by `shadow.radius`. | Soft shadows come from `PCFShadowMap` + `shadow.radius` per quality level. |
| three r186 `examples/jsm/loaders/RGBELoader.js` | Deprecated in r180 in favour of `HDRLoader`. | The editor loads its HDRI with `HDRLoader`. |
| three r186 `ProgressiveLightMap.js`; drei `AccumulativeShadows`, `BakeShadows` | Lightmap accumulation assumes static objects with lightmap UVs. | Baking rejected while geometry is editable (D15). |
| Poly Haven API (`/info`, `/files`) | Authors, CC0 licence, physical texture sizes (e.g. Grass Ground 2.51 m, Rectangular Paving 2.0 m), HDRI resolutions. | Tile sizes and the asset register (ASSETS.md). |
| Our own HDRI analysis (`meadow_2_1k.hdr`) | The sun is at u 0.600, v 0.350 (azimuth 36°, elevation 27°) and holds 72% of the image's energy. | The sun becomes a real shadow-casting light; the lighting copy has it clamped out (D14). |
| Measurement (Playwright, headed, Radeon 610M) | Pixel ratio dominates frame time. The sun shadow costs ~4 ms; one point light ~0; six point lights +20–30 ms over one. | Quality presets and the single room light (D16). |

Post-processing (SSAO, bloom) was not re-evaluated, because D7's measurement still applies: it caused
frame spikes on the target GPU.
