import type { HouseSpec } from '../spec'

/**
 * Tropical verandah bungalow (13 × 10 m plus a full-width front verandah). The deep sit-out shades
 * the front rooms. A wide front door opens into the living room, which links the two front bedrooms
 * and the dining room behind it. The kitchen is on one side of the dining room; a third bedroom and
 * the common bath are on the other. Terracotta and stone floors, lime-rendered walls.
 */
export const VERANDAH_BUNGALOW: HouseSpec = {
  name: 'Verandah bungalow',
  facade: 'exterior-render',
  rooms: [
    { name: 'Verandah', type: 'terrace', rect: [0, 10.0, 13.0, 12.4], floor: 'terracotta-tile' },
    { name: 'Living room', type: 'living', rect: [3.6, 5.4, 9.4, 10.0], floor: 'terracotta-tile', walls: 'chalk-white' },
    { name: 'Bedroom 1', type: 'bedroom', rect: [0, 5.4, 3.6, 10.0], floor: 'oak-parquet', walls: 'sage-limewash' },
    { name: 'Bedroom 2', type: 'bedroom', rect: [9.4, 5.4, 13.0, 10.0], floor: 'oak-parquet', walls: 'clay-plaster' },
    { name: 'Kitchen', type: 'kitchen', rect: [0, 0, 3.6, 5.4], floor: 'granite-tile' },
    { name: 'Dining room', type: 'dining', rect: [3.6, 0, 9.4, 5.4], floor: 'terracotta-tile', walls: 'warm-greige' },
    { name: 'Bedroom 3', type: 'bedroom', rect: [9.4, 0, 13.0, 3.0], floor: 'oak-parquet' },
    { name: 'Bathroom', type: 'bathroom', rect: [9.4, 3.0, 13.0, 5.4], floor: 'checker-tile', walls: 'white-wall-tile' },
  ],
  openings: [
    ['passage', 6.5, 12.4, { w: 1.6, h: 0.95 }], // steps down from the verandah through its low wall
    ['door', 6.5, 10.0, { w: 1.2, h: 2.2 }], // front door from the verandah
    ['window', 4.6, 10.0, { w: 1.2, h: 1.6, sill: 0.6 }],
    ['window', 8.4, 10.0, { w: 1.2, h: 1.6, sill: 0.6 }],
    ['door', 3.6, 6.4, { w: 0.9 }], // living → bedroom 1
    ['door', 9.4, 6.4, { w: 0.9 }], // living → bedroom 2
    ['passage', 6.5, 5.4, { w: 2.4, h: 2.3 }], // living → dining
    ['passage', 3.6, 2.7, { w: 1.4, h: 2.2 }], // dining → kitchen
    ['door', 9.4, 1.5, { w: 0.9 }], // dining → bedroom 3
    ['door', 9.4, 4.2, { w: 0.8 }], // dining → bathroom
    ['window', 1.8, 10.0, { w: 1.4, h: 1.4, sill: 0.8 }],
    ['window', 0, 7.7, { w: 1.4, h: 1.4, sill: 0.8 }],
    ['window', 11.2, 10.0, { w: 1.4, h: 1.4, sill: 0.8 }],
    ['window', 13.0, 7.7, { w: 1.4, h: 1.4, sill: 0.8 }],
    ['window', 1.8, 0, { w: 1.6, h: 1.0, sill: 1.05 }],
    ['window', 0, 2.7, { w: 1.0, h: 1.0, sill: 1.05 }],
    ['window', 6.5, 0, { w: 2.4, h: 1.6, sill: 0.6 }],
    ['window', 11.2, 0, { w: 1.4, h: 1.4, sill: 0.8 }],
    ['window', 13.0, 1.5, { w: 1.0, h: 1.2, sill: 0.9 }],
    ['window', 13.0, 4.2, { w: 0.8, h: 0.7, sill: 1.4 }],
  ],
  items: [
    // verandah
    ['bench-wood', 2.0, 11.9],
    ['bench-wood', 11.0, 11.9],
    ['chair-lounge', 4.4, 11.5, 200],
    ['chair-lounge', 8.6, 11.5, 160],
    ['planter-crate', 0.6, 10.6],
    ['planter-crate', 12.4, 10.6],
    // living
    // seating either side of the axis from the front door to the dining room
    ['rug-wool', 6.0, 7.9, 90, 'stone'],
    ['sofa-arlo', 4.2, 7.9, 90, 'oatmeal'],
    ['table-coffee-round', 6.0, 7.9],
    ['chair-arm', 8.6, 7.4, -90],
    ['chair-arm', 8.6, 8.5, -90],
    ['plant-large', 4.05, 9.53],
    // bedrooms
    ['bed-double', 1.8, 8.8, 180, 'moss'],
    ['nightstand-painted', 0.6, 9.6],
    ['wardrobe', 0.46, 6.6, 90, 'oak'],
    ['bed-double', 11.2, 8.8, 180, 'clay'],
    ['nightstand-painted', 12.4, 9.6],
    ['wardrobe', 12.54, 6.6, -90, 'white'],
    ['bed-single', 11.8, 1.15, 90, 'stone'],
    ['desk-student', 12.5, 2.45, -90],
    // kitchen
    ['kitchen-run', 0.43, 2.7, 90, 'walnut-terrazzo'],
    ['kitchen-tall-fridge', 3.0, 0.43, 0, 'walnut-terrazzo'],
    ['table-dining-round', 2.0, 4.3],
    // dining
    ['table-dining-rect', 6.5, 2.4, 0, 'oak'],
    ['chair-dining', 5.9, 1.65],
    ['chair-dining', 7.1, 1.65],
    ['chair-dining', 5.9, 3.15, 180],
    ['chair-dining', 7.1, 3.15, 180],
    ['lamp-pendant-dome', 6.5, 2.4],
    ['cabinet-drawers', 4.0, 1.2, 90],
    // bathroom
    ['shower', 12.4, 3.6],
    ['vanity', 11.0, 5.09, 180, 'white'],
    ['wc', 12.6, 4.8, -90],
  ],
}
