import { describe, expect, it } from 'vitest';
import { cyclops } from '../src/game/scenes/cyclops';
import { TEXT } from '../src/content/script';
import { CRUMBLE_SECONDS } from '../src/game/vision';

const beats = cyclops.def.vision.beats;
const visible = (time: number) => beats.filter((b) => b.motif && b.at < time &&
  time < (b.motif.crumbleAt ?? cyclops.def.vision.duration - CRUMBLE_SECONDS) + CRUMBLE_SECONDS);

describe('独眼回忆的小剧场编排', () => {
  it('保留全部十三句与84秒叙事，不增加新母题文件', () => {
    expect(beats.filter((b) => b.line).map((b) => b.line)).toEqual(TEXT.cyclops.vision);
    expect(cyclops.def.vision.duration).toBe(84);
  });
  it('每个段落先退旧景，绝不累积成黑色遮挡墙', () => {
    for (let t = 0; t < 84; t += 0.1) expect(visible(t).length, `t=${t}`).toBeLessThanOrEqual(2);
    for (const [t, kinds] of [[31, ['hand']], [42, ['flock']], [56, ['galley', 'standing']],
      [66, ['eye']], [76, ['wave']]] as const) {
      expect(visible(t).map((b) => b.motif!.kind)).toEqual(kinds);
    }
    for (const b of beats.filter((b) => b.motif?.crumbleAt !== undefined)) {
      expect(b.motif!.crumbleAt!).toBeGreaterThan(b.at + (b.motif!.grow ?? 1.6));
    }
  });
  it('火与独眼、船与人留有投影负形，不依赖透明底碰巧露出', () => {
    for (const t of [21, 56]) {
      const boxes = visible(t).map((b) => {
        const m = b.motif!, distance = 2.3 - m.z;
        return { left: (m.x - m.size / 2) / distance, right: (m.x + m.size / 2) / distance };
      }).sort((a, b) => a.left - b.left);
      expect(boxes).toHaveLength(2);
      expect(boxes[1]!.left - boxes[0]!.right).toBeGreaterThan(0.015);
    }
  });
});
