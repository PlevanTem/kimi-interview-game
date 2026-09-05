import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { ACTS } from '../src/game/scenes';
import { Dresser } from '../src/game/scenes/dresser';
import type { PlaceOptions, SurfaceName } from '../src/game/scenes/dresser';
import type { Terrain } from '../src/world/terrain';

/**
 * 交互点必须在世界里真的有东西。
 *
 * 这是环境叙事作品里最难自己发现的一类 bug：一个交互点有 id、有提示语、
 * 有写好的旁白，数据契约全部成立，单元测试全绿——但**世界里没有对应的物件**。
 * 玩家走过去，准星张开，提示写着"看脚印"，地上却什么都没有，
 * 旁白在描述一件不存在的东西。
 *
 * 忘食岸的「看脚印」就是这样漏掉的：交互点和三句旁白都写好了，
 * 沙地上却从来没有画过脚印。做完整周目的 e2e 也抓不到它——
 * 触碰照样成功，旁白照样播完，只有人眼看得出地上是空的。
 */

/**
 * 跑一幕的 dress()，返回作者**明确摆放**的构件位置。
 *
 * 两处刻意的偏离：
 * 1. 不构造真的 Terrain——它的构造函数会建材质、材质要 Canvas2D，Node 里没有。
 *    Dresser 只用到 heightAt / slopeAt，给个平地桩就够，而我们只量水平距离。
 * 2. **scatter 直接跳过。** 散落的碎石是背景，不是旁白在描述的那件东西；
 *    让它参与统计的话，一块随机落点的石头就可能盖住一个真正的孤儿，
 *    这条测试会变成假绿。
 */
interface Placement {
  x: number;
  z: number;
  /** 水平外接半径：量距离要量到这件东西的边缘，不是它的中心 */
  r: number;
}

function authoredPlacements(act: (typeof ACTS)[number]): Placement[] {
  const flatGround = {
    heightAt: () => 1,
    slopeAt: () => 0,
  } as unknown as Terrain;

  const dresser = new Dresser(new THREE.Scene(), flatGround, act.terrain.seed);
  const placed: Placement[] = [];

  const patched = dresser as unknown as {
    place: (g: THREE.BufferGeometry, s: SurfaceName, o: PlaceOptions) => void;
    scatter: (...args: unknown[]) => void;
  };
  patched.place = (g, _s, o) => {
    // 量到边缘而不是中心：一块铺在地上的大石板能盖住交互点，
    // 但它的中心可能在好几米以外。只看中心会把它误判成孤儿。
    g.computeBoundingBox();
    const box = g.boundingBox;
    let r = 0;
    if (box) {
      const scale = typeof o.scale === 'number' ? o.scale : 1;
      r = Math.max(box.max.x - box.min.x, box.max.z - box.min.z) * 0.5 * scale;
    }
    placed.push({ x: o.x, z: o.z, r });
  };
  patched.scatter = () => {};

  act.dress(dresser);
  return placed;
}

/**
 * 明确**不需要**"身边有一件东西"的交互点。每一条都要写清为什么。
 *
 * 这张表是有意做成白名单而不是放宽阈值的：放宽阈值会让整条测试慢慢失效，
 * 而往这里加一行，需要先说出理由。
 */
const DELIBERATE: Record<string, string> = {
  // 22 块巨石围成半径 7.5 m 的一圈，玩家站在羊栏正中间——是被围着，不是没有东西
  'cyclops.pen': '交互点在羊栏中心，石头在四周一圈',
  // 20 个树桩绕着交互点排开，「数树桩」本来就是站在中间数
  'calypso.stumps': '交互点在树桩阵中心，树桩在四周',
  // 这条线索描述的就是"什么都没有"：回头看，连自己的脚印都没有。
  // 给它摆上东西，反而把这一幕的意思写反了。
  'nekyia.sand': '旁白描述的是空无一物本身',
};

describe('每个交互点在世界里都要有实物', () => {
  /**
   * 触发半径默认 2.4 米。构件中心落在这个范围外一点是正常的
   * （旁白描述的可能是一组东西，中心偏出去半米），但远到 3 米以外，
   * 就意味着玩家站在交互点上什么也看不见。
   */
  const MAX_DISTANCE = 3;

  it('白名单里的 id 都还存在——它不能变成一张僵尸清单', () => {
    const all = new Set(ACTS.flatMap(({ def }) => def.interactables.map((i) => i.id)));
    for (const id of Object.keys(DELIBERATE)) {
      expect(all.has(id), `白名单里的 ${id} 已经不在任何一幕里了，该删掉这一行`).toBe(true);
    }
  });

  for (const act of ACTS) {
    it(`${act.def.title}：没有孤儿交互点`, () => {
      const placed = authoredPlacements(act);
      expect(placed.length, `${act.def.id} 的 dress() 没有摆放任何东西`).toBeGreaterThan(0);

      // 地形本身也可以是"那件东西"：亡者之岸的「看那个坑」，
      // 坑是挖在高度场里的一个 basin，不是摆上去的构件。
      const features = [...(act.terrain.basins ?? []), ...(act.terrain.plateaus ?? [])];

      for (const item of act.def.interactables) {
        if (DELIBERATE[item.id]) continue;
        let nearest = Infinity;
        for (const p of placed) {
          const d = Math.max(0, Math.hypot(p.x - item.x, p.z - item.z) - p.r);
          if (d < nearest) nearest = d;
        }
        for (const f of features) {
          const d = Math.max(0, Math.hypot(f.x - item.x, f.z - item.z) - f.radius);
          if (d < nearest) nearest = d;
        }
        expect(
          nearest,
          `${item.id}（${item.prompt}）最近的构件 / 地形特征在 ${nearest.toFixed(1)} m 外——` +
            '玩家站在这里看不见任何东西，旁白在描述一件不存在的物件',
        ).toBeLessThanOrEqual(MAX_DISTANCE);
      }
    });
  }
});
