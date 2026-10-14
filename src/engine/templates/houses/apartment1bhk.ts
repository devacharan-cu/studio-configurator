import type { HouseSpec } from '../spec'

/**
 * One-bedroom (1BHK) apartment (7.2 × 8.4 m, ~52 m² plus a balcony). A small foyer with a shoe
 * console leads to the living and dining room, which opens onto the balcony and into the kitchen. The
 * bedroom is off the living room; the bathroom is off the foyer, so guests use it without passing
 * through the bedroom.
 */
export const APARTMENT_1BHK: HouseSpec = {
  name: 'One-bedroom apartment',
  facade: 'white-stucco',
  rooms: [
    { name: 'Foyer', type: 'hall', rect: [0, 6.6, 2.0, 8.4], floor: 'granite-tile' },
    { name: 'Living & dining', type: 'living', rect: [0, 0, 4.4, 6.6], floor: 'light-oak-plank', walls: 'warm-greige' },
    { name: 'Kitchen', type: 'kitchen', rect: [4.4, 0, 7.2, 3.2], floor: 'granite-tile' },
    { name: 'Bedroom', type: 'bedroom', rect: [4.4, 3.2, 7.2, 8.4], floor: 'light-oak-plank', walls: 'sage-limewash' },
    { name: 'Bathroom', type: 'bathroom', rect: [2.0, 6.6, 4.4, 8.4], floor: 'checker-tile', walls: 'white-wall-tile' },
    { name: 'Balcony', type: 'balcony', rect: [0, -1.6, 4.4, 0], floor: 'teak-deck' },
  ],
  openings: [
    ['door', 1.0, 8.4, { w: 0.95, h: 2.15 }], // front door from the common corridor
    ['passage', 1.0, 6.6, { w: 1.2, h: 2.2 }], // foyer → living
    ['door', 2.0, 7.5, { w: 0.7 }], // foyer → bathroom
    ['passage', 4.4, 1.6, { w: 1.2, h: 2.2 }], // living → kitchen
    ['door', 4.4, 4.0, { w: 0.85 }], // living → bedroom
    ['door', 2.2, 0, { w: 1.8, h: 2.2 }], // living → balcony (glazed)
    ['window', 0, 3.6, { w: 1.4, h: 1.4, sill: 0.8 }],
    ['window', 5.8, 0, { w: 1.2, h: 1.0, sill: 1.05 }],
    ['window', 7.2, 5.8, { w: 1.4, h: 1.4, sill: 0.8 }],
    ['window', 3.2, 8.4, { w: 0.6, h: 0.6, sill: 1.5 }],
  ],
  items: [
    // foyer
    ['console-carved', 0.43, 7.5, 90],
    // living & dining
    ['sofa-arlo', 0.62, 4.1, 90, 'charcoal'],
    ['table-coffee-slab', 1.8, 4.1, 90],
    ['rug-wool', 1.9, 4.1, 90, 'stone'],
    ['table-dining-round', 1.3, 1.9],
    ['chair-dining', 0.65, 1.9, 90],
    ['chair-dining', 1.95, 1.9, -90],
    ['plant-large', 3.9, 0.6],
    // kitchen
    ['kitchen-run-short', 5.8, 0.43, 0, 'sage-quartz'],
    ['kitchen-tall-fridge', 6.77, 2.5, -90, 'sage-quartz'],
    // bedroom
    ['bed-double', 5.8, 7.2, 180, 'clay'],
    ['nightstand-painted', 4.75, 8.0],
    ['wardrobe', 6.77, 4.3, -90, 'white'],
    // bathroom
    ['shower', 3.88, 7.5, 90],
    ['vanity', 2.9, 6.91, 0, 'white'],
    ['wc', 2.9, 7.99, 180],
    // balcony
    ['outdoor-bistro-set', 1.0, -0.8, 90],
    ['planter-crate', 3.8, -0.9],
  ],
}
