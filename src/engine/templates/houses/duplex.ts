import type { HouseSpec } from '../spec'

/**
 * Two-storey duplex house (9.6 × 11 m footprint, ~165 m² over two floors, plus a garden terrace and a
 * first-floor balcony). A stair hall runs the depth of the west side, with a straight timber flight
 * along its outer wall lit by a stair window.
 * - Ground floor (day): living room opening onto the garden terrace, a kitchen-diner, a family room,
 *   and a guest bedroom with its own bath.
 * - First floor (night): the master suite with en-suite, two more bedrooms (one with a balcony) and a
 *   family bathroom, off a landing and an upper hall.
 */
export const DUPLEX: HouseSpec = {
  name: 'Contemporary duplex',
  facade: 'white-stucco',
  rooms: [
    { name: 'Living room', type: 'living', rect: [0, 0, 5.6, 5.0], floor: 'oak-parquet', walls: 'warm-greige' },
    { name: 'Kitchen & dining', type: 'kitchen', rect: [5.6, 0, 9.6, 5.0], floor: 'polished-concrete' },
    { name: 'Stair hall', type: 'hall', rect: [0, 5.0, 2.4, 11.0], floor: 'terrazzo' },
    { name: 'Store', type: 'storage', rect: [2.4, 5.0, 5.6, 7.0], floor: 'polished-concrete' },
    { name: 'Family room', type: 'living', rect: [2.4, 7.0, 5.6, 11.0], floor: 'light-oak-plank', walls: 'sage-limewash' },
    { name: 'Guest bedroom', type: 'bedroom', rect: [5.6, 5.0, 9.6, 8.6], floor: 'light-oak-plank', walls: 'clay-plaster' },
    { name: 'Guest bath', type: 'bathroom', rect: [5.6, 8.6, 9.6, 11.0], floor: 'checker-tile', walls: 'white-wall-tile' },
    { name: 'Garden terrace', type: 'terrace', rect: [0, -2.6, 9.6, 0], floor: 'patio-tile' },
  ],
  openings: [
    ['door', 1.75, 11.0, { w: 1.0, h: 2.15 }], // front door (south)
    ['passage', 1.75, 5.0, { w: 1.0, h: 2.2 }], // stair hall → living
    ['door', 2.4, 6.0, { w: 0.8 }], // → store
    ['passage', 2.4, 9.0, { w: 1.4, h: 2.2 }], // stair hall → family room
    ['passage', 5.6, 2.5, { w: 2.2, h: 2.3 }], // living → kitchen
    ['door', 5.6, 7.8, { w: 0.8 }], // family room → guest bedroom
    ['door', 5.6, 9.8, { w: 0.8 }], // family room → guest bath
    ['door', 2.8, 0, { w: 2.4, h: 2.2 }], // living → terrace (glazed)
    ['window', 0, 2.5, { w: 1.6, h: 1.6, sill: 0.6 }],
    ['window', 7.6, 0, { w: 2.0, h: 1.0, sill: 1.05 }],
    ['window', 9.6, 2.5, { w: 1.2, h: 1.2, sill: 1.0 }],
    ['window', 9.6, 6.8, { w: 1.4, h: 1.4, sill: 0.8 }],
    ['window', 7.6, 11.0, { w: 0.8, h: 0.7, sill: 1.4 }],
    ['window', 4.0, 11.0, { w: 1.8, h: 1.5, sill: 0.7 }],
    ['window', 0, 8.0, { w: 1.0, h: 1.4, sill: 1.0 }], // stair window
  ],
  stairs: [{ at: [0.66, 8.2], deg: 90, len: 4.25 }], // 17 × 25 cm goings, climbing north along the west wall to a 1 m landing
  items: [
    // living
    ['rug-wool', 2.8, 2.6, 0, 'stone'],
    ['sofa-arlo', 2.8, 3.9, 180, 'charcoal'],
    ['table-coffee-slab', 2.8, 2.7],
    ['chair-lounge', 0.9, 1.7, 60],
    ['chair-arm', 4.6, 1.6, -60],
    ['plant-large', 0.5, 4.5],
    ['art-photo-landscape', 0.2, 4.0],
    // kitchen & dining
    ['kitchen-run', 7.6, 0.4, 0, 'oak-quartz'],
    ['kitchen-tall-fridge', 9.15, 4.5, 180, 'oak-quartz'],
    ['table-dining-rect', 7.4, 3.0, 0, 'oak'],
    ['chair-dining', 6.95, 2.25],
    ['chair-dining', 7.85, 2.25],
    ['chair-dining', 6.95, 3.75, 180],
    ['chair-dining', 7.85, 3.75, 180],
    ['lamp-pendant-dome', 7.4, 3.0],
    // stair hall
    ['art-print-poster', 2.3, 7.6],
    // store
    ['shelves-white', 4.0, 5.3],
    // family room
    ['sofa-arlo', 3.75, 7.55, 0, 'sage'],
    ['cabinet-media', 3.75, 10.6, 180],
    ['table-coffee-round', 3.75, 8.7],
    // guest bedroom
    ['bed-double', 8.4, 6.8, -90, 'stone'],
    ['nightstand-painted', 9.2, 5.6, -90],
    ['wardrobe', 6.0, 6.3, 90, 'white'],
    // guest bath
    ['shower', 9.0, 9.2],
    ['vanity', 7.6, 10.6, 180, 'white'],
    ['wc', 6.2, 10.5, 180],
    // terrace
    ['outdoor-bistro-set', 6.8, -1.4, 90],
    ['planter-crate', 0.7, -2.0],
    ['garden-fern', 9.0, -2.0],
  ],
  upper: [
    {
      name: 'First floor',
      rooms: [
        { name: 'Master bedroom', type: 'bedroom', rect: [0, 0, 5.6, 5.0], floor: 'oak-parquet', walls: 'warm-greige' },
        { name: 'En-suite', type: 'bathroom', rect: [5.6, 0, 9.6, 2.4], floor: 'pebble-mosaic', walls: 'white-wall-tile' },
        { name: 'Bedroom 2', type: 'bedroom', rect: [5.6, 2.4, 9.6, 5.0], floor: 'light-oak-plank', walls: 'ink-blue' },
        { name: 'Landing', type: 'hall', rect: [0, 5.0, 2.4, 11.0], floor: 'terrazzo' },
        { name: 'Upper hall', type: 'hall', rect: [2.4, 5.0, 9.6, 6.4], floor: 'oak-parquet' },
        { name: 'Bedroom 3', type: 'bedroom', rect: [2.4, 6.4, 6.4, 11.0], floor: 'light-oak-plank', walls: 'sage-limewash' },
        { name: 'Family bath', type: 'bathroom', rect: [6.4, 6.4, 9.6, 8.6], floor: 'checker-tile', walls: 'white-wall-tile' },
        { name: 'Balcony', type: 'balcony', rect: [6.4, 8.6, 9.6, 11.0], floor: 'teak-deck' },
      ],
      openings: [
        ['passage', 2.4, 5.7, { w: 0.9, h: 2.2 }], // landing → upper hall
        ['door', 4.0, 5.0, { w: 0.9 }], // → master
        ['door', 6.6, 5.0, { w: 0.9 }], // → bedroom 2
        ['door', 4.4, 6.4, { w: 0.9 }], // → bedroom 3
        ['door', 8.0, 6.4, { w: 0.8 }], // → family bath
        ['door', 5.6, 1.2, { w: 0.8 }], // master → en-suite
        ['door', 6.4, 9.8, { w: 1.4, h: 2.2 }], // bedroom 3 → balcony (glazed)
        ['window', 2.8, 0, { w: 2.0, h: 1.5, sill: 0.7 }],
        ['window', 0, 2.5, { w: 1.2, h: 1.4, sill: 0.8 }],
        ['window', 7.6, 0, { w: 0.9, h: 0.7, sill: 1.4 }],
        ['window', 9.6, 3.7, { w: 1.2, h: 1.4, sill: 0.8 }],
        ['window', 9.6, 7.5, { w: 0.8, h: 0.7, sill: 1.4 }],
        ['window', 4.4, 11.0, { w: 1.8, h: 1.5, sill: 0.7 }],
        ['window', 0, 8.0, { w: 1.0, h: 1.4, sill: 0.9 }], // landing window over the stairwell
      ],
      items: [
        // master
        ['bed-king', 2.8, 1.25, 0, 'ivory'],
        ['nightstand-classic', 1.45, 0.45],
        ['nightstand-classic', 4.15, 0.45],
        ['wardrobe-3door', 1.2, 4.6, 180, 'oak'],
        ['chair-lounge', 4.7, 3.8, -150],
        // en-suite
        ['bath', 7.0, 0.55],
        ['vanity', 9.15, 1.2, -90, 'oak'],
        ['wc', 8.5, 2.0, 180],
        // bedroom 2
        ['bed-double', 8.4, 3.7, -90, 'clay'],
        ['wardrobe', 6.0, 3.7, 90, 'white'],
        // upper hall
        ['art-print-poster', 6.0, 6.3],
        // bedroom 3
        ['bed-double', 3.6, 9.8, 90, 'moss'],
        ['desk-student', 5.9, 7.2, -90],
        ['wardrobe', 3.2, 6.82, 0, 'sage'],
        // family bath
        ['shower', 9.0, 7.0],
        ['vanity', 7.2, 8.2, 180, 'white'],
        ['wc', 6.8, 7.0, 90],
        // balcony
        ['outdoor-bistro-set', 8.0, 10.0, 90],
        ['planter-crate', 9.05, 9.0],
      ],
    },
  ],
}
