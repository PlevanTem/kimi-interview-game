import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { ACTS } from '../src/game/scenes';
import { Dresser } from '../src/game/scenes/dresser';
import type { PlaceOptions, SurfaceName } from '../src/game/scenes/dresser';
import { Terrain } from '../src/world/terrain';

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
 * 1. 不调用 Terrain 构造函数（会创建 Canvas2D 材质）；复用它的真实高度采样方法。
 *    几何按 Dresser 的完整位姿变换，再检查表面距离与露出地表的高度。
 * 2. **scatter 直接跳过。** 散落的碎石是背景，不是旁白在描述的那件东西；
 *    让它参与统计的话，一块随机落点的石头就可能盖住一个真正的孤儿，
 *    这条测试会变成假绿。
 */
interface Placement {
  triangles: THREE.Triangle[];
  /** 露出地面多高。<= 0 表示整件埋在地下，游戏里根本看不见 */
  above: number;
  /** 出问题时好认是谁 */
  label: string;
}

function authoredPlacements(act: (typeof ACTS)[number]): Placement[] {
  const flatGround = Object.assign(Object.create(Terrain.prototype) as Terrain,{params:{waterLevel:0,...act.terrain}});

  const dresser = new Dresser(new THREE.Scene(), flatGround, act.terrain.seed);
  const placed: Placement[] = [];

  const patched = dresser as unknown as {
    place: (g: THREE.BufferGeometry, s: SurfaceName, o: PlaceOptions) => void;
    scatter: (...args: unknown[]) => void;
  };
  patched.place = (g, surface, o) => {
    // Match Dresser's actual transform. A composite asset can have an origin
    // far from its surfaces; neither pivot radius nor a huge AABB proves proximity.
    const scale=o.scale??1,s=typeof scale==='number'?new THREE.Vector3(scale,scale,scale):new THREE.Vector3(...scale);
    const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(o.tiltX??0,o.yaw??0,o.tiltZ??0,'YXZ'));
    g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(o.x,(o.y??flatGround.heightAt(o.x,o.z))+(o.lift??0),o.z),q,s));
    const p=g.getAttribute('position'),vertices:THREE.Vector3[]=[],triangles:THREE.Triangle[]=[];
    let above=-Infinity;
    for(let i=0;i<p.count;i++){
      above=Math.max(above,p.getY(i)-flatGround.heightAt(p.getX(i),p.getZ(i)));
      vertices.push(new THREE.Vector3(p.getX(i),0,p.getZ(i)));
    }
    const indices=g.index;const count=indices?.count??p.count;
    for(let i=0;i<count;i+=3)triangles.push(new THREE.Triangle(vertices[indices?.getX(i)??i]!,vertices[indices?.getX(i+1)??i+1]!,vertices[indices?.getX(i+2)??i+2]!));
    placed.push({triangles,above,label:`${surface} @ (${o.x}, ${o.z})`});g.dispose();
  };
  patched.scatter = () => {};
  // attach 会真的去建网格与贴图（Canvas2D），Node 里跑不了。
  // 它挂的东西不参与"孤儿"判定，跳过是安全的。
  (dresser as unknown as { attach: () => void }).attach = () => {};

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

  /**
   * 独眼岬那面青铜盾就是这么丢的：x / z 都对，错在 Y——
   * 盾面半高 15 厘米，装配时 lift 却给到 -0.6，整面盾沉在地下 45 厘米。
   * 交互点照样对得上焦，旁白照样念完，画面上什么都没有。
   *
   * 阈值不划在 0：与地面齐平是正当的做法（雕像底座就刻意做平，
   * 侵蚀之后顶面在 ±1 厘米之间浮动），半埋也是正当的
   * （「半埋的桨，只露出一截」）。**全埋**才是 bug，而那一类错得都很离谱——
   * 那面盾差了 45 厘米。所以线划在"沉下去超过 5 厘米"。
   */
  it('没有整件埋在地下的构件', () => {
    for (const act of ACTS) {
      for (const p of authoredPlacements(act)) {
        expect(
          p.above,
          `${act.def.id}：${p.label} 的最高点在地面下 ${(-p.above).toFixed(2)} m，游戏里看不见`,
        ).toBeGreaterThan(-0.05);
      }
    }
  });

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
        const point=new THREE.Vector3(item.x,0,item.z),closest=new THREE.Vector3();
        for (const p of placed) {
          for(const triangle of p.triangles){
            // Vertical faces project to a segment (zero-area triangle).
            if(triangle.getArea()>1e-10){triangle.closestPointToPoint(point,closest);nearest=Math.min(nearest,closest.distanceTo(point));}
            else for(const [a,b] of [[triangle.a,triangle.b],[triangle.b,triangle.c],[triangle.c,triangle.a]]){
              const dx=b!.x-a!.x,dz=b!.z-a!.z,len=dx*dx+dz*dz;
              const t=len?Math.max(0,Math.min(1,((point.x-a!.x)*dx+(point.z-a!.z)*dz)/len)):0;
              nearest=Math.min(nearest,Math.hypot(point.x-a!.x-t*dx,point.z-a!.z-t*dz));
            }
          }
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
