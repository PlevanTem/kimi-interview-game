import type { VisionDef } from './types';

/** Preserve authored timing/text but establish a readable gallery from the eye, not a terrain datum. */
export function frameLateMemory(def: VisionDef): VisionDef {
  return { ...def, beats: def.beats.map((beat, i) => {
    const next = def.beats.slice(i + 1).find(b => b.motif);
    return { ...beat,
      camera: beat.camera ? { ...beat.camera, yaw: (beat.camera.yaw ?? 0) * .25,
        pitch: (beat.camera.pitch ?? 0) * .25, fov: Math.max(-3, beat.camera.fov ?? 0) } : undefined,
      motif: beat.motif ? { ...beat.motif, x: beat.motif.x * .35, y: (beat.motif.y - 3) * .3,
        z: -Math.max(26, Math.abs(beat.motif.z) * 1.7),
        size: Math.min(Math.max(beat.motif.size * 1.2, 11.5), 13),
        crumbleAt: next ? next.at - .4 : def.duration - 2.6 } : undefined,
    };
  }) };
}
export const HOMECOMING_SECONDS = 18;
export function homecomingPose(time: number, reducedMotion = false) {
  const t=Math.max(0,Math.min(1,time/HOMECOMING_SECONDS)), k=t*t*(3-2*t);
  return {x:0,z:reducedMotion ? -6 : 3-17*k,yaw:0,pitch:reducedMotion ? .12 : .32*(1-k)-.02*k,
    fade: Math.max(0,(t-.88)/.12), done:t>=1};
}
