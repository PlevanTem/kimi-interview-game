export type QualityLevel = 'low' | 'medium' | 'high';

export interface QualityPreset {
  readonly level: QualityLevel;
  readonly maxPixelRatio: number;
  readonly minScale: number;
  readonly shadowSize: number;
  readonly halation: boolean;
  readonly targetFrameMs: number;
  readonly environmentDensity: number;
}

export const QUALITY_PRESETS: Readonly<Record<QualityLevel, QualityPreset>> = {
  low: { level: 'low', maxPixelRatio: 1, minScale: 0.65, shadowSize: 512, halation: false, targetFrameMs: 1000 / 30, environmentDensity: 0.45 },
  medium: { level: 'medium', maxPixelRatio: 1.25, minScale: 0.7, shadowSize: 1024, halation: true, targetFrameMs: 1000 / 30, environmentDensity: 0.7 },
  high: { level: 'high', maxPixelRatio: 1.5, minScale: 0.75, shadowSize: 2048, halation: true, targetFrameMs: 1000 / 60, environmentDensity: 1 },
};

/** Explicit URL selection wins. No browser globals are required by tests/tools. */
export function resolveQuality(search = typeof location === 'undefined' ? '' : location.search,
  mobile = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches): QualityPreset {
  const requested = new URLSearchParams(search).get('quality');
  return QUALITY_PRESETS[requested === 'low' || requested === 'medium' || requested === 'high'
    ? requested : mobile ? 'low' : 'high'];
}

/** RAF cadence, not GPU time. Windows avoid reallocations on isolated stalls. */
export class ResolutionController {
  scale = 1;
  private elapsed = 0;
  private count = 0;
  private fastWindows = 0;
  constructor(readonly preset: QualityPreset) {}

  sample(frameMs: number): boolean {
    // Background/tab resume/loading outliers must not drive resolution changes.
    if (!Number.isFinite(frameMs) || frameMs <= 0 || frameMs > 250) {
      this.elapsed = 0; this.count = 0; this.fastWindows = 0;
      return false;
    }
    this.elapsed += frameMs;
    this.count++;
    if (this.elapsed < 3000 || this.count < 45) return false;
    const average = this.elapsed / this.count;
    this.elapsed = 0; this.count = 0;
    const old = this.scale;
    if (average > this.preset.targetFrameMs * 1.12) {
      this.scale = Math.max(this.preset.minScale, Math.round((this.scale - 0.1) * 100) / 100);
      this.fastWindows = 0;
    } else if (average < this.preset.targetFrameMs * 0.82) {
      // Recovery needs at least nine seconds of spare headroom.
      if (++this.fastWindows >= 3) {
        this.scale = Math.min(1, Math.round((this.scale + 0.05) * 100) / 100);
        this.fastWindows = 0;
      }
    } else this.fastWindows = 0;
    return this.scale !== old;
  }
}
