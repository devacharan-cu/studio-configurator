# Asset register

Every file under `public/assets/` comes from a recorded source under a licence that allows bundling
it with the app. Nothing is loaded from a third-party host at runtime: assets are copied into the
repository and served from our own origin (an E2E test fails on any off-origin request).

**Summary (Phase 3 M2):**
- **94 catalogue entries.** 72 are distinct third-party glTF models: 71 CC0 from Poly Haven and 1
  CC BY 4.0, which needs attribution. The other 22 are parametric pieces built in code for this project
  (P3-M3): kitchens, bathrooms, beds, wardrobes, tables and the mirror. They are textured with CC0 PBR
  sets.
- **Machine-readable manifest:** `docs/asset-manifest.json`. The source of truth is
  `src/engine/assets/catalog.ts` plus `library.ts`.
- **Unit tests check every entry:** the file exists and is a real GLB, it has a licence and source URL,
  its size is plausible, and it has a thumbnail.

## Model pipeline

1. **Download** the 1k glTF from the Poly Haven API with a unique user-agent, as the API ToS requires.
   The licence and API terms were verified on 2026-10-14 (RESEARCH.md Phase 3).
2. **Split multi-variant packs.** Some Poly Haven files lay out 4–6 variants side by side (calathea,
   anthurium, money tree, fern). One variant is kept and moved to the origin
   (`extract.mjs`: keep the named root nodes, prune).
3. **Optimise:** `gltf-transform optimize --compress meshopt --texture-compress webp --texture-size 1024`.
   This runs from an isolated scratch install; the CLI is not a project dependency (SECURITY.md).
4. **Measure** bounds in metres (Poly Haven models are real-scale), triangles and texture megapixels
   from the optimised file. The catalogue footprint is the measured bound.
5. **Classify:** category, mounting (floor, wall with a mounting height, or ceiling), a usable top
   height for tables/consoles/counters, and whether small items stand on surfaces.
6. **Capture a thumbnail** with the editor's own renderer (`scripts/capture-thumbnails.mjs`).
7. **Inspect:** every thumbnail was checked on a contact sheet for orientation and scale, and
   representative items were placed in a real house and viewed in walk and fly modes.

**Issues found by inspection and fixed:**
- **Multi-variant packs merged into one 2–7 m wide mesh** (the optimiser joins meshes): split first.
- **Picture-frame glass rendered black over the artwork.** A glass material with no factors defaults to
  glTF metalness 1. Materials named *glass* now load as thin, clear, non-metallic panes.
- **Ceiling-fitting thumbnails were out of frame:** the studio now hangs them from a ceiling of their
  own height.
- **Decor on older tables fell to the floor:** usable top heights were added to the earlier catalogue
  entries.

**Excluded after review:**
- the CRT television: wrong for contemporary homes;
- `WoodenChair_01` (2.27 m tall) and `wooden_stool_02` (an 18 cm toy stool): implausible as
  furniture;
- `tea_set_01`: a spread-out set of tableware;
- `decorative_book_set_01`: published only as FBX/Blend.

**Honest limitations of the third-party library:**
- **Style.** Poly Haven's furniture is photo-scanned and real-scale, but much of it is vintage,
  rustic or traditional (carved settee, Ming chair, gothic bed, painted farmhouse pieces).
  Contemporary sofas, beds, wardrobes, kitchens and sanitaryware with redistributable licences were
  not found (RESEARCH.md Phase 3). Those are the parametric pieces, rebuilt to a higher standard in
  P3-M3.
- **Plants in the Outdoor category are planted, not potted:** calathea, anthurium, money tree, fern
  and hedge are for gardens and courtyards. Indoor potted plants are listed under Plants.
- **Triangle counts vary:** the leafy plant in a bowl has 154k triangles, the most in the library.
  Each is loaded only when used.

## Model register

Footprints are width × depth × height in metres. Variants is the number of finish options.
Textures are megapixels after optimisation. Size is the GLB file in kB.

