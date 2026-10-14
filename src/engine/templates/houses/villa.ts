import type { HouseSpec } from '../spec'

/**
 * Two-storey family villa (15 × 10.4 m, ~260 m² over two floors). A 5 m wide foyer runs through the
 * middle of the plan, and a broad flight rises in its centre from the front door. Upstairs it becomes
 * a gallery around the stairwell, with walkways on both sides, so every room on both floors opens
 * off the foyer or the gallery.
 * - Ground floor: living and dining rooms with a kitchen along the garden, a family room, a study, a
 *   utility room, and a guest suite.
 * - First floor: an upper lounge with a balcony, a master suite (dressing room, en-suite), three
 *   bedrooms and a family bathroom.
 */
export const VILLA: HouseSpec = {
  name: 'Two-storey family villa',
  facade: 'sandstone-render',
  rooms: [
    { name: 'Living room', type: 'living', rect: [0, 0, 5.0, 5.6], floor: 'oak-herringbone', walls: 'warm-greige' },
    { name: 'Dining room', type: 'dining', rect: [5.0, 0, 10.0, 4.4], floor: 'oak-herringbone', walls: 'chalk-white' },
    { name: 'Kitchen', type: 'kitchen', rect: [10.0, 0, 15.0, 4.4], floor: 'limestone' },
    { name: 'Foyer', type: 'hall', rect: [5.0, 4.4, 10.0, 10.4], floor: 'limestone' },
    {
      name: 'Guest bedroom',
      type: 'bedroom',
      points: [[0, 5.6], [5.0, 5.6], [5.0, 8.4], [2.6, 8.4], [2.6, 10.4], [0, 10.4]],
      floor: 'light-oak-plank',
      walls: 'sage-limewash',
    },
    { name: 'Guest bath', type: 'bathroom', rect: [2.6, 8.4, 5.0, 10.4], floor: 'checker-tile', walls: 'white-wall-tile' },
    { name: 'Family room', type: 'living', rect: [10.0, 4.4, 15.0, 7.6], floor: 'oak-parquet', walls: 'clay-plaster' },
    { name: 'Study', type: 'study', rect: [10.0, 7.6, 12.6, 10.4], floor: 'oak-parquet', walls: 'ink-blue' },
    { name: 'Utility', type: 'utility', rect: [12.6, 7.6, 15.0, 10.4], floor: 'polished-concrete' },
    { name: 'Garden terrace', type: 'terrace', rect: [0, -3.0, 15.0, 0], floor: 'patio-tile' },
  ],
  openings: [
    ['door', 7.5, 10.4, { w: 1.2, h: 2.2 }], // front door (south), facing the stair
    ['door', 5.0, 5.0, { w: 0.9 }], // foyer → living
    ['passage', 7.5, 4.4, { w: 2.4, h: 2.3 }], // foyer → dining
    ['passage', 5.0, 2.2, { w: 2.4, h: 2.3 }], // living → dining
    ['passage', 10.0, 2.2, { w: 2.0, h: 2.3 }], // dining → kitchen
    ['door', 5.0, 7.0, { w: 0.9 }], // foyer → guest bedroom
    ['door', 5.0, 9.4, { w: 0.8 }], // foyer → guest bath
    ['passage', 10.0, 6.0, { w: 1.2, h: 2.3 }], // foyer → family room
    ['passage', 12.5, 4.4, { w: 2.0, h: 2.3 }], // family room → kitchen
    ['door', 10.0, 9.0, { w: 0.9 }], // foyer → study
    ['door', 13.8, 7.6, { w: 0.8 }], // family room → utility
    ['door', 2.5, 0, { w: 2.4, h: 2.2 }], // living → terrace (glazed)
    ['door', 7.5, 0, { w: 2.4, h: 2.2 }], // dining → terrace (glazed)
    ['window', 12.5, 0, { w: 2.2, h: 1.0, sill: 1.05 }],
    ['window', 15.0, 2.2, { w: 1.2, h: 1.2, sill: 1.0 }],
    ['window', 0, 2.8, { w: 1.6, h: 1.6, sill: 0.6 }],
    ['window', 0, 7.0, { w: 1.4, h: 1.4, sill: 0.8 }],
    ['window', 1.3, 10.4, { w: 1.2, h: 1.4, sill: 0.8 }],
    ['window', 3.8, 10.4, { w: 0.7, h: 0.7, sill: 1.4 }],
    ['window', 15.0, 6.0, { w: 1.6, h: 1.5, sill: 0.7 }],
    ['window', 11.3, 10.4, { w: 1.4, h: 1.4, sill: 0.8 }],
    ['window', 13.8, 10.4, { w: 0.9, h: 0.9, sill: 1.2 }],
    ['window', 5.9, 10.4, { w: 0.8, h: 1.8, sill: 0.3 }], // tall slot windows beside the front door
    ['window', 9.1, 10.4, { w: 0.8, h: 1.8, sill: 0.3 }],
  ],
  stairs: [{ at: [7.5, 7.6], deg: 90, w: 1.1, len: 4.25 }], // rises from the front door towards the garden
  items: [
    // living
    ['rug-wool', 2.5, 2.8, 0, 'stone'],
    ['sofa-curve-velvet', 2.5, 4.1, 180],
    ['table-coffee-round', 2.5, 2.8],
    ['chair-lounge', 0.9, 1.6, 60],
    ['chair-arm', 4.1, 1.5, -60],
    ['plant-large', 0.5, 5.0],
    // dining
    ['table-dining-rect', 7.5, 2.2, 0, 'oak'],
    ['chair-dining', 6.9, 1.45],
    ['chair-dining', 8.1, 1.45],
    ['chair-dining', 6.9, 2.95, 180],
    ['chair-dining', 8.1, 2.95, 180],
    ['lamp-pendant-dome', 7.5, 2.2],
    ['cabinet-drawers', 5.67, 3.7, 90],
    // kitchen
    ['kitchen-run', 12.5, 0.4, 0, 'white-oak'],
    ['kitchen-island', 12.5, 2.4, 0, 'white-oak'],
    ['stool-bar-round', 12.1, 3.25],
    ['stool-bar-round', 12.9, 3.25],
    ['kitchen-tall-fridge', 14.56, 3.5, -90, 'white-oak'],
    // foyer
    ['console-carved', 5.35, 8.0, 90],
    ['plant-large', 9.5, 9.8],
    ['art-photo-landscape', 9.95, 7.6],
    // guest bedroom
    ['bed-double', 1.2, 7.0, 90, 'stone'],
    ['nightstand-painted', 0.42, 5.95, 90],
    ['wardrobe', 1.3, 9.96, 180, 'white'],
    // guest bath
    ['shower', 3.3, 9.85],
    ['vanity', 4.55, 8.85, -90, 'white'],
    ['wc', 4.6, 9.95, -90],
    // family room
    ['sofa-arlo', 12.0, 7.04, 180, 'oatmeal'],
    ['table-coffee-slab', 12.0, 5.9],
    ['chair-arm', 14.3, 5.4, -90],
    // study
    ['desk', 11.3, 9.9, 180],
    ['chair-arm', 11.3, 9.0],
    ['shelves-cube', 10.3, 8.2, 90],
    // utility
    ['shelves-white', 14.65, 9.0, -90],
    ['basket-wicker', 13.2, 10.0],
    // terrace
    ['outdoor-bistro-set', 4.8, -1.5, 90],
    ['outdoor-bistro-set', 11.0, -1.5, 90],
    ['planter-crate', 0.7, -2.4],
    ['planter-crate', 14.3, -2.4],
    ['garden-fern', 9.0, -2.4],
  ],
  upper: [
    {
      name: 'First floor',
      rooms: [
        { name: 'Bedroom 2', type: 'bedroom', rect: [0, 0, 5.0, 5.6], floor: 'light-oak-plank', walls: 'clay-plaster' },
        { name: 'Upper lounge', type: 'living', rect: [5.0, 0, 10.0, 4.4], floor: 'oak-parquet', walls: 'warm-greige' },
        { name: 'Master bedroom', type: 'bedroom', rect: [10.0, 0, 15.0, 4.4], floor: 'oak-herringbone', walls: 'warm-greige' },
        { name: 'Gallery', type: 'hall', rect: [5.0, 4.4, 10.0, 10.4], floor: 'limestone' },
        { name: 'Family bath', type: 'bathroom', rect: [2.6, 5.6, 5.0, 7.8], floor: 'checker-tile', walls: 'white-wall-tile' },
        {
          name: 'Bedroom 3',
          type: 'bedroom',
          points: [[0, 5.6], [2.6, 5.6], [2.6, 7.8], [5.0, 7.8], [5.0, 10.4], [0, 10.4]],
          floor: 'light-oak-plank',
          walls: 'sage-limewash',
        },
        { name: 'Dressing', type: 'dressing', rect: [10.0, 4.4, 12.4, 7.0], floor: 'oak-parquet' },
        { name: 'En-suite', type: 'bathroom', rect: [12.4, 4.4, 15.0, 7.0], floor: 'limestone', walls: 'white-wall-tile' },
        { name: 'Bedroom 4', type: 'bedroom', rect: [10.0, 7.0, 15.0, 10.4], floor: 'light-oak-plank', walls: 'ink-blue' },
        { name: 'Balcony', type: 'balcony', rect: [5.0, -1.8, 10.0, 0], floor: 'teak-deck' },
      ],
      openings: [
        ['passage', 7.5, 4.4, { w: 2.4, h: 2.3 }], // gallery → upper lounge
        ['door', 7.5, 0, { w: 2.4, h: 2.2 }], // lounge → balcony (glazed)
        ['door', 5.0, 5.0, { w: 0.9 }], // → bedroom 2
        ['door', 5.0, 6.85, { w: 0.8 }], // → family bath
        ['door', 5.0, 9.1, { w: 0.9 }], // → bedroom 3
        ['door', 10.0, 5.7, { w: 0.9 }], // → dressing (master suite)
        ['door', 11.2, 4.4, { w: 0.9 }], // dressing → master
        ['door', 12.4, 5.7, { w: 0.8 }], // dressing → en-suite
        ['door', 10.0, 8.7, { w: 0.9 }], // → bedroom 4
        ['window', 2.5, 0, { w: 2.0, h: 1.5, sill: 0.7 }],
        ['window', 0, 2.8, { w: 1.2, h: 1.4, sill: 0.8 }],
        ['window', 12.5, 0, { w: 2.0, h: 1.5, sill: 0.7 }],
        ['window', 15.0, 2.2, { w: 1.2, h: 1.4, sill: 0.8 }],
        ['window', 15.0, 5.7, { w: 0.8, h: 0.7, sill: 1.4 }],
        ['window', 0, 6.8, { w: 1.0, h: 1.4, sill: 0.8 }],
        ['window', 1.3, 10.4, { w: 1.4, h: 1.4, sill: 0.8 }],
        ['window', 12.5, 10.4, { w: 1.8, h: 1.5, sill: 0.7 }],
        ['window', 15.0, 8.7, { w: 1.2, h: 1.4, sill: 0.8 }],
        ['window', 7.5, 10.4, { w: 2.4, h: 1.8, sill: 0.5 }], // gallery window over the entrance
      ],
      items: [
        // bedroom 2
        ['bed-double', 2.5, 1.2, 0, 'clay'],
        ['nightstand-painted', 1.35, 0.4],
        ['nightstand-painted', 3.65, 0.4],
        ['wardrobe-3door', 1.3, 5.24, 180, 'white'],
        ['desk', 0.5, 3.4, 90],
        // upper lounge
        ['sofa-arlo', 7.5, 2.9, 0, 'sage'],
        ['table-coffee-slab', 7.5, 1.7],
        ['shelves-cube', 5.4, 2.0, 90],
        ['plant-large', 9.5, 3.9],
        // master
        ['bed-king', 12.5, 1.2, 0, 'ivory'],
        ['nightstand-classic', 11.15, 0.4],
        ['nightstand-classic', 13.85, 0.4],
        ['chair-lounge', 13.9, 3.4, -120],
        // gallery
        ['bench-wood', 9.6, 8.0, -90],
        ['art-print-poster', 5.05, 8.0],
        // family bath
        ['bath', 3.8, 6.07],
        ['vanity', 4.0, 7.49, 180, 'white'],
        ['wc', 3.0, 7.4, 180],
        // bedroom 3
        ['bed-double', 1.2, 8.4, 90, 'moss'],
        ['wardrobe', 3.5, 9.96, 180, 'sage'],
        // dressing
        ['wardrobe-3door', 11.2, 6.62, 180, 'oak'],
        ['ottoman-leather', 11.2, 5.5],
        // en-suite
        ['shower', 14.4, 6.45],
        ['bath', 13.7, 4.9],
        ['vanity', 12.9, 6.65, 180, 'oak'],
        // bedroom 4
        ['bed-double', 13.7, 8.7, -90, 'stone'],
        ['wardrobe', 11.0, 9.96, 180, 'white'],
        ['desk-student', 10.45, 7.9, 90],
        // balcony
        ['outdoor-bistro-set', 6.0, -0.9, 90],
        ['planter-crate', 9.3, -1.0],
      ],
    },
  ],
}
