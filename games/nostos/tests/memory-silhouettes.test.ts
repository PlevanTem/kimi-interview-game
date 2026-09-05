import { describe, expect, it } from 'vitest';
import {
  MEMORY_MOTIF_KINDS,
  MEMORY_MOTIF_URLS,
  memoryMotifTexture,
} from '../src/world/memory-silhouettes';
import { MOTIF_KINDS } from '../src/world/silhouette';

describe('memory silhouette assets', () => {
  it('maps every procedural motif kind to one file asset', () => {
    expect(MEMORY_MOTIF_KINDS).toEqual(MOTIF_KINDS);
    expect(Object.keys(MEMORY_MOTIF_URLS)).toEqual(MOTIF_KINDS);
    expect(Object.values(MEMORY_MOTIF_URLS)).toHaveLength(16);
    for (const url of Object.values(MEMORY_MOTIF_URLS)) expect(url).toMatch(/\.png$/);
  });

  it('fails clearly if a vision is built before preload completes', () => {
    expect(() => memoryMotifTexture('galley')).toThrow(/before preloadMemoryMotifs/);
  });
});