| id | Name | Category | Licence | Attribution | Source | Footprint | Mount | Variants | Tris | Tex MP | kB |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `sofa-arlo` | Arlo three-seater sofa | seating | project | Parametric model by this project (code) | parametric (code) | 2.3 × 0.98 × 0.78 | floor | 5 | — | — | — |
| `sofa-curve-velvet` | Curve velvet sofa | seating | CC-BY-4.0 | “Glam Velvet Sofa” © 2021 Wayfair LLC, model by Eric Chadwick (Khronos glTF Sample Assets) | [glam_velvet_sofa](https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/GlamVelvetSofa) | 2.19 × 1.02 × 0.79 | floor | — | 3848 | 2.1 | 415 |
| `chair-lounge` | Mid-century lounge chair | seating | CC0-1.0 | Poly Haven — Kuutti Siitonen | [mid_century_lounge_chair](https://polyhaven.com/a/mid_century_lounge_chair) | 1.01 × 1.19 × 1.17 | floor | — | 5800 | 3.1 | 285 |
| `chair-arm` | Leather armchair | seating | CC0-1.0 | Poly Haven — Vibrant Nordic | [modern_arm_chair_01](https://polyhaven.com/a/modern_arm_chair_01) | 0.82 × 0.99 × 1.02 | floor | — | 7029 | 6.3 | 307 |
| `chair-dining` | Upholstered dining chair | seating | CC0-1.0 | Poly Haven — James Ray Cock | [dining_chair_02](https://polyhaven.com/a/dining_chair_02) | 0.43 × 0.58 × 0.97 | floor | — | 17011 | 3.1 | 258 |
| `table-coffee-slab` | Slab coffee table | tables | CC0-1.0 | Poly Haven — Amin | [modern_coffee_table_01](https://polyhaven.com/a/modern_coffee_table_01) | 1.2 × 0.6 × 0.39 | floor | — | 3832 | 3.1 | 164 |
| `table-coffee-round` | Ribbon round coffee table | tables | CC0-1.0 | Poly Haven — Ulan Cabanilla | [coffee_table_round_01](https://polyhaven.com/a/coffee_table_round_01) | 1.3 × 1.3 × 0.49 | floor | — | 3732 | 3.1 | 187 |
| `table-dining-round` | Round pedestal dining table | tables | CC0-1.0 | Poly Haven — Ulan Cabanilla | [round_wooden_table_01](https://polyhaven.com/a/round_wooden_table_01) | 1.06 × 1.06 × 0.76 | floor | — | 7800 | 3.1 | 173 |
| `table-side` | Oak side table | tables | CC0-1.0 | Poly Haven — James Ray Cock | [side_table_01](https://polyhaven.com/a/side_table_01) | 0.55 × 0.45 × 0.55 | floor | — | 2542 | 3.1 | 184 |
| `bench-wood` | Low wooden bench | tables | CC0-1.0 | Poly Haven — Ulan Cabanilla | [small_wooden_table_01](https://polyhaven.com/a/small_wooden_table_01) | 0.92 × 0.44 × 0.53 | floor | — | 2564 | 3.1 | 135 |
| `desk` | Desk with drawer pedestal | tables | project | Parametric model by this project (code) | parametric (code) | 1.4 × 0.7 × 0.75 | floor | 3 | — | — | — |
| `table-dining-rect` | Dining table, 1.8 m (seats 6) | tables | project | Parametric model by this project (code) | parametric (code) | 1.8 × 0.9 × 0.76 | floor | 3 | — | — | — |
| `table-dining-rect-small` | Dining table, 1.4 m (seats 4) | tables | project | Parametric model by this project (code) | parametric (code) | 1.4 × 0.8 × 0.76 | floor | 3 | — | — | — |
| `cabinet-media` | Slatted media console | storage | CC0-1.0 | Poly Haven — Patrik Pangerl | [modern_wooden_cabinet](https://polyhaven.com/a/modern_wooden_cabinet) | 2.44 × 0.52 × 0.68 | floor | — | 19869 | 3.1 | 415 |
| `shelves-cube` | Cube display shelving | storage | CC0-1.0 | Poly Haven — James Ray Cock | [wooden_display_shelves_01](https://polyhaven.com/a/wooden_display_shelves_01) | 1.08 × 0.37 × 1.56 | floor | — | 2854 | 3.1 | 165 |
| `cabinet-drawers` | Steel-frame drawer unit | storage | CC0-1.0 | Poly Haven — Ulan Cabanilla | [drawer_cabinet](https://polyhaven.com/a/drawer_cabinet) | 1.14 × 0.49 × 1.88 | floor | — | 13543 | 3.1 | 241 |
| `wardrobe` | Wardrobe, two doors | storage | project | Parametric model by this project (code) | parametric (code) | 1.2 × 0.6 × 2.2 | floor | 5 | — | — | — |
| `wardrobe-3door` | Wardrobe, three doors | storage | project | Parametric model by this project (code) | parametric (code) | 1.8 × 0.6 × 2.2 | floor | 5 | — | — | — |
| `bed-double` | Upholstered double bed (1.5 m) | beds | project | Parametric model by this project (code) | parametric (code) | 1.6 × 2.13 × 1.03 | floor | 4 | — | — | — |
| `bed-king` | Upholstered king bed (1.8 m) | beds | project | Parametric model by this project (code) | parametric (code) | 1.9 × 2.13 × 1.03 | floor | 4 | — | — | — |
| `bed-single` | Upholstered single bed (0.9 m) | beds | project | Parametric model by this project (code) | parametric (code) | 1 × 2.13 × 1.03 | floor | 4 | — | — | — |
| `kitchen-run` | Kitchen run, 3 m (sink, hob, oven) | kitchen | project | Parametric model by this project (code) | parametric (code) | 3 × 0.62 × 0.95 | wall | 5 | — | — | — |
| `kitchen-run-short` | Kitchen run, 2.4 m | kitchen | project | Parametric model by this project (code) | parametric (code) | 2.4 × 0.62 × 0.95 | wall | 5 | — | — | — |
| `kitchen-wall-units` | Wall cabinets, 2.4 m | kitchen | project | Parametric model by this project (code) | parametric (code) | 2.4 × 0.35 × 0.72 | wall | 5 | — | — | — |
| `kitchen-tall-fridge` | Tall fridge-freezer housing | kitchen | project | Parametric model by this project (code) | parametric (code) | 0.6 × 0.62 × 2.2 | wall | 5 | — | — | — |
| `fridge-steel` | Stainless fridge-freezer | kitchen | project | Parametric model by this project (code) | parametric (code) | 0.7 × 0.7 × 1.85 | floor | — | — | — | — |
| `cooker-hood` | Chimney cooker hood | kitchen | project | Parametric model by this project (code) | parametric (code) | 0.6 × 0.5 × 1.1 | wall | — | — | — | — |
| `kitchen-island` | Kitchen island with seating overhang | kitchen | project | Parametric model by this project (code) | parametric (code) | 1.8 × 0.9 × 0.92 | floor | 5 | — | — | — |
| `bath` | Freestanding bath | bathroom | project | Parametric model by this project (code) | parametric (code) | 1.7 × 0.78 × 0.6 | floor | — | — | — | — |
| `shower` | Walk-in shower, 1.2 × 0.9 m | bathroom | project | Parametric model by this project (code) | parametric (code) | 1.2 × 0.9 × 2.1 | wall | — | — | — | — |
| `vanity` | Wall-hung vanity with vessel basin | bathroom | project | Parametric model by this project (code) | parametric (code) | 0.9 × 0.5 × 0.86 | wall | 4 | — | — | — |
| `mirror-rect` | Rectangular bathroom mirror | bathroom | project | Parametric model by this project (code) | parametric (code) | 0.7 × 0.03 × 0.9 | wall | — | — | — | — |
| `wc` | Wall-hung WC | bathroom | project | Parametric model by this project (code) | parametric (code) | 0.38 × 0.55 × 0.8 | wall | — | — | — | — |
| `plant-large` | Large potted plant | plants | CC0-1.0 | Poly Haven — Rico Cilliers | [potted_plant_02](https://polyhaven.com/a/potted_plant_02) | 0.7 × 0.66 × 0.84 | floor | — | 69345 | 6.3 | 867 |
| `plant-small` | Potted succulent | plants | CC0-1.0 | Poly Haven — James Ray Cock | [potted_plant_04](https://polyhaven.com/a/potted_plant_04) | 0.17 × 0.18 × 0.27 | floor | — | 8697 | 3.1 | 389 |
| `rug-wool` | Wool rug, 2.4 × 1.7 m | rugs | project | Parametric model by this project (code) | parametric (code) | 2.4 × 1.7 × 0.016 | floor | 4 | — | — | — |
| `sofa-carved-loveseat` | Carved upholstered sofa | seating | CC0-1.0 | Poly Haven — Fran Calvente | [sofa_03](https://polyhaven.com/a/sofa_03) | 2.73 × 0.93 × 1.12 | floor | — | 7749 | 3.1 | 289 |
| `sofa-settee` | Classic two-seater settee | seating | CC0-1.0 | Poly Haven — Kirill Sannikov | [Sofa_01](https://polyhaven.com/a/Sofa_01) | 1.57 × 0.66 × 0.8 | floor | — | 4009 | 3.1 | 201 |
| `chair-bergere` | Bergère armchair | seating | CC0-1.0 | Poly Haven — Kirill Sannikov | [ArmChair_01](https://polyhaven.com/a/ArmChair_01) | 0.85 × 0.77 × 1.06 | floor | — | 5616 | 3.1 | 415 |
| `chair-green-arm` | Green velvet armchair | seating | CC0-1.0 | Poly Haven — Kirill Sannikov | [GreenChair_01](https://polyhaven.com/a/GreenChair_01) | 0.67 × 0.66 × 1.06 | floor | — | 3989 | 3.1 | 273 |
| `ottoman-leather` | Leather ottoman | seating | CC0-1.0 | Poly Haven — Caspian Fortune | [Ottoman_01](https://polyhaven.com/a/Ottoman_01) | 0.89 × 0.62 × 0.62 | floor | — | 4010 | 3.1 | 310 |
| `stool-bar-round` | Round wooden bar stool | seating | CC0-1.0 | Poly Haven — Dairon Sanchez | [bar_chair_round_01](https://polyhaven.com/a/bar_chair_round_01) | 0.48 × 0.49 × 0.75 | floor | — | 14373 | 3.1 | 533 |
| `chair-painted-white` | Painted wooden chair | seating | CC0-1.0 | Poly Haven — Kuutti Siitonen | [painted_wooden_chair_01](https://polyhaven.com/a/painted_wooden_chair_01) | 0.43 × 0.54 × 0.96 | floor | — | 672 | 3.1 | 196 |
| `chair-rocking` | Wooden rocking chair | seating | CC0-1.0 | Poly Haven — Jorge Camacho | [Rockingchair_01](https://polyhaven.com/a/Rockingchair_01) | 0.71 × 0.83 × 0.99 | floor | — | 11014 | 3.1 | 278 |
| `chair-ming` | Ming-style armchair | seating | CC0-1.0 | Poly Haven — Kirill Sannikov | [chinese_armchair](https://polyhaven.com/a/chinese_armchair) | 0.85 × 0.79 × 1.59 | floor | — | 2623 | 3.1 | 202 |
| `bench-settle` | Painted settle bench | seating | CC0-1.0 | Poly Haven — Kirill Sannikov | [painted_wooden_bench](https://polyhaven.com/a/painted_wooden_bench) | 1.17 × 0.5 × 0.89 | floor | — | 624 | 3.1 | 252 |
| `table-coffee-turquoise` | Painted coffee table with drawer | tables | CC0-1.0 | Poly Haven — Fernando Quinn | [CoffeeTable_01](https://polyhaven.com/a/CoffeeTable_01) | 1.54 × 0.97 × 0.52 | floor | — | 9875 | 3.1 | 355 |
| `table-coffee-industrial` | Industrial square coffee table | tables | CC0-1.0 | Poly Haven — Ulan Cabanilla | [industrial_coffee_table](https://polyhaven.com/a/industrial_coffee_table) | 0.78 × 0.76 × 0.64 | floor | — | 32402 | 3.1 | 480 |
| `table-coffee-lattice` | Lattice coffee table | tables | CC0-1.0 | Poly Haven — Amin | [modern_coffee_table_02](https://polyhaven.com/a/modern_coffee_table_02) | 1.2 × 1.2 × 0.37 | floor | — | 12749 | 6.3 | 466 |
| `table-round-bistro` | Round bistro table | tables | CC0-1.0 | Poly Haven — Ulan Cabanilla | [round_wooden_table_02](https://polyhaven.com/a/round_wooden_table_02) | 0.8 × 0.8 × 0.75 | floor | — | 3662 | 3.1 | 224 |
| `table-trestle-low` | Low trestle table | tables | CC0-1.0 | Poly Haven — Ethan Place | [WoodenTable_01](https://polyhaven.com/a/WoodenTable_01) | 1.8 × 0.66 × 0.55 | floor | — | 950 | 3.1 | 226 |
| `table-drum-side` | Drum side table | tables | CC0-1.0 | Poly Haven — Fran Calvente | [WoodenTable_02](https://polyhaven.com/a/WoodenTable_02) | 0.3 × 0.3 × 0.42 | floor | — | 1512 | 3.1 | 226 |
| `table-writing` | Oak writing table | tables | CC0-1.0 | Poly Haven — Serhii Khromov | [wooden_table_02](https://polyhaven.com/a/wooden_table_02) | 1.13 × 0.71 × 0.8 | floor | — | 196 | 3.1 | 204 |
| `table-side-tall` | Tall round side table | tables | CC0-1.0 | Poly Haven — James Ray Cock | [side_table_tall_01](https://polyhaven.com/a/side_table_tall_01) | 0.38 × 0.38 × 0.76 | floor | — | 5538 | 3.1 | 159 |
| `nightstand-classic` | Classic nightstand | tables | CC0-1.0 | Poly Haven — Kirill Sannikov | [ClassicNightstand_01](https://polyhaven.com/a/ClassicNightstand_01) | 0.57 × 0.42 × 0.7 | floor | — | 1993 | 3.1 | 158 |
| `nightstand-painted` | Painted nightstand | tables | CC0-1.0 | Poly Haven — Kirill Sannikov | [painted_wooden_nightstand](https://polyhaven.com/a/painted_wooden_nightstand) | 0.51 × 0.51 × 0.62 | floor | — | 468 | 3.1 | 267 |
| `desk-student` | Student desk | tables | CC0-1.0 | Poly Haven — Ethan Place | [SchoolDesk_01](https://polyhaven.com/a/SchoolDesk_01) | 0.71 × 0.55 × 0.88 | floor | — | 3870 | 3.1 | 128 |
| `console-carved` | Carved console table | storage | CC0-1.0 | Poly Haven — Kirill Sannikov | [ClassicConsole_01](https://polyhaven.com/a/ClassicConsole_01) | 1.54 × 0.59 × 0.95 | floor | — | 7519 | 3.1 | 333 |
| `cabinet-hutch` | Glazed hutch cabinet | storage | CC0-1.0 | Poly Haven — Rico Cilliers | [vintage_cabinet_01](https://polyhaven.com/a/vintage_cabinet_01) | 2.02 × 0.67 × 2.23 | floor | — | 35536 | 7.3 | 582 |
| `cabinet-painted` | Painted sideboard | storage | CC0-1.0 | Poly Haven — Kirill Sannikov | [painted_wooden_cabinet](https://polyhaven.com/a/painted_wooden_cabinet) | 1.2 × 0.62 × 1.18 | floor | — | 2137 | 3.1 | 225 |
| `shelves-steel` | Steel and wood shelving unit | storage | CC0-1.0 | Poly Haven — Ulan Cabanilla | [steel_frame_shelves_03](https://polyhaven.com/a/steel_frame_shelves_03) | 2.35 × 0.72 × 2.31 | floor | — | 6367 | 6.3 | 385 |
| `bookcase-worn` | Weathered bookcase | storage | CC0-1.0 | Poly Haven — Ulan Cabanilla | [wooden_bookshelf_worn](https://polyhaven.com/a/wooden_bookshelf_worn) | 1.37 × 0.58 × 2.06 | floor | — | 6203 | 3.1 | 551 |
| `shelves-white` | White open shelving | storage | CC0-1.0 | Poly Haven — Gabriel Radić | [Shelf_01](https://polyhaven.com/a/Shelf_01) | 1 × 0.26 × 2.08 | floor | — | 182 | 3.1 | 316 |
| `chest-apothecary` | Apothecary chest of drawers | storage | CC0-1.0 | Poly Haven — James Ray Cock | [vintage_wooden_drawer_01](https://polyhaven.com/a/vintage_wooden_drawer_01) | 1.72 × 1.01 × 1.09 | floor | — | 4947 | 3.1 | 292 |
| `bed-carved` | Carved wooden double bed | beds | CC0-1.0 | Poly Haven — Kirill Sannikov | [GothicBed_01](https://polyhaven.com/a/GothicBed_01) | 1.49 × 2.04 × 1.53 | floor | — | 18116 | 3.1 | 392 |
| `cooker-freestanding` | Freestanding electric cooker | kitchen | CC0-1.0 | Poly Haven — Kuutti Siitonen | [electric_stove](https://polyhaven.com/a/electric_stove) | 0.5 × 0.65 × 0.86 | floor | — | 12532 | 3.1 | 278 |
| `lamp-desk-arm` | Swing-arm desk lamp | lighting | CC0-1.0 | Poly Haven — Yann Kervran, Kuutti Siitonen | [desk_lamp_arm_01](https://polyhaven.com/a/desk_lamp_arm_01) | 0.2 × 0.61 × 0.89 | on surfaces | — | 19630 | 3.1 | 490 |
| `lamp-pendant-dome` | Dome pendant light | lighting | CC0-1.0 | Poly Haven — James Ray Cock | [modern_ceiling_lamp_01](https://polyhaven.com/a/modern_ceiling_lamp_01) | 0.43 × 0.43 × 0.95 | ceiling | — | 5456 | 3.1 | 153 |
| `lamp-pendant-industrial` | Industrial pendant light | lighting | CC0-1.0 | Poly Haven — Kuutti Siitonen | [hanging_industrial_lamp](https://polyhaven.com/a/hanging_industrial_lamp) | 0.55 × 0.55 × 1.35 | ceiling | — | 9312 | 5.2 | 491 |
| `lamp-chandelier` | Brass chandelier | lighting | CC0-1.0 | Poly Haven — Kirill Sannikov | [Chandelier_02](https://polyhaven.com/a/Chandelier_02) | 0.68 × 0.62 × 0.85 | ceiling | — | 20703 | 3.1 | 444 |
| `fan-ceiling` | Ceiling fan with light | lighting | CC0-1.0 | Poly Haven — Ulan Cabanilla | [ceiling_fan](https://polyhaven.com/a/ceiling_fan) | 1.46 × 1.46 × 0.52 | ceiling | — | 11457 | 5.2 | 237 |
| `lamp-wall-bulkhead` | Bulkhead wall light | lighting | CC0-1.0 | Poly Haven — Kuutti Siitonen | [industrial_wall_lamp](https://polyhaven.com/a/industrial_wall_lamp) | 0.27 × 0.14 × 0.43 | wall | — | 4388 | 7.3 | 437 |
| `lamp-diya` | Brass diya lantern | lighting | CC0-1.0 | Poly Haven — Bhargav Kubal | [brass_diya_lantern](https://polyhaven.com/a/brass_diya_lantern) | 0.12 × 0.12 × 0.38 | on surfaces | — | 12446 | 3.1 | 287 |
| `mirror-ornate` | Gilded wall mirror | decor | CC0-1.0 | Poly Haven — James Ray Cock | [ornate_mirror_01](https://polyhaven.com/a/ornate_mirror_01) | 0.49 × 0.03 × 0.74 | wall | — | 10621 | 3.1 | 207 |
| `art-print-poster` | Framed print, white frame | decor | CC0-1.0 | Poly Haven — James Ray Cock | [hanging_picture_frame_01](https://polyhaven.com/a/hanging_picture_frame_01) | 0.59 × 0.02 × 0.84 | wall | — | 2193 | 5.2 | 102 |
| `art-photo-landscape` | Framed photograph, landscape | decor | CC0-1.0 | Poly Haven — James Ray Cock | [hanging_picture_frame_02](https://polyhaven.com/a/hanging_picture_frame_02) | 0.75 × 0.03 × 0.5 | wall | — | 2525 | 6.3 | 200 |
| `frame-standing` | Standing photo frame | decor | CC0-1.0 | Poly Haven — James Ray Cock | [standing_picture_frame_01](https://polyhaven.com/a/standing_picture_frame_01) | 0.1 × 0.2 × 0.25 | on surfaces | — | 1574 | 4.2 | 139 |
| `vase-brass-tall` | Tall brass vase | decor | CC0-1.0 | Poly Haven — Rico Cilliers | [brass_vase_01](https://polyhaven.com/a/brass_vase_01) | 0.23 × 0.23 × 0.69 | on surfaces | — | 16325 | 3.1 | 216 |
| `vase-white` | White ceramic vase | decor | CC0-1.0 | Poly Haven — James Ray Cock | [ceramic_vase_01](https://polyhaven.com/a/ceramic_vase_01) | 0.2 × 0.2 × 0.4 | on surfaces | — | 9784 | 3.1 | 99 |
| `vase-round-glazed` | Round glazed vase | decor | CC0-1.0 | Poly Haven — Rico Cilliers | [ceramic_vase_02](https://polyhaven.com/a/ceramic_vase_02) | 0.22 × 0.22 × 0.31 | on surfaces | — | 10678 | 3.1 | 281 |
| `vase-bottle` | Bottle vase | decor | CC0-1.0 | Poly Haven — Rico Cilliers | [ceramic_vase_04](https://polyhaven.com/a/ceramic_vase_04) | 0.18 × 0.18 × 0.34 | on surfaces | — | 8896 | 3.1 | 193 |
| `vase-blue-white` | Blue-and-white porcelain jar | decor | CC0-1.0 | Poly Haven — James Ray Cock | [antique_ceramic_vase_01](https://polyhaven.com/a/antique_ceramic_vase_01) | 0.26 × 0.26 × 0.44 | on surfaces | — | 8924 | 3.1 | 172 |
| `basket-wicker` | Wicker storage basket | decor | CC0-1.0 | Poly Haven — Kuutti Siitonen | [wicker_basket_01](https://polyhaven.com/a/wicker_basket_01) | 0.38 × 0.29 × 0.12 | on surfaces | — | 21674 | 3.1 | 462 |
| `cushions-pair` | Pair of patterned cushions | decor | CC0-1.0 | Poly Haven — Serhii Khromov | [throw_pillows_01](https://polyhaven.com/a/throw_pillows_01) | 0.94 × 0.45 × 0.45 | on surfaces | — | 6356 | 3.1 | 864 |
| `clock-mantel` | Mantel clock | decor | CC0-1.0 | Poly Haven — Yann Kervran, Rico Cilliers | [mantel_clock_01](https://polyhaven.com/a/mantel_clock_01) | 0.34 × 0.13 × 0.16 | on surfaces | — | 15452 | 3.1 | 318 |
| `plant-bonsai-bowl` | Leafy plant in terracotta bowl | plants | CC0-1.0 | Poly Haven — Rico Cilliers | [potted_plant_01](https://polyhaven.com/a/potted_plant_01) | 0.59 × 0.63 × 1.34 | floor | — | 153761 | 6.3 | 1588 |
| `planter-crate` | Wooden crate planter | plants | CC0-1.0 | Poly Haven — James Ray Cock | [planter_box_01](https://polyhaven.com/a/planter_box_01) | 0.91 × 0.41 × 0.42 | floor | — | 6898 | 3.1 | 341 |
| `garden-calathea` | Calathea (planted) | outdoor | CC0-1.0 | Poly Haven — Rob Tuytel, Rico Cilliers | [calathea_orbifolia_01](https://polyhaven.com/a/calathea_orbifolia_01) | 0.35 × 0.44 × 0.3 | floor | — | 3374 | 3.1 | 174 |
| `garden-anthurium` | Anthurium clump (planted) | outdoor | CC0-1.0 | Poly Haven — Rob Tuytel, Rico Cilliers | [anthurium_botany_01](https://polyhaven.com/a/anthurium_botany_01) | 0.76 × 0.57 × 0.47 | floor | — | 14394 | 3.1 | 251 |
| `garden-pachira` | Money tree sapling (planted) | outdoor | CC0-1.0 | Poly Haven — Rob Tuytel, Rico Cilliers | [pachira_aquatica_01](https://polyhaven.com/a/pachira_aquatica_01) | 0.5 × 0.61 × 0.73 | floor | — | 4959 | 6.3 | 440 |
| `garden-fern` | Fern (planted) | outdoor | CC0-1.0 | Poly Haven — Rob Tuytel, Rico Cilliers | [fern_02](https://polyhaven.com/a/fern_02) | 0.99 × 0.89 × 0.43 | floor | — | 2384 | 3.1 | 146 |
| `garden-hedge` | Low hedge, 2.6 m | outdoor | CC0-1.0 | Poly Haven — Rico Cilliers | [shrub_01](https://polyhaven.com/a/shrub_01) | 2.59 × 0.22 × 0.4 | floor | — | 76108 | 3.1 | 814 |
| `outdoor-bistro-set` | Folding bistro table with two chairs | outdoor | CC0-1.0 | Poly Haven — James Ray Cock | [outdoor_table_chair_set_01](https://polyhaven.com/a/outdoor_table_chair_set_01) | 0.74 × 1.72 × 0.86 | floor | — | 9600 | 6.3 | 402 |
| `outdoor-picnic-table` | Picnic table with benches | outdoor | CC0-1.0 | Poly Haven — Ulan Cabanilla | [wooden_picnic_table](https://polyhaven.com/a/wooden_picnic_table) | 2.24 × 3.02 × 0.75 | floor | — | 7991 | 6.3 | 480 |

## Environment and site (Phase 2 M2)

| File | Source | Author | Licence | Processing | Size |
|---|---|---|---|---|---|
| `env/meadow_2_ibl_1k.hdr` | [Poly Haven — Meadow 2](https://polyhaven.com/a/meadow_2), 1k HDR | Sergej Majboroda | CC0 | Sun disc clamped to the surrounding sky (luminance ≤ 8; 72% of the energy removed and replaced by the shadow-casting sun light); re-encoded as RLE RGBE | 1.5 MB |
| `env/meadow_2_bg_2k.jpg`, `env/meadow_2_bg_4k.jpg` | Same, 4k HDR | Sergej Majboroda | CC0 | Tone-mapped with the Khronos PBR Neutral curve (the renderer's own tone mapper) to sRGB JPEG, 2048×1024 (Performance, Balanced) and 4096×2048 (Quality) | 0.35 / 1.45 MB |
| `textures/grass_ground/` | [Poly Haven — Grass Ground](https://polyhaven.com/a/grass_ground), 1k | Charlotte Baglioni | CC0 | Colour/roughness WebP; normal map downscaled to 512 px (seen from metres away) | 0.25 MB |
| `textures/rectangular_paving/` | [Poly Haven — Rectangular Paving](https://polyhaven.com/a/rectangular_paving), 1k | Dimitrios Savva | CC0 | WebP | 0.17 MB |
| `textures/gravel_floor_03/` | [Poly Haven — Gravel Floor 03](https://polyhaven.com/a/gravel_floor_03), 1k | Charlotte Baglioni | CC0 | WebP; normal 512 px | 0.38 MB |
| `textures/plastered_wall_04/` (also used for ceilings) | [Poly Haven — Plastered Wall 04](https://polyhaven.com/a/plastered_wall_04) | Rob Tuytel | CC0 | WebP (building-editor milestone) | — |

The sun direction in `src/editor/scene/sky.ts` was measured from the HDRI: the brightest pixel is at
u = 0.600, v = 0.350, so the sun is at azimuth 36° and elevation 27°. Shadows on the lawn therefore
fall away from the sun visible in the sky.

Earlier milestones' textures and the `small_empty_room_1` HDRI (Phase 1 garden room) are Poly Haven
CC0; see `docs/GARDEN_ROOM.md` for that table.

## Textures added in Phase 3 M3 (all CC0, Poly Haven, 1k → WebP)

| Texture | Used for | Notes |
|---|---|---|
| `laminate_floor_02`, `rectangular_parquet`, `terrazzo_tiles`, `terracotta_floor_tiles`, `floor_tiles_06`, `granite_tile_03`, `brushed_concrete_2`, `marble_mosaic_tiles`, `wood_floor_deck`, `patio_tiles`, `slate_floor_03` | Floor finishes (light oak, parquet, terrazzo, terracotta, checkerboard, granite, polished concrete, pebble mosaic, teak deck, patio, crazy paving) | Tile sizes from Poly Haven's physical dimensions |
| `rounded_square_tiled_wall`, `white_planks_clean`, `whitewashed_brick`, `stone_tile_wall` | Wall finishes and facades | |
| `white_oak_veneer`, `walnut_veneer`, `teak_veneer`, `washed_grey_oak_veneer`, `kitchen_wood` | Cabinetry, furniture, worktops | |
| `leather_white`, `velour_velvet` | Upholstery | Colour maps normalised to neutral grey so tints reproduce the swatch exactly |
| `leafy_grass` | Second grass layer in the lawn's anti-tiling blend | Normal map downscaled to 512 px |

**Rejected:** `painted_concrete` (green and patchy). `marble_01` is kept for the limestone floor
only: it is a tiled floor, so it showed a grid on worktops. Worktops use a quartz surface instead
(the fine-grain concrete set, tinted, without its colour map).
