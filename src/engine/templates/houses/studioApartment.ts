import type { HouseSpec } from '../spec'

/**
 * Studio apartment, ~41 m² + balcony. One open room (sleeping, living, dining, kitchen along the east
 * wall), a separate entry with a bench, a shower room and a walk-in dressing room; glazed doors to a
 * north balcony.
 */
export const STUDIO_APARTMENT: HouseSpec = {
  name: 'Studio apartment',
  rooms: [
    { name: 'Studio', type: 'living', rect: [0, 0, 7.2, 4.2], floor: 'light-oak-plank', walls: 'warm-greige' },
    { name: 'Entry', type: 'hall', rect: [0, 4.2, 2.6, 6.0], floor: 'terrazzo' },
    { name: 'Shower room', type: 'bathroom', rect: [2.6, 4.2, 5.0, 6.0], floor: 'pebble-mosaic', walls: 'white-wall-tile' },
    { name: 'Dressing', type: 'dressing', rect: [5.0, 4.2, 7.2, 6.0], floor: 'light-oak-plank' },
    { name: 'Balcony', type: 'balcony', rect: [1.2, -1.5, 6.0, 0], floor: 'teak-deck' },
  ],
  openings: [
    ['door', 1.3, 6.0, { w: 1.0, h: 2.15 }], // front door from the landing
    ['passage', 1.3, 4.2, { w: 1.2, h: 2.2 }], // entry → studio
    ['door', 2.6, 5.15, { w: 0.8 }], // entry → shower room
    ['door', 5.6, 4.2, { w: 0.8 }], // studio → dressing
    ['door', 3.6, 0, { w: 1.8, h: 2.2 }], // glazed doors to the balcony
    ['window', 0, 3.6, { w: 0.9, h: 1.3, sill: 0.9 }],
    ['window', 7.2, 2.2, { w: 1.2, h: 1.0, sill: 1.1 }], // over the sink
    ['window', 6.6, 0, { w: 0.8, h: 1.4, sill: 0.8 }],
    ['window', 3.8, 6.0, { w: 0.7, h: 0.6, sill: 1.6 }],
  ],
  items: [
    // sleeping corner (west)
    ['bed-double', 1.2, 2.1, 90, 'stone'],
    ['nightstand-painted', 0.42, 0.95],
    ['nightstand-painted', 0.42, 3.25],
    ['lamp-diya', 0.42, 3.25],
    // living
    ['rug-wool', 3.65, 2.3, 90, 'stone'],
    ['sofa-settee', 3.65, 3.6, 180],
    ['table-drum-side', 2.75, 3.75],
    ['plant-large', 6.55, 0.6],
    ['art-photo-landscape', 3.6, 4.0],
    // dining and kitchen (east)
    ['table-dining-rect-small', 5.0, 1.6, 0, 'oak'],
    ['chair-dining', 4.65, 0.85],
    ['chair-dining', 5.35, 0.85],
    ['chair-dining', 4.65, 2.35, 180],
    ['chair-dining', 5.35, 2.35, 180],
    ['lamp-pendant-dome', 5.0, 1.6],
    ['kitchen-run-short', 6.9, 2.05, 0, 'white-oak'],
    ['fridge-steel', 6.7, 3.72, -90],
    // entry
    ['bench-settle', 0.38, 5.05, 90],
    ['mirror-ornate', 2.5, 5.1],
    // shower room
    ['shower', 4.3, 4.6],
    ['vanity', 3.4, 5.7, 0, 'white'],
    ['mirror-rect', 3.4, 5.9],
    ['wc', 2.75, 4.6],
    // dressing
    ['wardrobe-3door', 6.1, 5.55, 180, 'white'],
    // balcony
    ['outdoor-bistro-set', 2.4, -0.8, 90],
    ['planter-crate', 5.0, -1.1],
  ],
}
