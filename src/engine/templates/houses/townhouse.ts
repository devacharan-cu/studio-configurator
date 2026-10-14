import type { HouseSpec } from '../spec'

/**
 * Three-level row house (townhouse) on a 6 m wide plot: 6 × 14 m, built between party walls, so
 * daylight comes from the street (south) and garden (north) ends only. A stair hall runs down the
 * west side of the middle of the plan. The two flights sit side by side, scissor-fashion: the first
 * climbs north to a landing; the second starts beside it and climbs south.
 * - Ground floor: front living room off the street, dining room, kitchen onto the garden, powder
 *   room and store.
 * - First floor: master bedroom over the street, bedroom over the garden, a bathroom off a short
 *   corridor.
 * - Roof level: a stair room and study between a roof garden and a street-side roof terrace.
 */
export const TOWNHOUSE: HouseSpec = {
  name: 'Row house with roof terrace',
  facade: 'facade-brick',
  rooms: [
    { name: 'Kitchen', type: 'kitchen', rect: [0, 0, 6.0, 4.4], floor: 'terracotta-tile', walls: 'chalk-white' },
    { name: 'Stair hall', type: 'hall', rect: [0, 4.4, 2.8, 10.0], floor: 'oak-parquet' },
    { name: 'Powder room', type: 'bathroom', rect: [2.8, 4.4, 4.3, 6.2], floor: 'checker-tile', walls: 'white-wall-tile' },
    { name: 'Store', type: 'storage', rect: [4.3, 4.4, 6.0, 6.2], floor: 'polished-concrete' },
    { name: 'Dining room', type: 'dining', rect: [2.8, 6.2, 6.0, 10.0], floor: 'oak-parquet', walls: 'warm-greige' },
    { name: 'Front room', type: 'living', rect: [0, 10.0, 6.0, 14.0], floor: 'oak-parquet', walls: 'sage-limewash' },
    { name: 'Garden', type: 'terrace', rect: [0, -3.0, 6.0, 0], floor: 'crazy-paving' },
  ],
  openings: [
    ['door', 4.6, 14.0, { w: 1.0, h: 2.15 }], // front door (street)
    ['passage', 1.6, 10.0, { w: 1.0, h: 2.2 }], // front room → stair hall
    ['passage', 4.3, 10.0, { w: 2.2, h: 2.3 }], // front room → dining
    ['passage', 2.8, 8.0, { w: 1.2, h: 2.2 }], // stair hall → dining
    ['passage', 1.9, 4.4, { w: 0.9, h: 2.2 }], // stair hall → kitchen
    ['door', 2.8, 5.3, { w: 0.7 }], // → powder room
    ['door', 5.15, 6.2, { w: 0.8 }], // dining → store
    ['door', 3.0, 0, { w: 2.4, h: 2.2 }], // kitchen → garden (glazed)
    ['window', 2.0, 14.0, { w: 2.0, h: 1.6, sill: 0.6 }],
  ],
  stairs: [{ at: [0.65, 7.2], deg: 90, len: 4.25 }], // up to the first floor, climbing north
  items: [
    // front room
    ['sofa-arlo', 0.63, 12.0, 90, 'oatmeal'],
    ['table-coffee-slab', 1.75, 12.0, 90],
    ['cabinet-media', 5.6, 12.0, -90],
    ['chair-arm', 2.6, 13.1, 160],
    ['rug-wool', 1.9, 12.0, 90, 'stone'],
    ['plant-large', 0.5, 13.5],
    ['art-photo-landscape', 0.15, 12.0],
    // dining
    ['table-dining-rect', 4.4, 8.1, 90],
    ['chair-dining', 3.95, 7.6, 90],
    ['chair-dining', 3.95, 8.6, 90],
    ['chair-dining', 4.85, 7.6, -90],
    ['chair-dining', 4.85, 8.6, -90],
    ['lamp-pendant-dome', 4.4, 8.1],
    // kitchen
    ['kitchen-run', 5.56, 2.3, -90, 'sage-quartz'],
    ['kitchen-tall-fridge', 5.56, 0.45, -90, 'sage-quartz'],
    ['table-dining-round', 2.2, 2.4],
    ['chair-dining', 2.2, 1.6],
    ['chair-dining', 2.2, 3.2, 180],
    // powder room
    ['wc', 3.5, 4.75],
    ['vanity', 3.9, 5.9, 180, 'white'],
    // store
    ['shelves-white', 5.15, 4.65],
    // garden
    ['outdoor-bistro-set', 1.6, -1.5, 90],
    ['planter-crate', 5.2, -2.4],
    ['garden-fern', 5.3, -0.7],
  ],
  upper: [
    {
      name: 'First floor',
      rooms: [
        { name: 'Bedroom 2', type: 'bedroom', rect: [0, 0, 6.0, 4.4], floor: 'light-oak-plank', walls: 'clay-plaster' },
        { name: 'Landing', type: 'hall', rect: [0, 4.4, 2.8, 10.0], floor: 'oak-parquet' },
        { name: 'Corridor', type: 'hall', rect: [2.8, 4.4, 3.9, 10.0], floor: 'oak-parquet' },
        { name: 'Bathroom', type: 'bathroom', rect: [3.9, 4.4, 6.0, 10.0], floor: 'pebble-mosaic', walls: 'white-wall-tile' },
        { name: 'Master bedroom', type: 'bedroom', rect: [0, 10.0, 6.0, 14.0], floor: 'oak-parquet', walls: 'warm-greige' },
      ],
      openings: [
        ['door', 1.9, 4.4, { w: 0.9 }], // landing → bedroom 2
        ['door', 2.8, 4.95, { w: 0.8 }], // landing → corridor
        ['door', 3.35, 10.0, { w: 0.8 }], // corridor → master
        ['door', 3.9, 7.2, { w: 0.8 }], // corridor → bathroom
        ['window', 3.0, 0, { w: 1.8, h: 1.5, sill: 0.8 }],
        ['window', 3.0, 14.0, { w: 2.4, h: 1.6, sill: 0.6 }],
      ],
      stairs: [{ at: [1.85, 7.2], deg: -90, len: 4.25 }], // up to the roof, starting beside the first flight and climbing south
      items: [
        // bedroom 2
        ['bed-double', 4.0, 1.2, 0, 'moss'],
        ['nightstand-painted', 2.85, 0.4],
        ['desk', 1.0, 0.48],
        ['wardrobe', 5.0, 4.04, 180, 'white'],
        // corridor
        ['art-print-poster', 3.85, 8.2],
        // bathroom
        ['bath', 5.48, 8.6, 90],
        ['vanity', 4.95, 4.71, 0, 'oak'],
        ['mirror-rect', 4.95, 4.47],
        ['wc', 5.6, 5.9, -90],
        // master
        ['bed-king', 3.0, 12.8, 180, 'ivory'],
        ['nightstand-classic', 1.75, 13.6],
        ['nightstand-classic', 4.25, 13.6],
        ['wardrobe-3door', 1.2, 10.36, 0, 'oak'],
        ['chair-lounge', 5.0, 11.1, -30],
      ],
    },
    {
      name: 'Roof',
      rooms: [
        { name: 'Roof garden', type: 'terrace', rect: [0, 0, 6.0, 4.4], floor: 'teak-deck' },
        { name: 'Stair room', type: 'hall', rect: [0, 4.4, 2.8, 10.0], floor: 'terrazzo' },
        { name: 'Study', type: 'study', rect: [2.8, 4.4, 6.0, 10.0], floor: 'light-oak-plank', walls: 'ink-blue' },
        { name: 'Roof terrace', type: 'terrace', rect: [0, 10.0, 6.0, 14.0], floor: 'patio-tile' },
      ],
      openings: [
        ['door', 0.9, 4.4, { w: 0.9 }], // stair room → roof garden
        ['door', 1.85, 10.0, { w: 0.9, swing: 'right' }], // stair room → roof terrace (opens outwards, clear of the stairwell)
        ['door', 2.8, 9.4, { w: 0.8, swing: 'right' }], // stair room → study (opens into the study)
        ['door', 4.4, 4.4, { w: 1.4, h: 2.2 }], // study → roof garden (glazed)
        ['window', 4.4, 10.0, { w: 1.6, h: 1.4, sill: 0.8 }],
      ],
      items: [
        // study
        ['desk', 4.4, 9.5, 180],
        ['chair-arm', 4.4, 8.45],
        ['shelves-cube', 5.65, 6.6, -90],
        ['plant-large', 3.3, 5.0],
        // roof garden
        ['outdoor-bistro-set', 2.0, 1.6, 90],
        ['planter-crate', 0.7, 0.6],
        ['planter-crate', 5.2, 0.6],
        ['garden-fern', 5.3, 2.4],
        // roof terrace
        ['outdoor-bistro-set', 4.2, 12.4, 90],
        ['planter-crate', 0.7, 13.3],
        ['garden-fern', 5.3, 13.3],
      ],
    },
  ],
}
