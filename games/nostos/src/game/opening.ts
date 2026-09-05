/** 开场的镜头与节奏。所有时间以游戏时钟计，暂停时不会偷跑。 */
export const OPENING = {
  duration: 15,
  title: { x: -3.8, z: 9.8, yaw: 0.30, pitch: -0.025 },
  landing: { x: -1.1, z: 7.25, yaw: 0.32, pitch: -0.27 },
} as const;

export type OpeningPose = { x: number; z: number; yaw: number; pitch: number };
export function openingPose(from: OpeningPose, progress: number): OpeningPose {
  const t = Math.max(0, Math.min(1, progress));
  const e = t * t * t * (t * (t * 6 - 15) + 10);
  const to = OPENING.landing;
  return {
    x: from.x + (to.x - from.x) * e,
    z: from.z + (to.z - from.z) * e,
    yaw: from.yaw + (to.yaw - from.yaw) * e,
    pitch: from.pitch + (to.pitch - from.pitch) * e,
  };
}
