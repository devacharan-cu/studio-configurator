import type { HouseSpec } from '../spec'

/**
 * Three-bedroom family apartment (3BHK, ~118 m² + balcony). A central living and dining room opens to a
 * north balcony; a small lobby on the west serves two bedrooms and the common bath; the master suite on
 * the east has a dressing room and its own bath; the kitchen and a utility room sit behind the foyer.
 */
export const FAMILY_APARTMENT_3BHK: HouseSpec = {
  name: 'Three-bedroom family apartment',
  facade: 'white-stucco',
  rooms: [
    { name: 'Living & dining', type: 'living', rect: [3.8, 0, 10.2, 6.0], floor: 'light-oak-plank', walls: 'warm-greige' },
    { name: 'Foyer', type: 'hall', rect: [3.8, 6.0, 6.2, 9.0], floor: 'terrazzo' },
    { name: 'Kitchen', type: 'kitchen', rect: [6.2, 6.0, 10.2, 9.0], floor: 'granite-tile', walls: 'white-wall-tile' },
    { name: 'Utility', type: 'utility', rect: [10.2, 6.6, 14.0, 9.0], floor: 'granite-tile' },
    { name: 'Lobby', type: 'hall', rect: [2.4, 4.2, 3.8, 6.0], floor: 'light-oak-plank' },
    { name: 'Bedroom 2', type: 'bedroom', rect: [0, 0, 3.8, 4.2], floor: 'light-oak-plank', walls: 'sage-limewash' },
    { name: 'Common bath', type: 'bathroom', rect: [0, 4.2, 2.4, 6.0], floor: 'pebble-mosaic', walls: 'white-wall-tile' },
    { name: 'Bedroom 3', type: 'bedroom', rect: [0, 6.0, 3.8, 9.0], floor: 'light-oak-plank', walls: 'clay-plaster' },
    { name: 'Master bedroom', type: 'bedroom', rect: [10.2, 0, 14.0, 4.6], floor: 'oak-parquet', walls: 'warm-greige' },
    { name: 'Dressing', type: 'dressing', rect: [10.2, 4.6, 12.0, 6.6], floor: 'oak-parquet' },
    { name: 'Master bath', type: 'bathroom', rect: [12.0, 4.6, 14.0, 6.6], floor: 'pebble-mosaic', walls: 'white-wall-tile' },
    { name: 'Balcony', type: 'balcony', rect: [4.8, -1.4, 9.2, 0], floor: 'teak-deck' },
  ],
  openings: [
    ['door', 5.0, 9.0, { w: 1.0, h: 2.15 }], // front door
    ['passage', 5.0, 6.0, { w: 1.4, h: 2.3 }], // foyer → living
    ['passage', 8.2, 6.0, { w: 1.6, h: 2.3 }], // living → kitchen
    ['door', 10.2, 7.8, { w: 0.8 }], // kitchen → utility
    ['passage', 3.8, 5.1, { w: 1.2, h: 2.2 }], // living → lobby
    ['door', 3.1, 4.2, { w: 0.8 }], // lobby → bedroom 2
    ['door', 3.1, 6.0, { w: 0.8 }], // lobby → bedroom 3
    ['door', 2.4, 5.4, { w: 0.7 }], // lobby → common bath
    ['door', 10.2, 1.0], // living → master
    ['door', 11.1, 4.6, { w: 0.8 }], // master → dressing
    ['door', 13.0, 4.6, { w: 0.8 }], // master → master bath
    ['door', 7.0, 0, { w: 1.8, h: 2.2 }], // glazed doors to the balcony
    ['window', 2.7, 0, { w: 1.2, h: 1.4, sill: 0.8 }],
    ['window', 0, 2.6, { w: 1.2, h: 1.4, sill: 0.8 }],
    ['window', 0, 5.1, { w: 0.6, h: 0.6, sill: 1.5 }],
    ['window', 0, 7.5, { w: 1.4, h: 1.4, sill: 0.8 }],
    ['window', 1.9, 9.0, { w: 1.2, h: 1.3, sill: 0.9 }],
    ['window', 12.1, 0, { w: 1.6, h: 1.5, sill: 0.7 }],
    ['window', 14.0, 2.3, { w: 1.2, h: 1.4, sill: 0.8 }],
    ['window', 14.0, 5.6, { w: 0.7, h: 0.6, sill: 1.5 }],
    ['window', 14.0, 7.8, { w: 0.8, h: 0.8, sill: 1.2 }],
    ['window', 8.2, 9.0, { w: 1.4, h: 1.0, sill: 1.05 }],
  ],
  items: [
    // living
    ['rug-wool', 6.6, 2.3, 0, 'ivory'],
    ['sofa-curve-velvet', 6.6, 3.4, 180],
    ['table-coffee-round', 6.6, 2.0],
    ['vase-white', 6.6, 2.0],
    ['chair-bergere', 4.75, 1.4, 60],
    ['plant-large', 4.35, 5.4],
    ['fan-ceiling', 6.6, 2.3],
    // dining
    ['table-dining-rect', 9.3, 3.2, 90, 'oak'],
    ['chair-dining', 8.55, 2.8, 90],
    ['chair-dining', 8.55, 3.6, 90],
    ['chair-dining', 9.3, 1.95],
    ['chair-dining', 9.3, 4.45, 180],
    ['lamp-pendant-dome', 9.3, 3.2],
    // foyer
    ['bench-settle', 4.12, 7.6, 90],
    ['mirror-ornate', 6.1, 7.5],
    // kitchen and utility
    ['kitchen-run', 8.2, 8.6, 0, 'sage-quartz'],
    ['kitchen-tall-fridge', 9.85, 6.4, 0, 'sage-quartz'],
    ['shelves-white', 12.1, 8.75, 180],
    ['basket-wicker', 13.4, 7.0],
    // lobby
    ['art-print-poster', 2.5, 5.0],
    // bedroom 2
    ['bed-double', 2.675, 2.0, -90, 'moss'],
    ['nightstand-painted', 3.45, 0.85, -90],
    ['nightstand-painted', 3.45, 3.15, -90],
    ['wardrobe', 0.9, 0.43, 0, 'white'],
    // common bath
    ['shower', 0.75, 4.7],
    ['wc', 1.8, 4.6],
    ['vanity', 0.4, 5.6, 0, 'white'],
    // bedroom 3 (kids)
    ['bed-single', 1.19, 8.2, 90, 'clay'],
    ['desk-student', 0.5, 6.5, 90],
    ['shelves-cube', 2.0, 8.66, 180],
    // master
    ['bed-king', 11.33, 2.8, 90, 'stone'],
    ['nightstand-classic', 10.53, 1.55, 90],
    ['nightstand-classic', 10.53, 4.05, 90],
    ['chair-arm', 13.15, 1.15, -135],
    ['fan-ceiling', 12.1, 2.3],
    // dressing
    ['wardrobe', 11.63, 5.6, -90, 'walnut'],
    // master bath
    ['shower', 13.35, 6.1],
    ['vanity', 12.3, 5.9, 0, 'walnut'],
    ['wc', 13.7, 5.0],
    // balcony
    ['outdoor-bistro-set', 5.9, -0.7, 90],
    ['planter-crate', 8.6, -1.1],
  ],
}
