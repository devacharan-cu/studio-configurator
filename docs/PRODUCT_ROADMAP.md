# Product roadmap — Studio Configurator

Written at the start of Phase 3 (house library, assets, realism; 2026-10-14). It is based on the
competitor research in RESEARCH.md ("Phase 3") and an audit of this repository at `0a89fc6`.

## 1. Who it is for, and the problem worth solving

| Customer | Job to be done | What they use today (observed) |
|---|---|---|
| Real-estate developer (apartments, villas) | Show buyers a standard plan, its variants and a curated set of finish upgrades; collect the buyer's selections | Static brochures and renders; US builders use Zonda Envision / Higharc Showroom-type configurators |
| Custom home builder | Start from a proven plan, reshape it with the client, furnish it, show revisions, walk through before building | Cedreo, Chief Architect, SketchUp; renders sent as images |
| Interior design studio | Furnish and finish a real layout, compare options, present to a client | Coohom, Homestyler, Planner 5D, HomeByMe |

Where this product can be different (a hypothesis to test, not a proven advantage):
1. **One editable model behind everything.** The plan, the 3D view, the walkthrough and the file are
   the same validated data, so a buyer-facing variant cannot drift from the plan. Higharc markets this
   idea ("plans, visualizers and estimating stay in sync"); mass-market consumer planners don't.
2. **Developer variants and finish packages on the web, with no install,** at a price aimed at Indian
   developers and builders. The US configurators (Zonda Envision, Higharc) are enterprise products for
   US builders.
3. **A real-time walkable house in the browser** on ordinary laptops (measured on an integrated GPU),
   instead of a render queue.

What is *not* a differentiator: catalogue size. Floorplanner advertises 260,000 models, Coohom
600,000+ and Homestyler "10 million". We cannot compete on count; we can compete on curated, licensed,
quality-controlled content that fits real homes.

## 2. Competitive capability matrix

Sources and confidence: RESEARCH.md Phase 3. ✓ = stated on the vendor's own page; ~ = partial or
implied; ? = not stated or not verified; ✗ = absent. Only what we verified is marked.

| Capability | Planner 5D | Floorplanner | Coohom | Homestyler | HomeByMe | Cedreo | Chief Architect | Higharc | Zonda Envision | **Ours (0a89fc6)** |
|---|---|---|---|---|---|---|---|---|---|---|
| 2D plan → 3D | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ~ | ✓ |
| Ready-made house/room templates | ~ | ? | ✓ rooms | ✓ 500+ | ~ gallery | ✓ house & lot catalogue | ? | ✓ plan library | ✓ builder plans | ✗ (1 house) |
| Furniture catalogue | 8,000+ | 260,000+ | 600,000+ | "10M" | branded | ✓ | ✓ | ? | finishes, 225+ brands | 26 entries |
| Real-time walkthrough | 360° tour | ? | ✓ VR tour | VR/AR | ? | ? | video path | ~ | ✓ 3D | ✓ walk + fly |
| Photoreal stills | 4K | 8K | ✓ ~10 s | cloud render | 4K | ✓ minutes | ray trace | ✓ | ✓ | ✗ (real-time only) |
| Kitchen/cabinet design | ? | ? | ✓ | ? | ✓ planner | ? | ✓ catalogues | ? | ✓ finishes | ✗ |
| Multi-storey + stairs | ? | ? | ? | ? | ? | ? (sections) | ✓ stairs | ✓ | ✓ | ✗ (schema only) |
| Roofs | ? | ? | ? | ? | ? | ✓ roof plans | ✓ styles | ✓ | ~ | ~ flat, derived |
| Buyer options / variants | ✗ | ✗ | ✗ | ✗ | ✗ | ~ presentations | ✗ | ✓ Config/Showroom | ✓ | ✗ |
| Construction docs / estimating | ✗ | ✗ | ✗ | ✗ | ✗ | elevations, areas | ✓ | ✓ | ✗ | ✗ (areas only) |
| AI layout/plan recognition | ✓ | ? | ✓ | ✓ | ? | AI render styles | ✗ | AI estimating | ✗ | ✗ |
| Validated editing (rejects invalid geometry) | ? | ? | ? | ? | ? | ? | ~ | ? | n/a | ✓ |
| Price | free + paid | free + credits | free + paid | free + paid | free + paid | paid | $1,995/yr | enterprise | enterprise | — |

## 3. Ranked opportunity backlog

Priority = customer value × how much it unblocks, ÷ cost and risk. Status as of this milestone.

