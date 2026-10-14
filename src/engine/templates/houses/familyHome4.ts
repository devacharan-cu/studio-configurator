import type { HouseSpec } from '../spec'

/**
 * Contemporary four-bedroom family home (~165 m² + terrace). Living room and an open kitchen-diner
 * along the north (garden) side, with a terrace off the living room; a long corridor separates them
 * from the master suite (en-suite and dressing room), bedroom 2, the family bath and the laundry; two
 * more bedrooms sit at the north-east end. The entrance hall opens to the living room and the corridor.
 */
export const FAMILY_HOME_4: HouseSpec = {
  name: 'Contemporary family home',
  facade: 'charcoal-render',
  rooms: [
    { name: 'Living room', type: 'living', rect: [0, 0, 6.0, 5.2], floor: 'oak-parquet', walls: 'warm-greige' },
    { name: 'Kitchen & dining', type: 'kitchen', rect: [6.0, 0, 11.6, 5.2], floor: 'polished-concrete', walls: 'chalk-white' },
    { name: 'Bedroom 3', type: 'bedroom', rect: [11.6, 0, 14.3, 5.2], floor: 'light-oak-plank', walls: 'sage-limewash' },
    { name: 'Bedroom 4', type: 'bedroom', rect: [14.3, 0, 17.0, 5.2], floor: 'light-oak-plank', walls: 'clay-plaster' },
    { name: 'Entrance hall', type: 'hall', rect: [0, 5.2, 3.0, 10.4], floor: 'terrazzo' },
    { name: 'Corridor', type: 'hall', rect: [3.0, 5.2, 17.0, 6.6], floor: 'oak-parquet' },
    { name: 'Master bedroom', type: 'bedroom', rect: [3.0, 6.6, 7.4, 10.4], floor: 'oak-parquet', walls: 'warm-greige' },
    { name: 'En-suite', type: 'bathroom', rect: [7.4, 6.6, 9.4, 8.6], floor: 'pebble-mosaic', walls: 'white-wall-tile' },
    { name: 'Dressing', type: 'dressing', rect: [7.4, 8.6, 9.4, 10.4], floor: 'oak-parquet' },
    { name: 'Bedroom 2', type: 'bedroom', rect: [9.4, 6.6, 12.8, 10.4], floor: 'light-oak-plank', walls: 'ink-blue' },
    { name: 'Family bath', type: 'bathroom', rect: [12.8, 6.6, 15.0, 10.4], floor: 'checker-tile', walls: 'white-wall-tile' },
    { name: 'Laundry', type: 'laundry', rect: [15.0, 6.6, 17.0, 10.4], floor: 'polished-concrete' },
    { name: 'Terrace', type: 'terrace', rect: [0, -3.0, 6.0, 0], floor: 'patio-tile' },
  ],
  openings: [
    ['door', 1.5, 10.4, { w: 1.0, h: 2.15 }], // front door (south)
    ['passage', 1.5, 5.2, { w: 1.6, h: 2.3 }], // hall → living
    ['passage', 3.0, 5.9, { w: 1.0, h: 2.2 }], // hall → corridor
    ['passage', 6.0, 2.6, { w: 2.4, h: 2.3 }], // living → kitchen
    ['passage', 8.8, 5.2, { w: 1.8, h: 2.3 }], // corridor → kitchen
    ['door', 13.7, 5.2], // → bedroom 3
    ['door', 14.88, 5.2], // → bedroom 4
    ['door', 5.2, 6.6], // → master
    ['door', 11.1, 6.6], // → bedroom 2
    ['door', 13.9, 6.6, { w: 0.8 }], // → family bath
    ['door', 16.0, 6.6, { w: 0.8 }], // → laundry
    ['door', 7.4, 7.6, { w: 0.8 }], // master → en-suite
    ['door', 7.4, 9.5, { w: 0.8 }], // master → dressing
    ['door', 3.0, 0, { w: 2.4, h: 2.2 }], // living → terrace (glazed)
    ['window', 0, 2.6, { w: 1.6, h: 1.6, sill: 0.6 }],
    ['window', 8.8, 0, { w: 2.0, h: 1.0, sill: 1.05 }],
    ['window', 12.95, 0, { w: 1.2, h: 1.4, sill: 0.8 }],
    ['window', 15.65, 0, { w: 1.2, h: 1.4, sill: 0.8 }],
    ['window', 17.0, 2.6, { w: 1.2, h: 1.4, sill: 0.8 }],
    ['window', 5.2, 10.4, { w: 2.0, h: 1.6, sill: 0.6 }],
    ['window', 8.4, 10.4, { w: 0.8, h: 0.8, sill: 1.4 }],
    ['window', 11.1, 10.4, { w: 1.6, h: 1.4, sill: 0.8 }],
    ['window', 13.9, 10.4, { w: 0.7, h: 0.6, sill: 1.5 }],
    ['window', 17.0, 8.5, { w: 0.8, h: 0.8, sill: 1.2 }],
  ],
  items: [
    // living
    ['rug-wool', 3.0, 2.4, 0, 'stone'],
    ['sofa-arlo', 3.0, 3.6, 180, 'charcoal'],
    ['table-coffee-slab', 3.0, 2.5],
    ['vase-bottle', 3.2, 2.5],
    ['chair-lounge', 1.0, 1.6, 60],
    ['chair-arm', 5.0, 1.5, -60],
    ['plant-large', 0.5, 4.7],
    ['art-photo-landscape', 0.2, 4.2],
    // kitchen & dining
    ['kitchen-run', 8.8, 0.4, 0, 'oak-quartz'],
    ['kitchen-island', 8.8, 2.4, 0, 'oak-quartz'],
    ['stool-bar-round', 8.4, 3.25],
    ['stool-bar-round', 9.2, 3.25],
    ['kitchen-tall-fridge', 11.2, 0.6, 0, 'oak-quartz'],
    ['table-dining-rect', 10.7, 3.0, 90, 'oak'],
    ['chair-dining', 9.95, 2.6, 90],
    ['chair-dining', 9.95, 3.4, 90],
    ['chair-dining', 10.7, 1.75],
    ['chair-dining', 10.7, 4.25, 180],
    ['lamp-pendant-dome', 8.8, 2.4],
    ['lamp-pendant-dome', 10.7, 3.0],
    // bedroom 3
    ['bed-single', 12.73, 1.8, 90, 'moss'],
    ['desk-student', 13.8, 3.6, -90],
    ['wardrobe', 12.3, 4.82, 180, 'sage'],
    // bedroom 4
    ['bed-double', 15.43, 2.4, 90, 'clay'],
    ['nightstand-painted', 14.62, 1.05],
    ['wardrobe', 16.25, 4.82, 180, 'white'],
    // entrance hall
    ['console-carved', 0.42, 8.2, 90],
    ['vase-brass-tall', 0.42, 8.6],
    ['mirror-ornate', 2.9, 8.0],
    ['plant-large', 2.5, 9.9],
    // corridor
    ['art-print-poster', 9.8, 6.5],
    // master
    ['bed-king', 4.13, 8.6, 90, 'ivory'],
    ['nightstand-classic', 3.3, 7.3, 90],
    ['nightstand-classic', 3.3, 9.9, 90],
    ['ottoman-leather', 5.55, 8.6, 90],
    // en-suite
    ['shower', 9.0, 7.6],
    ['vanity', 8.0, 6.9, 0, 'oak'],
    ['mirror-rect', 8.0, 6.75],
    ['wc', 8.0, 8.3],
    // dressing
    ['wardrobe', 9.03, 9.5, -90, 'oak'],
    // bedroom 2
    ['bed-double', 11.675, 8.6, -90, 'stone'],
    ['nightstand-painted', 12.48, 7.45, -90],
    ['nightstand-painted', 12.48, 9.75, -90],
    ['wardrobe', 9.76, 8.6, 90, 'white'],
    // family bath
    ['bath', 14.5, 8.6, 90],
    ['vanity', 13.1, 7.6, 0, 'white'],
    ['mirror-rect', 12.95, 7.6],
    ['wc', 13.1, 9.2],
    // laundry
    ['shelves-white', 16.0, 10.1, 180],
    ['basket-wicker', 15.5, 7.3],
    // terrace
    ['outdoor-bistro-set', 3.0, -1.8, 90],
    ['planter-crate', 0.7, -2.5],
    ['planter-crate', 5.3, -2.5],
    ['garden-fern', 5.2, -0.8],
  ],
}
