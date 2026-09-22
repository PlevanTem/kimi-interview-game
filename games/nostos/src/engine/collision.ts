/** Circle and capsule obstacles use the same clearance convention. */
export interface CollisionShape { x: number; z: number; radius: number; endX?: number; endZ?: number }

export function isBlocked(x: number, z: number, b: CollisionShape): boolean {
  const dx = (b.endX ?? b.x) - b.x;
  const dz = (b.endZ ?? b.z) - b.z;
  const lengthSq = dx * dx + dz * dz;
  const t = lengthSq > 0 ? Math.max(0, Math.min(1, ((x - b.x) * dx + (z - b.z) * dz) / lengthSq)) : 0;
  return (x - b.x - t * dx) ** 2 + (z - b.z - t * dz) ** 2 < b.radius ** 2;
}