| # | Feature | User problem | Benefit | Complexity | Depends on | Priority | Status | Acceptance |
|---|---|---|---|---|---|---|---|---|
| 1 | House template library (10–15 houses) + browser | One sample house; nothing to start from | Very high: the first thing a builder evaluates | M per house, L total | 2, 4, 5 | P0 | Planned (P3-M4/M5) | ≥10 distinct valid houses; each opens in 2D/3D, walks, edits, saves; real thumbnails |
| 2 | Template/asset architecture (registry, manifest, validation) | Content can't scale without data-driven registries | Unblocks 1, 3 | M | — | P0 | Planned (P3-M1) | Templates and assets are data plus validated builders; tests check every entry |
| 3 | Real model library ≥40 (target 60–75) | Block-like furniture; 10 code-modelled placeholders | Very high: realism and usefulness | L | 2 | P0 | Planned (P3-M2) | ≥40 distinct licensed models, measured, thumbnailed, placeable, saved |
| 4 | Asset browser: thumbnails, search, categories, recents, states | Text list without previews | High | M | 2, 3 | P0 | Planned (P3-M1/M2) | Search → preview → place → edit → save works in E2E |
| 5 | Duplicate / copy items; material options per item | Furnishing is slow; no finish choice per piece | High | S–M | — | P0 | Planned (P3-M1) | Duplicate + material change are undoable commands |
| 6 | Multi-storey: level UI, stairs, slab voids, walk between levels | Duplex, townhouse and villa templates impossible | High (developer market) | L | 2 | P1 | Planned (P3-M5) | Real stairs connect levels; walkthrough climbs; templates use it |
| 7 | Kitchen and bathroom parametric fixtures | No CC0 photoreal kitchen cabinetry exists; current blocks look crude | High | M | 3 | P1 | Planned (P3-M3) | Cabinet runs with doors, handles, worktop, sink, hob; bathroom fixtures |
| 8 | Material library: tiles, stone, wood, concrete, paint, fabric | Few finishes; everything looks similar | High | M | — | P1 | Planned (P3-M3) | ≥20 finishes with swatches; per-room and per-item choice |
| 9 | Site that follows the footprint; lawn without visible repetition | Reported rectangular terrace and tiled lawn | Medium | S–M | — | P1 | Planned (P3-M3) | Terrace offset from the outline; anti-tiling lawn |
| 10 | Finish packages / design variants per project | Developers sell standard plans with upgrade packages | Very high for developers | M | 8 | P1 | Planned (P3-M6) | Save named variants; switch and compare; apply a finish package |
| 11 | Client presentation (read-only view, guided viewpoints) | Builders need a buyer-safe view | High | M | 10 | P2 | Planned (P3-M6) | Read-only mode with no editing chrome, room tour, variant switch |
| 12 | Still image export (high-res screenshot from any camera) | Marketing needs images | Medium | S | — | P2 | Planned (P3-M6) | Downloads a PNG at 2× of the current view |
| 13 | Room/finish schedule (areas, finishes, item list) | Builders need quantities | Medium | S | 8 | P2 | Candidate | CSV/print view derived from the model |
| 14 | Mirror reflections (bathroom) | Mirrors show the outdoor sky | Low–medium | S | — | P2 | Candidate (P3-M3) | Planar reflector on mirrors only, measured cost |
| 15 | Free-form room shapes (polygon drawing) | Only rectangles can be drawn | Medium | M | — | P2 | Candidate | Draw arbitrary orthogonal/angled rooms |
| 16 | Accounts, cloud projects, sharing links with comments | Collaboration with clients | High eventually | XL (infra, security) | 11 | P3 | Deferred: no workflow yet justifies a backend | — |
| 17 | AI plan recognition / auto-furnish | Competitors market it | Uncertain | XL | — | P3 | Deferred | — |
| 18 | Construction documents / estimating | Higharc, Chief Architect | High for builders, outside current scope | XL | 6 | P3 | Deferred | — |

## 4. Milestone sequence (Phase 3)

| Milestone | Scope | Why in this order |
|---|---|---|
| P3-M0 | Baseline, audit, research, this roadmap | — |
| P3-M1 | Template + asset architecture: registries with metadata, house-spec builder, validation of every template/asset, template gallery, asset browser foundation, duplicate item, item material options | Content is cheap to add only once the pipeline is data-driven and validated |
| P3-M2 | Asset pipeline + library to ≥40 real models (optimise, measure, thumbnail, manifest) | Templates need the furniture to exist first |
| P3-M3 | Materials + interior realism: finish library, parametric kitchen/bath, site following the footprint, lawn anti-tiling, measured lighting/reflection improvements | Templates should be built with the final materials and fixtures |
| P3-M4 | First batch of single-storey houses and apartments (≈6) | Uses everything above; single-storey needs no new engine work |
| P3-M5 | Multi-storey engine (levels UI, stairs, voids, walkthrough) + duplex/townhouse/villa templates to reach 10–15 | Multi-storey is a real engine milestone, so it gets its own verified step |
| P3-M6 | High-value workflows: variants/finish packages, presentation mode, still export, project duplicate | Developer-facing value on top of the content |
| P3-M7 | End-to-end review, performance, security, licensing, commercial readiness | — |

Changes from the brief's suggested order: none so far. Multi-storey is placed inside M5 (before the
duplex/townhouse templates that need it), as the brief allows.

## 5. Commercial readiness (honest status)

**What exists:** a working browser editor with validated geometry, a walkthrough, and licensed assets
with provenance.

**What has not been demonstrated:** any customer, pilot, willingness to pay, retention or revenue.
Nothing in this repository supports a valuation claim.

**What an acquirer or investor would look for:**
1. Paying or piloting customers (developers or builders), with repeat use.
2. A workflow that saves measurable time or money (for example, buyer selections without
   spreadsheets, the problem Drees describes solving with Envision).
3. Clean IP: an asset register with licences (`docs/ASSETS.md`), original code, dependency licences.
4. Reliability and security evidence: tests, audits, and before long a backend with authentication.
5. A content pipeline that scales (templates and assets as data).

**Validation plan (not yet started; no interviews or customers exist):**
1. Prepare a 10-minute demo: template → edit → furnish → walkthrough → variant comparison.
2. Approach 10–15 small and mid-size developers and builders (India: apartment and villa developers)
   for 30-minute demos. Record their current tools, how they present variants, and what they pay.
3. Offer 2–3 paid pilots (one project each) at a fixed fee to test willingness to pay.
4. Measure: time to produce a buyer walkthrough, buyer engagement, and selection errors avoided.
5. Decide the commercial model from the evidence: per-project, per-seat studio licence, or per-unit
   developer pricing.

**Costs to plan for:**
- **Asset rights:** CC0 now; branded catalogues need manufacturer agreements.
- **Hosting:** static site today; projects, sharing and comments need a backend.
- **Rendering:** photoreal stills would need GPU servers or a third-party renderer.
- **Support and onboarding.**
