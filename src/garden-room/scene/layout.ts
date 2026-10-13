/** Room dimensions and furniture anchors, in metres. +Y up, the open (camera) side is +Z. */
export const ROOM = {
  width: 5.8,
  depth: 4.8,
  height: 2.8,
  get minX() { return -this.width / 2 },
  get maxX() { return this.width / 2 },
  get backZ() { return -this.depth / 2 },
  get frontZ() { return this.depth / 2 },
}

/** Floor-to-ceiling glazing in the left wall. */
export const WINDOW = { z0: -1.45, z1: 1.15, top: 2.45 }

export const ANCHORS = {
  sofa: { x: 0, z: ROOM.backZ + 0.08 },
  coffeeTable: { x: -0.1, z: -0.6 },
  rug: { x: -0.1, z: -0.78 },
}
