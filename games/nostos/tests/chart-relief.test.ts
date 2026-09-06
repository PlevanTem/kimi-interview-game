import { describe, expect, it } from 'vitest';
import { CHART } from '../src/ui/chart/atlas';
import { PLINTH_RADIUS, RELIEF_EXAGGERATION, chartScale } from '../src/ui/chart/geometry';
import { terrainHeight } from '../src/world/terrain';

/**
 * 这组测试守的是一件很容易悄悄坏掉的事：**章不能是一块饼**。
 *
 * 八座岛的平均坡度只有六度左右，任何一次"顺手把夸张倍数调回 1"
 * 或者改动地形参数，都会让浮雕在视觉上消失，而截图测试未必抓得到——
 * 一块饼和一座缓丘在缩略图上长得很像。所以这里直接量高度。
 */
describe('航程海图 · 浮雕', () => {
  const peakOf = (island: (typeof CHART)[number]): number => {
    let peak = 0;
    for (let i = 0; i <= 20; i += 1) {
      for (let j = 0; j < 24; j += 1) {
        const r = (i / 20) * island.terrain.radius;
        const a = (j / 24) * Math.PI * 2;
        peak = Math.max(peak, terrainHeight(island.terrain, Math.cos(a) * r, Math.sin(a) * r));
      }
    }
    return peak;
  };

  it('每一枚章在图上都有可见的起伏，不是一块饼', () => {
    for (const island of CHART) {
      const rise = peakOf(island) * chartScale(island) * RELIEF_EXAGGERATION;
      const radius = island.terrain.radius * 1.16 * chartScale(island);
      // 起伏至少要有章半径的 15%，否则在面板里读不出形体
      expect(rise / radius, island.id).toBeGreaterThan(0.15);
    }
  });

  it('八枚共用一个夸张倍数，岛与岛的高低关系不被改写', () => {
    const rises = CHART.map((island) => ({ id: island.id, rise: peakOf(island) * chartScale(island) }));
    const highest = rises.reduce((a, b) => (a.rise > b.rise ? a : b));
    const lowest = rises.reduce((a, b) => (a.rise < b.rise ? a : b));
    // 独眼岬是全作最高的一幕，亡者之岸是最平的——章上必须还是这样
    expect(highest.id).toBe('cyclops');
    expect(lowest.id).toBe('nekyia');
  });

  it('章的石料立面不该盖过岛自身的起伏', () => {
    // 立面比最平那枚章的起伏还高的话，八枚一律读成"圆饼 + 一圈厚边"
    const flattest = Math.min(
      ...CHART.map((island) => peakOf(island) * chartScale(island) * RELIEF_EXAGGERATION),
    );
    expect(flattest).toBeGreaterThan(0.11);
    expect(PLINTH_RADIUS).toBeGreaterThan(0.3);
  });
});
