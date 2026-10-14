import type { HouseSpec } from '../spec'

/**
 * Two-bedroom city apartment (Indian urban 2BHK, ~88 m² + balcony). Living and dining open to a north
 * balcony; kitchen with a separate utility (wash) area; master bedroom with an attached bath; a
 * pooja room and a study off the inner hall; a common bath and a store by the entrance foyer.
 */
export const CITY_APARTMENT_2BHK: HouseSpec = {
  name: 'Two-bedroom city apartment',
  facade: 'sandstone-render',
  rooms: [
    { name: 'Living & dining', type: 'living', rect: [4.0, 0, 8.6, 5.0], floor: 'terrazzo', walls: 'warm-greige' },
    { name: 'Kitchen', type: 'kitchen', rect: [8.6, 0, 12.0, 3.2], floor: 'granite-tile', walls: 'white-wall-tile' },
    { name: 'Utility', type: 'utility', rect: [8.6, 3.2, 12.0, 4.4], floor: 'granite-tile' },
    { name: 'Master bedroom', type: 'bedroom', rect: [0, 0, 4.0, 4.4], floor: 'light-oak-plank', walls: 'sage-limewash' },
    { name: 'Master bath', type: 'bathroom', rect: [0, 4.4, 2.2, 6.2], floor: 'granite-tile', walls: 'white-wall-tile' },
    { name: 'Pooja room', type: 'pooja', rect: [2.2, 4.4, 4.0, 6.2], floor: 'limestone', walls: 'clay-plaster' },
    { name: 'Study', type: 'study', rect: [0, 6.2, 4.0, 8.0], floor: 'light-oak-plank' },
    { name: 'Hall', type: 'hall', rect: [4.0, 5.0, 8.6, 6.2], floor: 'terrazzo' },
    { name: 'Foyer', type: 'hall', rect: [4.0, 6.2, 5.6, 8.0], floor: 'terrazzo' },
    { name: 'Common bath', type: 'bathroom', rect: [5.6, 6.2, 7.4, 8.0], floor: 'granite-tile', walls: 'white-wall-tile' },
    { name: 'Store', type: 'storage', rect: [7.4, 6.2, 8.6, 8.0], floor: 'terrazzo' },
    { name: 'Bedroom 2', type: 'bedroom', rect: [8.6, 4.4, 12.0, 8.0], floor: 'light-oak-plank', walls: 'clay-plaster' },
    { name: 'Balcony', type: 'balcony', rect: [4.6, -1.4, 8.0, 0], floor: 'terracotta-tile' },
  ],
  openings: [
    ['door', 4.8, 8.0, { w: 1.0, h: 2.15 }], // front door
    ['passage', 4.8, 6.2, { w: 1.2, h: 2.2 }], // foyer → hall
    ['passage', 6.2, 5.0, { w: 1.6, h: 2.2 }], // hall → living
    ['door', 4.0, 3.6], // living → master
    ['door', 1.1, 4.4, { w: 0.8 }], // master → master bath
    ['door', 4.0, 5.6, { w: 0.8 }], // hall → pooja
    ['door', 4.0, 7.1], // foyer → study
    ['door', 6.5, 6.2, { w: 0.8 }], // hall → common bath
    ['door', 8.0, 6.2, { w: 0.7 }], // hall → store
    ['door', 8.6, 5.6], // hall → bedroom 2
    ['passage', 8.6, 2.4, { w: 1.2, h: 2.2 }], // dining → kitchen
    ['door', 10.3, 3.2, { w: 0.8 }], // kitchen → utility
    ['door', 6.3, 0, { w: 1.8, h: 2.2 }], // glazed doors to the balcony
    ['window', 2.0, 0, { w: 1.4, h: 1.4, sill: 0.8 }],
    ['window', 0, 1.1, { w: 1.2, h: 1.4, sill: 0.8 }],
    ['window', 0, 5.3, { w: 0.6, h: 0.6, sill: 1.5 }],
    ['window', 0, 7.1, { w: 1.0, h: 1.3, sill: 0.9 }],
    ['window', 2.0, 8.0, { w: 1.2, h: 1.3, sill: 0.9 }],
    ['window', 10.3, 0, { w: 1.2, h: 1.0, sill: 1.1 }],
    ['window', 12.0, 1.6, { w: 1.0, h: 1.0, sill: 1.1 }],
    ['window', 12.0, 3.8, { w: 0.8, h: 0.6, sill: 1.4 }],
    ['window', 12.0, 6.2, { w: 1.4, h: 1.4, sill: 0.8 }],
    ['window', 10.3, 8.0, { w: 1.2, h: 1.4, sill: 0.8 }],
  ],
  items: [
    // living
    ['rug-wool', 5.75, 1.6, 90, 'stone'],
    ['sofa-arlo', 4.6, 1.6, 90, 'sage'],
    ['table-coffee-slab', 5.75, 1.6, 90],
    ['vase-blue-white', 5.75, 1.45],
    ['chair-arm', 7.05, 1.3, -90],
    ['plant-large', 8.15, 0.55],
    ['fan-ceiling', 5.75, 1.6],
    // dining
    ['table-dining-rect-small', 7.6, 3.85, 90, 'walnut'],
    ['chair-dining', 6.9, 3.5, 90],
    ['chair-dining', 6.9, 4.2, 90],
    ['chair-dining', 7.6, 2.75],
    ['lamp-pendant-dome', 7.6, 3.85],
    // kitchen and utility
    ['kitchen-run', 10.3, 0.4, 0, 'white-oak'],
    ['kitchen-tall-fridge', 11.6, 2.4, 0, 'white-oak'],
    ['basket-wicker', 9.2, 3.9],
    // master bedroom
    ['bed-king', 2.87, 1.7, -90, 'ivory'],
    ['nightstand-classic', 3.72, 0.42, -90],
    ['lamp-diya', 3.72, 0.42],
    ['wardrobe-3door', 0.43, 3.2, 90, 'walnut'],
    ['chair-bergere', 1.0, 0.85, 140],
    ['fan-ceiling', 2.0, 2.2],
    // master bath
    ['shower', 0.6, 5.6],
    ['vanity', 1.6, 6.0, 0, 'oak'],
    ['mirror-rect', 1.6, 6.1],
    ['wc', 1.95, 4.8],
    // pooja
    ['console-carved', 2.58, 5.3, 90],
    ['lamp-diya', 2.58, 5.45],
    ['vase-brass-tall', 2.58, 4.85],
    // study
    ['desk', 1.2, 6.65, 0, 'oak'],
    ['chair-painted-white', 1.2, 7.0, 180],
    ['lamp-desk-arm', 1.65, 6.62],
    ['bookcase-worn', 0.95, 7.58, 180],
    // hall and foyer
    ['art-print-poster', 7.8, 5.15],
    ['mirror-ornate', 5.5, 7.0],
    // common bath and store
    ['wc', 6.0, 7.7],
    ['vanity', 6.9, 7.7, 0, 'white'],
    ['shelves-white', 8.0, 7.75, 180],
    // bedroom 2
    ['bed-double', 10.4, 5.55, 0, 'moss'],
    ['nightstand-painted', 9.3, 4.72],
    ['nightstand-painted', 11.5, 4.72],
    ['wardrobe', 8.96, 7.1, 90, 'white'],
    ['fan-ceiling', 10.3, 6.2],
    // balcony
    ['outdoor-bistro-set', 5.6, -0.7, 90],
    ['planter-crate', 7.4, -1.1],
  ],
}
