import type { HouseSpec } from '../spec'

/** The original six-room single-storey home (the engine's reference project since Phase 1). */
export const COMPACT_HOME: HouseSpec = {
  name: 'Compact single-storey home',
  rooms: [
    { name: 'Living & dining', type: 'living', rect: [0, 0, 6.2, 4.6], floor: 'oak-herringbone' },
    { name: 'Kitchen', type: 'kitchen', rect: [6.2, 0, 10, 4.6], floor: 'limestone' },
    { name: 'Bedroom', type: 'bedroom', rect: [0, 4.6, 3.8, 8.2], floor: 'smoked-oak-plank', walls: 'sage-limewash' },
    { name: 'Hall', type: 'hall', rect: [3.8, 4.6, 5.3, 8.2], floor: 'oak-herringbone' },
    { name: 'Bathroom', type: 'bathroom', rect: [5.3, 4.6, 7.6, 8.2], floor: 'microcement' },
    { name: 'Study', type: 'study', rect: [7.6, 4.6, 10, 8.2], floor: 'smoked-oak-plank', walls: 'clay-plaster' },
  ],
  openings: [
    ['door', 4.55, 8.2, { w: 1.0, h: 2.15 }], // front door
    ['door', 4.55, 4.6], // hall → living
    ['door', 3.8, 7.55], // hall → bedroom
    ['door', 5.3, 5.4, { w: 0.8 }], // hall → bathroom
    ['passage', 6.2, 2.6, { w: 2.0, h: 2.3 }], // open kitchen
    ['door', 8.4, 4.6], // kitchen → study
    ['window', 1.6, 0, { w: 1.6, h: 1.8, sill: 0.45 }],
    ['window', 4.6, 0, { w: 1.6, h: 1.8, sill: 0.45 }],
    ['window', 0, 1.6, { w: 1.2, h: 1.3, sill: 0.9 }],
    ['window', 8.1, 0, { w: 1.4, h: 1.0, sill: 1.1 }],
    ['window', 10, 2.6, { w: 1.2, h: 1.3, sill: 0.9 }],
    ['window', 0, 6.4, { w: 1.4, h: 1.4, sill: 0.8 }],
    ['window', 1.9, 8.2, { w: 1.2, h: 1.4, sill: 0.8 }],
    ['window', 6.45, 8.2, { w: 0.7, h: 0.7, sill: 1.5 }],
    ['window', 10, 6.4, { w: 1.2, h: 1.4, sill: 0.8 }],
    ['window', 8.8, 8.2, { w: 1.4, h: 1.4, sill: 0.8 }],
  ],
  items: [
    // living & dining
    ['rug-wool', 1.85, 2.75],
    ['sofa-arlo', 1.85, 4.0, 180],
    ['table-coffee-slab', 1.85, 2.75],
    ['chair-lounge', 0.98, 1.32, 40.1],
    ['cabinet-media', 0.42, 2.9, 90],
    ['plant-large', 5.75, 0.55],
    ['table-dining-round', 4.7, 2.0],
    ['chair-dining', 4.7, 1.22],
    ['chair-dining', 4.7, 2.78, 180],
    ['chair-dining', 3.92, 2.0, 90],
    ['chair-dining', 5.48, 2.0, -90],
    // kitchen
    ['kitchen-run', 8.1, 0.45],
    ['kitchen-island', 8.1, 2.45],
    // bedroom
    ['bed-double', 1.9, 5.76],
    ['table-side', 0.62, 4.95],
    ['table-side', 3.15, 4.95],
    ['wardrobe', 3.43, 6.15, -90],
    // hall
    ['bench-wood', 4.1, 6.6, 90],
    // bathroom
    ['bath', 6.45, 7.66, 180],
    ['vanity', 7.29, 6.3, -90],
    ['wc', 6.0, 4.96],
    // study
    ['desk', 9.5, 6.6, -90],
    ['chair-arm', 8.5, 7.4, 137.5],
    ['shelves-cube', 7.87, 6.2, 90],
  ],
}
