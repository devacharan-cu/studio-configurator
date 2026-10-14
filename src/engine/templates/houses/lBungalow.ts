import type { HouseSpec } from '../spec'

/**
 * L-shaped bungalow (~150 m²). The day wing runs east–west (study, entrance hall, living, kitchen,
 * laundry); the night wing runs south along a corridor (two bedrooms, a family bath, and a master suite
 * with an en-suite at its end). A garden terrace sits in the crook of the L, reached through glazed
 * doors from the living room.
 */
export const L_BUNGALOW: HouseSpec = {
  name: 'L-shaped bungalow',
  facade: 'white-stucco',
  rooms: [
    { name: 'Study', type: 'study', rect: [0, 0, 4.4, 3.0], floor: 'oak-parquet', walls: 'ink-blue' },
    { name: 'Entrance hall', type: 'hall', rect: [0, 3.0, 4.4, 6.0], floor: 'terrazzo' },
    { name: 'Living room', type: 'living', rect: [4.4, 0, 10.0, 6.0], floor: 'oak-parquet', walls: 'warm-greige' },
    { name: 'Kitchen', type: 'kitchen', rect: [10.0, 0, 14.0, 4.4], floor: 'polished-concrete', walls: 'white-panelling' },
    { name: 'Laundry', type: 'laundry', rect: [10.0, 4.4, 14.0, 6.0], floor: 'polished-concrete' },
    { name: 'Corridor', type: 'hall', rect: [3.0, 6.0, 4.4, 11.4], floor: 'oak-parquet' },
    { name: 'Bedroom 2', type: 'bedroom', rect: [0, 6.0, 3.0, 9.6], floor: 'light-oak-plank', walls: 'sage-limewash' },
    { name: 'Family bath', type: 'bathroom', rect: [0, 9.6, 3.0, 11.4], floor: 'checker-tile', walls: 'white-wall-tile' },
    { name: 'Bedroom 3', type: 'bedroom', rect: [4.4, 6.0, 7.2, 9.6], floor: 'light-oak-plank' },
    { name: 'En-suite', type: 'bathroom', rect: [4.4, 9.6, 7.2, 11.4], floor: 'pebble-mosaic', walls: 'white-wall-tile' },
    { name: 'Master bedroom', type: 'bedroom', rect: [0, 11.4, 7.2, 15.0], floor: 'oak-parquet', walls: 'warm-greige' },
    { name: 'Garden terrace', type: 'terrace', rect: [7.2, 6.0, 12.0, 10.0], floor: 'patio-tile' },
  ],
  openings: [
    ['door', 0, 4.5, { w: 1.0, h: 2.15 }], // front door (west)
    ['door', 2.1, 3.0], // hall → study
    ['passage', 4.4, 4.5, { w: 1.4, h: 2.3 }], // hall → living
    ['passage', 3.7, 6.0, { w: 0.9, h: 2.2 }], // hall → corridor
    ['passage', 10.0, 2.2, { w: 1.6, h: 2.3 }], // living → kitchen
    ['door', 12.0, 4.4, { w: 0.8 }], // kitchen → laundry
    ['door', 8.6, 6.0, { w: 1.8, h: 2.2 }], // living → terrace (glazed)
    ['door', 3.0, 7.8], // corridor → bedroom 2
    ['door', 3.0, 10.5, { w: 0.8 }], // corridor → family bath
    ['door', 4.4, 7.8], // corridor → bedroom 3
    ['door', 3.7, 11.4], // corridor → master
    ['door', 5.7, 11.4, { w: 0.8 }], // master → en-suite
    ['window', 2.1, 0, { w: 1.4, h: 1.4, sill: 0.8 }],
    ['window', 0, 1.5, { w: 1.0, h: 1.4, sill: 0.8 }],
    ['window', 6.0, 0, { w: 2.0, h: 1.8, sill: 0.45 }],
    ['window', 8.6, 0, { w: 1.4, h: 1.8, sill: 0.45 }],
    ['window', 12.0, 0, { w: 1.4, h: 1.0, sill: 1.1 }],
    ['window', 14.0, 2.2, { w: 1.2, h: 1.2, sill: 1.0 }],
    ['window', 14.0, 5.2, { w: 0.8, h: 0.8, sill: 1.2 }],
    ['window', 0, 7.8, { w: 1.4, h: 1.4, sill: 0.8 }],
    ['window', 0, 10.5, { w: 0.7, h: 0.6, sill: 1.5 }],
    ['window', 7.2, 7.8, { w: 1.4, h: 1.4, sill: 0.8 }], // bedroom 3 onto the terrace
    ['window', 7.2, 10.5, { w: 0.7, h: 0.6, sill: 1.6 }],
    ['window', 3.6, 15.0, { w: 2.2, h: 1.6, sill: 0.6 }],
    ['window', 0, 13.2, { w: 1.2, h: 1.4, sill: 0.8 }],
    ['window', 7.2, 12.1, { w: 0.9, h: 1.4, sill: 0.8 }],
  ],
  items: [
    // study
    ['desk', 2.1, 0.5, 0, 'walnut'],
    ['chair-arm', 2.1, 1.35, 180],
    ['lamp-desk-arm', 2.6, 0.45],
    ['shelves-steel', 0.5, 1.5, 90],
    // entrance hall
    ['console-carved', 2.2, 5.6, 180],
    ['vase-white', 2.2, 5.6],
    ['mirror-ornate', 2.2, 5.9],
    ['plant-small', 0.4, 3.4],
    // living
    ['rug-wool', 7.1, 2.8, 0, 'stone'],
    ['sofa-carved-loveseat', 7.1, 4.2, 180],
    ['table-coffee-round', 7.1, 2.6],
    ['vase-round-glazed', 7.1, 2.6],
    ['chair-lounge', 5.4, 1.45, 45],
    ['chair-green-arm', 9.0, 1.5, -45],
    ['cabinet-media', 7.1, 0.4],
    ['plant-large', 9.5, 5.4],
    ['art-photo-landscape', 4.6, 2.5],
    ['lamp-chandelier', 7.1, 2.7],
    // kitchen
    ['kitchen-run', 12.0, 0.4, 0, 'charcoal-concrete'],
    ['kitchen-island', 12.0, 2.7, 0, 'charcoal-concrete'],
    ['stool-bar-round', 11.5, 3.45],
    ['stool-bar-round', 12.5, 3.45],
    ['kitchen-tall-fridge', 13.6, 3.6, 0, 'charcoal-concrete'],
    ['lamp-pendant-industrial', 12.0, 2.7],
    // laundry
    ['shelves-white', 13.3, 5.75, 180],
    ['basket-wicker', 11.0, 5.6],
    // bedroom 2
    ['bed-double', 1.5, 7.13, 0, 'clay'],
    ['nightstand-painted', 0.4, 6.4],
    ['wardrobe', 1.5, 9.22, 180, 'sage'],
    // family bath
    ['bath', 1.2, 10.55, 0],
    ['vanity', 2.55, 11.1, 0, 'white'],
    ['wc', 0.5, 11.0],
    // bedroom 3
    ['bed-single', 6.55, 7.12, 0, 'stone'],
    ['desk-student', 6.6, 9.2, 180],
    ['nightstand-painted', 5.75, 6.35],
    // en-suite
    ['shower', 6.6, 10.5],
    ['vanity', 4.9, 11.1, 0, 'oak'],
    ['mirror-rect', 4.9, 11.3],
    ['wc', 4.55, 10.0],
    // master
    ['bed-king', 2.0, 13.85, 90, 'ivory'],
    ['nightstand-classic', 0.42, 12.6, 90],
    ['nightstand-classic', 0.42, 15.0 - 0.45, 90],
    ['wardrobe-3door', 6.77, 13.5, -90, 'oak'],
    ['chair-bergere', 5.4, 14.15, 200],
    ['ottoman-leather', 3.7, 13.85],
    // terrace
    ['outdoor-bistro-set', 10.2, 8.3, 90],
    ['garden-fern', 11.4, 6.6],
    ['garden-calathea', 7.7, 9.5],
  ],
}
