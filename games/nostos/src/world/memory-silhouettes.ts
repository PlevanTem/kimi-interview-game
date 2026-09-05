import * as THREE from 'three';
import { MOTIF_KINDS, type MotifKind } from './silhouette';

/**
 * 回忆专用的文件纹理。
 *
 * 世界 NPC 仍由 silhouette.ts 的 Canvas2D 管线生成；只有 VisionStage
 * 会从这里取图，因此替换视觉资产不会改变碰撞、脚底偏移或场景 NPC。
 */
export const MEMORY_MOTIF_URLS: Record<MotifKind, string> = {
  galley: new URL('../../assets/memory-motifs/galley.png', import.meta.url).href,
  rower: new URL('../../assets/memory-motifs/rower.png', import.meta.url).href,
  standing: new URL('../../assets/memory-motifs/standing.png', import.meta.url).href,
  reaching: new URL('../../assets/memory-motifs/reaching.png', import.meta.url).href,
  bound: new URL('../../assets/memory-motifs/bound.png', import.meta.url).href,
  kneeling: new URL('../../assets/memory-motifs/kneeling.png', import.meta.url).href,
  eye: new URL('../../assets/memory-motifs/eye.png', import.meta.url).href,
  hand: new URL('../../assets/memory-motifs/hand.png', import.meta.url).href,
  siren: new URL('../../assets/memory-motifs/siren.png', import.meta.url).href,
  loom: new URL('../../assets/memory-motifs/loom.png', import.meta.url).href,
  flock: new URL('../../assets/memory-motifs/flock.png', import.meta.url).href,
  shades: new URL('../../assets/memory-motifs/shades.png', import.meta.url).href,
  wreath: new URL('../../assets/memory-motifs/wreath.png', import.meta.url).href,
  threshold: new URL('../../assets/memory-motifs/threshold.png', import.meta.url).href,
  wave: new URL('../../assets/memory-motifs/wave.png', import.meta.url).href,
  flame: new URL('../../assets/memory-motifs/flame.png', import.meta.url).href,
};

export const MEMORY_MOTIF_KINDS = [...MOTIF_KINDS];

const cache = new Map<MotifKind, THREE.Texture>();
let preloadPromise: Promise<void> | null = null;

function configure(texture: THREE.Texture): THREE.Texture {
  texture.colorSpace = THREE.NoColorSpace;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

/** 在同步创建 Game 之前一次性并行加载；失败时不混用半套素材。 */
export function preloadMemoryMotifs(): Promise<void> {
  if (cache.size === MOTIF_KINDS.length) return Promise.resolve();
  if (preloadPromise) return preloadPromise;

  preloadPromise = (async () => {
    const loader = new THREE.TextureLoader();
    const results = await Promise.allSettled(
      MOTIF_KINDS.map(async (kind) => ({
        kind,
        texture: configure(await loader.loadAsync(MEMORY_MOTIF_URLS[kind])),
      })),
    );
    const failures = results.filter((result) => result.status === 'rejected');
    if (failures.length > 0) {
      for (const result of results) {
        if (result.status === 'fulfilled') result.value.texture.dispose();
      }
      throw new Error(`Failed to preload ${failures.length} memory motif texture(s)`, {
        cause: failures[0]!.reason,
      });
    }
    for (const result of results) {
      if (result.status === 'fulfilled') cache.set(result.value.kind, result.value.texture);
    }
  })().catch((error: unknown) => {
    preloadPromise = null;
    throw error;
  });

  return preloadPromise;
}

/** VisionStage 的同步构造路径只在预加载完成后调用这里。 */
export function memoryMotifTexture(kind: MotifKind): THREE.Texture {
  const texture = cache.get(kind);
  if (!texture) {
    throw new Error(`Memory motif "${kind}" requested before preloadMemoryMotifs() completed`);
  }
  return texture;
}

export function disposeMemoryMotifs(): void {
  for (const texture of cache.values()) texture.dispose();
  cache.clear();
  preloadPromise = null;
}
