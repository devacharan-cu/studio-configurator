# Asset register

Every file under `public/assets/` comes from a recorded source under a licence that allows bundling
it with the app. Nothing is loaded from a third-party host at runtime: assets are copied into the
repository and served from our own origin (an E2E test fails on any off-origin request).

Furniture models are registered per entry in `src/engine/assets/catalog.ts` (licence, attribution,
source URL). Environment and texture files are listed here.

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
