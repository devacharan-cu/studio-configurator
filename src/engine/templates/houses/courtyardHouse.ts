import type { HouseSpec } from '../spec'

/**
 * Courtyard house (~145 m²): a U-plan wrapped around an open courtyard. The north wing holds living,
 * dining and kitchen with glazed doors onto the court; glazed corridors run down the west wing
 * (two bedrooms and a family bath) and the east wing (master bedroom, en-suite, study). The court's
 * south side is a low garden wall. Inspired by courtyard (aangan) houses: daylight and air reach every
 * room from the court.
 */
export const COURTYARD_HOUSE: HouseSpec = {
  name: 'Courtyard house',
  facade: 'facade-brick',
  rooms: [
    { name: 'Living & dining', type: 'living', rect: [0, 0, 8.0, 5.0], floor: 'terracotta-tile', walls: 'warm-greige' },
    { name: 'Kitchen', type: 'kitchen', rect: [8.0, 0, 14.0, 5.0], floor: 'terracotta-tile', walls: 'white-wall-tile' },
    { name: 'West corridor', type: 'hall', rect: [3.2, 5.0, 4.4, 13.6], floor: 'terracotta-tile' },
    { name: 'Bedroom 2', type: 'bedroom', rect: [0, 5.0, 3.2, 8.4], floor: 'teak-deck', walls: 'sage-limewash' },
    { name: 'Family bath', type: 'bathroom', rect: [0, 8.4, 3.2, 10.2], floor: 'pebble-mosaic', walls: 'white-wall-tile' },
    { name: 'Bedroom 3', type: 'bedroom', rect: [0, 10.2, 3.2, 13.6], floor: 'teak-deck' },
    { name: 'East corridor', type: 'hall', rect: [9.6, 5.0, 10.8, 13.6], floor: 'terracotta-tile' },
    { name: 'Master bedroom', type: 'bedroom', rect: [10.8, 5.0, 14.0, 9.6], floor: 'teak-deck', walls: 'clay-plaster' },
    { name: 'En-suite', type: 'bathroom', rect: [10.8, 9.6, 14.0, 11.4], floor: 'pebble-mosaic', walls: 'white-wall-tile' },
    { name: 'Study', type: 'study', rect: [10.8, 11.4, 14.0, 13.6], floor: 'teak-deck' },
    { name: 'Courtyard', type: 'courtyard', rect: [4.4, 5.0, 9.6, 13.6], floor: 'crazy-paving' },
  ],
  openings: [
    ['door', 3.0, 0, { w: 1.0, h: 2.15 }], // front door (north)
    ['passage', 3.76, 5.0, { w: 0.85, h: 2.2 }], // living → west corridor
    ['passage', 10.23, 5.0, { w: 0.85, h: 2.2 }], // kitchen → east corridor
    ['passage', 8.0, 2.5, { w: 1.6, h: 2.3 }], // living → kitchen
    ['door', 6.2, 5.0, { w: 1.8, h: 2.2 }], // living → courtyard (glazed)
    ['door', 4.4, 9.3, { w: 1.6, h: 2.2 }], // west corridor → courtyard (glazed)
    ['door', 9.6, 9.3, { w: 1.6, h: 2.2 }], // east corridor → courtyard (glazed)
    ['door', 3.2, 6.7], // → bedroom 2
    ['door', 3.2, 9.3, { w: 0.8 }], // → family bath
    ['door', 3.2, 11.9], // → bedroom 3
    ['door', 10.8, 7.3], // → master
    ['door', 12.4, 9.6, { w: 0.8 }], // master → en-suite
    ['door', 10.8, 12.5], // → study
    ['window', 6.0, 0, { w: 2.0, h: 1.6, sill: 0.6 }],
    ['window', 0, 2.5, { w: 1.4, h: 1.4, sill: 0.8 }],
    ['window', 11.0, 0, { w: 1.4, h: 1.0, sill: 1.1 }],
    ['window', 14.0, 2.5, { w: 1.2, h: 1.2, sill: 1.0 }],
    ['window', 0, 6.7, { w: 1.4, h: 1.4, sill: 0.8 }],
    ['window', 0, 9.3, { w: 0.7, h: 0.6, sill: 1.5 }],
    ['window', 0, 11.9, { w: 1.2, h: 1.4, sill: 0.8 }],
    ['window', 1.6, 13.6, { w: 1.2, h: 1.4, sill: 0.8 }],
    ['window', 14.0, 6.0, { w: 1.0, h: 1.4, sill: 0.8 }],
    ['window', 14.0, 10.5, { w: 0.7, h: 0.6, sill: 1.5 }],
    ['window', 14.0, 12.5, { w: 1.0, h: 1.3, sill: 0.9 }],
    ['window', 12.4, 13.6, { w: 1.2, h: 1.3, sill: 0.9 }],
    ['window', 3.8, 13.6, { w: 0.8, h: 1.6, sill: 0.4 }], // west corridor end
    ['window', 10.2, 13.6, { w: 0.8, h: 1.6, sill: 0.4 }], // east corridor end
  ],
  items: [
    // living & dining
    ['sofa-arlo', 2.4, 1.0, 0, 'oatmeal'],
    ['table-coffee-lattice', 2.4, 2.4],
    ['chair-ming', 0.9, 2.6, 90],
    ['rug-wool', 2.4, 2.4, 0, 'clay'],
    ['table-dining-rect', 6.2, 2.3, 0, 'walnut'],
    ['chair-painted-white', 5.6, 1.6],
    ['chair-painted-white', 6.8, 1.6],
    ['chair-painted-white', 5.6, 3.0, 180],
    ['chair-painted-white', 6.8, 3.0, 180],
    ['lamp-chandelier', 6.2, 2.3],
    ['cabinet-hutch', 6.2, 0.5],
    ['fan-ceiling', 2.4, 2.4],
    ['vase-blue-white', 6.4, 2.3],
    // kitchen
    ['kitchen-run', 11.0, 0.4, 0, 'walnut-terrazzo'],
    ['kitchen-island', 11.0, 2.8, 0, 'walnut-terrazzo'],
    ['stool-bar-round', 10.5, 3.6],
    ['stool-bar-round', 11.5, 3.6],
    ['fridge-steel', 13.5, 3.9, -90],
    // corridors
    ['plant-bonsai-bowl', 10.4, 6.0],
    ['art-photo-landscape', 3.35, 12.6],
    // bedroom 2
    ['bed-double', 1.2, 6.4, 90, 'stone'],
    ['wardrobe', 2.1, 8.02, 180, 'oak'],
    ['nightstand-painted', 0.42, 7.55],
    // family bath
    ['bath', 1.2, 9.3, 0],
    ['vanity', 2.55, 9.95, 0, 'white'],
    ['wc', 2.85, 8.75],
    // bedroom 3
    ['bed-single', 0.75, 12.0, 0, 'clay'],
    ['desk', 2.2, 13.13, 180, 'white'],
    ['chair-painted-white', 2.2, 12.55],
    // master
    ['bed-king', 12.4, 6.25, 0, 'ivory'],
    ['nightstand-classic', 11.2, 5.4],
    ['nightstand-classic', 13.56, 5.4],
    ['wardrobe-3door', 13.57, 8.6, -90, 'walnut'],
    // en-suite
    ['shower', 13.3, 10.5],
    ['vanity', 11.4, 11.1, 0, 'walnut'],
    ['mirror-rect', 11.4, 11.3],
    ['wc', 11.0, 10.0],
    // study
    ['desk', 12.4, 13.13, 180, 'walnut'],
    ['chair-arm', 12.4, 12.4],
    ['shelves-cube', 13.2, 11.66, 0],
    // courtyard
    ['garden-pachira', 7.0, 9.3],
    ['garden-fern', 5.2, 12.8],
    ['garden-anthurium', 8.8, 12.8],
    ['outdoor-bistro-set', 7.0, 6.4, 90],
    ['planter-crate', 5.1, 6.0],
  ],
}
