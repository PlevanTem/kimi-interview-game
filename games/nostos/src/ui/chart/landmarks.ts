import * as THREE from 'three';
import { PIGMENT } from '../../content/palette';
import { createRng } from '../../engine/noise';
import type { Landmark, LandmarkKind } from './atlas';

/**
 * 章上的地标构件。
 *
 * 这些**不是剪影贴片**：每一件都是有厚度的几何，光打上去有自己的明暗面，
 * 章转过一点角度能看见它们的侧面与投影。理由很直接——一枚章要在
 * 一百多像素宽的范围里让人认出"这是独眼岬"，靠的是形体，不是轮廓；
 * 八张黑色剪影排开来，读出来是八块一样的墨迹。
 *
 * 三条规矩：
 *
 * 1. **只做认得出这座岛的那两到四件**。章是记忆，不是缩微模型：
 *    玩家想起忘食岸，想起的是果树和那一行只有去程的脚印，
 *    不是岛上一共有多少块卵石。
 * 2. **位置照抄各幕 `dress()`**。洞口在 (0, -30)，因为岛上它就在那儿。
 * 3. **尺寸夸张，形体不变形**。地标按 1.6–2.4 倍放大（`Landmark.scale`），
 *    但只等比放大，不做竖向拉伸——地形做竖向夸张，地标不做，
 *    否则一根柱子会变成一根针。
 */

/** 章上用到的几种"颜料"。全部取自 palette 的壁画色系，不新增色值。 */
const INK = {
  stone: PIGMENT.plaster,
  paleStone: PIGMENT.bone,
  darkStone: 0x4a4239,
  wood: 0x7a5a38,
  burnt: PIGMENT.blackFigure,
  bronze: PIGMENT.verdigris,
  clay: PIGMENT.terracotta,
  leaf: 0x5f7a5e,
  bone: PIGMENT.ash,
  gold: PIGMENT.duskGold,
  water: PIGMENT.aegean,
} as const;

/**
 * 几何累加器。
 *
 * 一座岛上十几件地标最终合成**一个** BufferGeometry：八枚章加起来
 * 只有 16 个 draw call（浮雕 8 + 地标 8）。颜色进顶点色，所以全图共用
 * 同一个材质——暂停面板不该为了一张图去开十几个材质。
 */
class Carver {
  private readonly positions: number[] = [];
  private readonly colors: number[] = [];
  private readonly tint = new THREE.Color();

  add(geometry: THREE.BufferGeometry, color: number, matrix: THREE.Matrix4, shade = 1): void {
    const source = geometry.index ? geometry.toNonIndexed() : geometry;
    const attribute = source.getAttribute('position') as THREE.BufferAttribute;
    const v = new THREE.Vector3();
    this.tint.setHex(color).multiplyScalar(shade);
    for (let i = 0; i < attribute.count; i += 1) {
      v.fromBufferAttribute(attribute, i).applyMatrix4(matrix);
      this.positions.push(v.x, v.y, v.z);
      this.colors.push(this.tint.r, this.tint.g, this.tint.b);
    }
    if (source !== geometry) source.dispose();
    geometry.dispose();
  }

  /** 把另一个累加器的成果整体搬过来：保留它自己的顶点色，只做一次变换。 */
  merge(geometry: THREE.BufferGeometry, matrix: THREE.Matrix4): void {
    const position = geometry.getAttribute('position') as THREE.BufferAttribute;
    const color = geometry.getAttribute('color') as THREE.BufferAttribute;
    const v = new THREE.Vector3();
    for (let i = 0; i < position.count; i += 1) {
      v.fromBufferAttribute(position, i).applyMatrix4(matrix);
      this.positions.push(v.x, v.y, v.z);
      this.colors.push(color.getX(i), color.getY(i), color.getZ(i));
    }
    geometry.dispose();
  }

  get empty(): boolean {
    return this.positions.length === 0;
  }

  build(): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(this.positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(this.colors, 3));
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    return geometry;
  }
}

interface Place {
  x?: number;
  y?: number;
  z?: number;
  yaw?: number;
  tilt?: number;
  roll?: number;
  scale?: number | [number, number, number];
}

const M = new THREE.Matrix4();
const Q = new THREE.Quaternion();
const E = new THREE.Euler();
const V = new THREE.Vector3();
const S = new THREE.Vector3();

function mat(place: Place): THREE.Matrix4 {
  E.set(place.tilt ?? 0, place.yaw ?? 0, place.roll ?? 0, 'YXZ');
  Q.setFromEuler(E);
  V.set(place.x ?? 0, place.y ?? 0, place.z ?? 0);
  const s = place.scale ?? 1;
  if (typeof s === 'number') S.set(s, s, s);
  else S.set(s[0], s[1], s[2]);
  return M.compose(V, Q, S).clone();
}

const box = (w: number, h: number, d: number): THREE.BufferGeometry =>
  new THREE.BoxGeometry(w, h, d).translate(0, h / 2, 0);
const cyl = (rTop: number, rBottom: number, h: number, seg = 8): THREE.BufferGeometry =>
  new THREE.CylinderGeometry(rTop, rBottom, h, seg).translate(0, h / 2, 0);
const cone = (r: number, h: number, seg = 7): THREE.BufferGeometry =>
  new THREE.ConeGeometry(r, h, seg).translate(0, h / 2, 0);
const rock = (r: number): THREE.BufferGeometry => new THREE.IcosahedronGeometry(r, 0);
/** 一段弧：肋骨、船肋、翻出来的土圈都用它 */
const arc = (radius: number, tube: number, sweep: number): THREE.BufferGeometry =>
  new THREE.TorusGeometry(radius, tube, 4, 10, sweep);

// ─────────────────────────────────────────── 逐件构件

type Builder = (carver: Carver, item: Landmark, rng: () => number) => void;

const BUILDERS: Record<LandmarkKind, Builder> = {
  /** 散架的木筏：他十年来的全部家当，五块板交错倒在沙上 */
  raft(c, _item, rng) {
    for (let i = 0; i < 5; i += 1) {
      c.add(box(3.6 + rng() * 1.4, 0.16, 0.42), INK.wood, mat({
        x: (rng() - 0.5) * 1.8,
        z: (rng() - 0.5) * 2.4,
        yaw: rng() * Math.PI,
        tilt: (rng() - 0.5) * 0.18,
      }), 0.8 + rng() * 0.3);
    }
    // 还系着的一段绳
    c.add(cyl(0.07, 0.07, 1.4, 5), INK.stone, mat({ x: 0.4, y: 0.1, z: 0.5, tilt: Math.PI / 2, yaw: 0.7 }), 0.9);
  },

  /** 断桨：核心记忆。斜插在沙里，桨叶朝天——他没有把它埋掉 */
  brokenOar(c, item) {
    c.add(cyl(0.09, 0.13, 2.6, 6), INK.wood, mat({ tilt: 0.42, yaw: item.yaw ?? 0 }));
    c.add(box(0.5, 1.1, 0.09), INK.wood, mat({
      x: Math.sin(item.yaw ?? 0) * 1.0,
      y: 2.35,
      z: Math.cos(item.yaw ?? 0) * 1.0,
      tilt: 0.42,
      yaw: item.yaw ?? 0,
    }), 0.85);
  },

  /**
   * 果树：树干 + 树冠两件套。
   *
   * `ART_BIBLE` 第七节有一条硬规矩：树永远是两件套，且冠底必须让开人的头顶。
   * 章上没有人会撞头，但形体规矩要一致——一棵冠贴着地的树，
   * 缩到章上就是一个蘑菇，认不出是果树。
   */
  fruitTree(c, _item, rng) {
    c.add(cyl(0.16, 0.26, 2.4, 6), INK.wood, mat({ yaw: rng() * 3 }), 0.9);
    c.add(rock(1.35), INK.leaf, mat({ y: 3.1, scale: [1.15, 0.62, 1.15], yaw: rng() * 3 }), 0.95);
    c.add(rock(0.9), INK.leaf, mat({ x: 0.6, y: 2.6, z: -0.4, scale: [1, 0.55, 1] }), 0.8);
  },

  /**
   * 一行脚印。
   *
   * 这一幕的整个论点是"上岛的人都还在岛上"，所以**只铺去程**，
   * 左右交替、微微蜿蜒——没有人在沙上走直线。绝不铺回程：
   * 那一行不存在的返程脚印，就是这一幕本身。
   */
  footprints(c, item, rng) {
    const count = item.count ?? 11;
    const heading = item.yaw ?? 0;
    let wander = 0;
    for (let i = 0; i < count; i += 1) {
      wander += (rng() - 0.5) * 0.09;
      const t = i * 1.35;
      const a = heading + wander;
      const side = i % 2 === 0 ? 0.34 : -0.34;
      c.add(box(0.46, 0.09, 0.72), 0x6a563a, mat({
        x: Math.sin(a) * t + Math.cos(a) * side,
        z: Math.cos(a) * t - Math.sin(a) * side,
        yaw: a,
      }), 0.62 + (i / count) * 0.12);
    }
  },

  /** 断柱：废墟是有方向的，越靠海越残 */
  brokenColumn(c, item, rng) {
    const count = item.count ?? 3;
    for (let i = 0; i < count; i += 1) {
      const height = 4.6 - i * 0.9 - rng() * 0.5;
      c.add(cyl(0.42, 0.5, Math.max(0.6, height), 9), INK.paleStone, mat({
        x: i * 2.6 - count * 0.9,
        z: (rng() - 0.5) * 2.2,
        tilt: (rng() - 0.5) * 0.1,
      }), 0.86 + rng() * 0.14);
    }
    // 滚落的一节柱鼓
    c.add(cyl(0.46, 0.46, 1.2, 9), INK.paleStone, mat({
      x: -1.8, y: 0.46, z: 2.4, tilt: Math.PI / 2, yaw: 0.5,
    }), 0.78);
  },

  /**
   * 洞口。
   *
   * 不是在石壁上画一块黑，是**三层退进去的石阶围出一个真的负形**：
   * 光进不去的地方自己就是黑的。章转到侧面时能看见洞是有深度的。
   */
  caveMouth(c, _item, rng) {
    for (let k = 0; k < 3; k += 1) {
      const w = 7.4 - k * 1.5;
      const h = 5.2 - k * 0.9;
      const z = -k * 1.6;
      const jamb = 1.5 - k * 0.22;
      c.add(box(jamb, h, 2.0), INK.darkStone, mat({ x: -w / 2, z }), 0.92 - k * 0.14);
      c.add(box(jamb, h, 2.0), INK.darkStone, mat({ x: w / 2, z }), 0.92 - k * 0.14);
      c.add(box(w + jamb, 1.3, 2.0), INK.darkStone, mat({ y: h, z }), 0.84 - k * 0.14);
    }
    // 洞里那团真正的黑
    c.add(box(4.2, 4.0, 3.4), INK.burnt, mat({ z: -4.4 }), 0.35);
    // 洞口两侧堆起来的巨岩
    for (let i = 0; i < 4; i += 1) {
      c.add(rock(1.5 + rng()), INK.darkStone, mat({
        x: (i < 2 ? -1 : 1) * (5.4 + rng() * 1.6),
        y: 0.8,
        z: 1.4 - rng() * 3,
        yaw: rng() * 3,
      }), 0.8 + rng() * 0.2);
    }
  },

  /** 巨兽的肋骨：这一幕的尺度锚。一具比船还大的骨架，半埋在土里 */
  ribs(c, item, rng) {
    const count = item.count ?? 5;
    for (let i = 0; i < count; i += 1) {
      const r = 2.6 - Math.abs(i - (count - 1) / 2) * 0.32;
      c.add(arc(r, 0.16, Math.PI * 0.86), INK.bone, mat({
        x: i * 1.5 - (count - 1) * 0.75,
        y: -0.3,
        yaw: Math.PI / 2,
        roll: Math.PI * 0.07 + (rng() - 0.5) * 0.1,
      }), 0.9 + rng() * 0.1);
    }
    // 脊椎那一段
    c.add(cyl(0.2, 0.2, count * 1.5, 6), INK.bone, mat({
      x: -(count - 1) * 0.75, y: 0.12, tilt: 0, yaw: 0, roll: Math.PI / 2,
    }), 0.8);
  },

  /** 碎礁：把海岸线咬碎的那些尖石 */
  reef(c, item, rng) {
    const count = item.count ?? 5;
    for (let i = 0; i < count; i += 1) {
      const a = (i / count) * Math.PI * 2 + rng();
      const d = 2 + rng() * 7;
      c.add(cone(0.9 + rng() * 0.7, 1.6 + rng() * 2.4, 5), INK.darkStone, mat({
        x: Math.cos(a) * d,
        z: Math.sin(a) * d,
        y: -0.4,
        tilt: (rng() - 0.5) * 0.3,
        yaw: rng() * 3,
      }), 0.72 + rng() * 0.26);
    }
  },

  /**
   * 两排列柱。
   *
   * 光在这一幕里被切成一根根竖条，所以章上也必须是**两排**、间距均匀——
   * 一排柱子读出来是栅栏，两排才是柱廊。越靠海越残，和岛上一致。
   */
  colonnade(c, item, rng) {
    const count = item.count ?? 6;
    const columns: Array<{ x: number; z: number; h: number; intact: boolean }> = [];
    for (let side = -1; side <= 1; side += 2) {
      for (let i = 0; i < count; i += 1) {
        const broken = i / count; // 越靠海（+z）越残
        const h = 5.6 * (1 - broken * (0.15 + rng() * 0.55));
        const x = side * 4.2;
        const z = i * 3.4 - count * 1.7;
        columns.push({ x, z, h, intact: broken < 0.45 });
        c.add(cyl(0.5, 0.58, h, 10), INK.paleStone, mat({ x, z }), 0.88 + rng() * 0.12);
        if (broken < 0.45) {
          // 柱头
          c.add(box(1.5, 0.42, 1.5), INK.paleStone, mat({ x, y: h, z }), 0.96);
        }
      }
    }
    // 楣石只在完整柱之间搭着
    for (let side = -1; side <= 1; side += 2) {
      for (let i = 0; i < count - 1; i += 1) {
        const a = columns.find((col) => col.x === side * 4.2 && Math.abs(col.z - (i * 3.4 - count * 1.7)) < 0.01);
        const b = columns.find((col) => col.x === side * 4.2 && Math.abs(col.z - ((i + 1) * 3.4 - count * 1.7)) < 0.01);
        if (!a?.intact || !b?.intact) continue;
        c.add(box(1.1, 0.5, 3.4), INK.paleStone, mat({ x: side * 4.2, y: 5.6 + 0.42, z: (a.z + b.z) / 2 }), 0.92);
      }
    }
    // 地上那幅剥了大半的壁画：一块比周围略深的薄板
    c.add(box(7.0, 0.06, 9.0), INK.clay, mat({ z: 1.0 }), 0.55);
  },

  /** 塌下来的屋顶一角：对应"少了几块瓦" */
  collapsedRoof(c, item, rng) {
    c.add(box(4.4, 0.35, 3.0), INK.clay, mat({ tilt: 0.34, yaw: item.yaw ?? 0, y: 0.5 }), 0.78);
    for (let i = 0; i < 6; i += 1) {
      c.add(box(0.8, 0.1, 0.6), INK.clay, mat({
        x: (rng() - 0.5) * 5,
        z: (rng() - 0.5) * 4,
        yaw: rng() * 3,
        tilt: (rng() - 0.5) * 0.5,
      }), 0.62 + rng() * 0.25);
    }
  },

  /**
   * 一列界石。
   *
   * 两面都磨平了，上面**没有字**——这一幕的规矩是"这里没有惩罚，
   * 只有一件一件没有做完的事"。章上也不给它们刻字。
   */
  boundaryStones(c, item, rng) {
    const count = item.count ?? 5;
    const heading = item.yaw ?? 0;
    let bend = 0;
    for (let i = 0; i < count; i += 1) {
      bend += (rng() - 0.5) * 0.16;
      const t = i * 3.4;
      const a = heading + bend;
      c.add(box(1.5, 2.4 + rng() * 0.8, 0.4), INK.bone, mat({
        x: Math.sin(a) * t,
        z: Math.cos(a) * t,
        yaw: a + Math.PI / 2,
        tilt: (rng() - 0.5) * 0.06,
      }), 0.9 + rng() * 0.1);
    }
  },

  /** 堆好却没点的柴：所有东西都准备好了，就是没有开始 */
  unlitPyre(c, _item, rng) {
    for (let i = 0; i < 9; i += 1) {
      const a = (i / 9) * Math.PI * 2;
      c.add(cyl(0.11, 0.14, 2.6, 5), INK.wood, mat({
        x: Math.cos(a) * 0.75,
        z: Math.sin(a) * 0.75,
        tilt: 0.34,
        yaw: a + Math.PI / 2,
      }), 0.7 + rng() * 0.2);
    }
    c.add(cyl(1.5, 1.7, 0.3, 9), INK.darkStone, mat({ y: -0.05 }), 0.7);
  },

  /** 祭酒碗，与它旁边空着的那个位置 */
  libationBowl(c) {
    c.add(cyl(0.85, 0.5, 0.5, 12), INK.clay, mat({}), 0.95);
    c.add(cyl(0.72, 0.4, 0.42, 12), INK.burnt, mat({ y: 0.12 }), 0.5);
    // 空着的位置：地上一圈浅浅的印
    c.add(arc(0.8, 0.07, Math.PI * 2), INK.bone, mat({ x: 2.4, y: 0.04, tilt: Math.PI / 2 }), 0.55);
  },

  /**
   * 沉船的龙骨与肋。
   *
   * 船头一律朝里（-Z），三具排成一条把人往里带的路——
   * 这是水道那一幕的走位设计，章上要读得出这条"路"。
   */
  wreck(c, item, rng) {
    const yaw = item.yaw ?? 0;
    c.add(box(0.5, 0.45, 9.0), INK.wood, mat({ yaw }), 0.72);
    for (let i = 0; i < 6; i += 1) {
      c.add(arc(1.5 - i * 0.14, 0.13, Math.PI * 0.8), INK.wood, mat({
        z: (i - 2.5) * 1.4 * Math.cos(yaw),
        x: (i - 2.5) * 1.4 * -Math.sin(yaw),
        y: 0.2,
        yaw: yaw + Math.PI / 2,
        roll: Math.PI,
      }), 0.66 + rng() * 0.2);
    }
    // 断桅，倒向一侧
    c.add(cyl(0.16, 0.22, 4.2, 6), INK.wood, mat({ z: -2.4, tilt: 1.15, yaw: yaw + 0.4 }), 0.6);
  },

  /** 立着的那截桅杆：齐胸高有一圈被磨白的痕 */
  standingMast(c) {
    c.add(cyl(0.2, 0.3, 5.4, 8), INK.wood, mat({}), 0.75);
    c.add(cyl(0.34, 0.34, 0.7, 10), INK.paleStone, mat({ y: 1.25 }), 0.95);
  },

  /**
   * 二十个树桩。
   *
   * 正好够造一条船。章上就刻二十个——少一个这枚章就不成立，
   * 因为玩家在岛上数过。
   */
  stumps(c, item, rng) {
    const count = item.count ?? 20;
    for (let i = 0; i < count; i += 1) {
      const a = (i / count) * Math.PI * 2 * 2.4;
      const d = 1.5 + (i / count) * 9;
      c.add(cyl(0.55, 0.62, 0.55 + rng() * 0.3, 9), INK.wood, mat({
        x: Math.cos(a) * d + (rng() - 0.5) * 1.6,
        z: Math.sin(a) * d + (rng() - 0.5) * 1.6,
      }), 0.7 + rng() * 0.2);
    }
  },

  /** 还站着的雪松：白光里的一列黑竖线 */
  cedars(c, item, rng) {
    const count = item.count ?? 7;
    for (let i = 0; i < count; i += 1) {
      const h = 8 + rng() * 4;
      c.add(cyl(0.18, 0.3, h * 0.28, 6), INK.wood, mat({
        x: i * 2.8 - count * 1.4,
        z: (rng() - 0.5) * 4,
      }), 0.7);
      c.add(cone(1.15, h * 0.86, 7), INK.leaf, mat({
        x: i * 2.8 - count * 1.4,
        y: h * 0.2,
        z: (rng() - 0.5) * 4,
      }), 0.62 + rng() * 0.2);
    }
  },

  /** 四道泉：从一处流出，分向四边 */
  springs(c, item) {
    const count = item.count ?? 4;
    for (let i = 0; i < count; i += 1) {
      const a = (i / count) * Math.PI * 2 + 0.4;
      for (let k = 0; k < 5; k += 1) {
        const bend = a + Math.sin(k * 0.9) * 0.22;
        const d = 1.2 + k * 2.1;
        c.add(box(1.5, 0.09, 2.2), INK.water, mat({
          x: Math.cos(bend) * d,
          z: Math.sin(bend) * d,
          yaw: bend,
        }), 0.85 - k * 0.06);
      }
    }
    c.add(cyl(0.9, 1.0, 0.4, 10), INK.paleStone, mat({ y: -0.1 }), 0.9);
  },

  /** 他自己造的那条船：全岛唯一一件还没有腐烂的木头 */
  raftBoat(c, item) {
    const yaw = item.yaw ?? 0;
    c.add(box(2.0, 0.7, 6.4), INK.wood, mat({ yaw }), 0.88);
    c.add(cone(1.0, 2.0, 4), INK.wood, mat({
      x: -Math.sin(yaw) * 3.6, z: -Math.cos(yaw) * 3.6, y: 0.7, tilt: Math.PI / 2, yaw,
    }), 0.82);
    c.add(cyl(0.13, 0.17, 4.0, 6), INK.wood, mat({ yaw, y: 0.7 }), 0.7);
  },

  /**
   * 屋。
   *
   * 全作唯一一座**完整**的建筑，也是章上唯一一件有屋顶的东西。
   * 前面留出中间的门——门是这一幕的全部：他站在门口，二十年之后。
   */
  house(c, item) {
    const yaw = item.yaw ?? 0;
    const w = 9.0;
    const d = 7.0;
    const wall = 4.0;
    const base = mat({ yaw });
    const put = (geom: THREE.BufferGeometry, color: number, place: Place, shade = 1): void => {
      const local = mat(place);
      c.add(geom, color, base.clone().multiply(local), shade);
    };
    // 台基
    put(box(w + 1.6, 0.55, d + 1.6), INK.paleStone, { y: -0.55 }, 0.9);
    // 三面墙
    put(box(0.7, wall, d), INK.stone, { x: -w / 2 }, 0.92);
    put(box(0.7, wall, d), INK.stone, { x: w / 2 }, 0.92);
    put(box(w, wall, 0.7), INK.stone, { z: -d / 2 }, 0.86);
    // 正面留门：两段墙 + 门楣
    put(box(3.1, wall, 0.7), INK.stone, { x: -2.95, z: d / 2 }, 0.96);
    put(box(3.1, wall, 0.7), INK.stone, { x: 2.95, z: d / 2 }, 0.96);
    put(box(w, 0.6, 0.9), INK.paleStone, { y: wall, z: d / 2 }, 1);
    // 门廊两根柱
    put(cyl(0.34, 0.4, 4.4, 9), INK.paleStone, { x: -2.2, z: d / 2 + 1.9 }, 0.98);
    put(cyl(0.34, 0.4, 4.4, 9), INK.paleStone, { x: 2.2, z: d / 2 + 1.9 }, 0.98);
    // 坡屋顶：两块斜板
    for (const side of [-1, 1]) {
      put(box(w * 0.62, 0.45, d + 1.4), INK.clay, {
        x: side * w * 0.26, y: wall + 0.6, roll: side * -0.62,
      }, side < 0 ? 0.9 : 0.72);
    }
    // 门槛石：中间被踩出一道
    put(box(2.6, 0.22, 0.9), INK.paleStone, { z: d / 2, y: -0.2 }, 1.05);
  },

  /** 烟：唯一在动的地标，由 chart 单独装配成一组半透明的小体 */
  hearthSmoke() {
    // 见 index.ts 的 buildSmoke()——它需要自己的透明材质，不进合批
  },

  /** 那棵橄榄树：全作最后一件被触碰的活物 */
  oliveTree(c, _item, rng) {
    c.add(cyl(0.38, 0.62, 2.2, 7), INK.wood, mat({ tilt: 0.07 }), 0.86);
    c.add(rock(1.8), INK.leaf, mat({ y: 3.3, scale: [1.2, 0.72, 1.1], yaw: rng() * 3 }), 0.9);
    c.add(rock(1.15), INK.leaf, mat({ x: -1.1, y: 2.9, z: 0.5, scale: [1, 0.6, 1] }), 0.76);
  },
};

/**
 * 把一座岛的全部地标合成一个几何。
 *
 * 返回的几何在**世界米**坐标系里，原点是岛心，y 是相对地面的高度；
 * 贴地与缩放由 chart 统一处理——地标不该知道自己被缩到多小。
 */
/**
 * 地标的全局增益。
 *
 * `atlas.ts` 里每件地标各自的 scale 管的是"这件比那件大多少"，
 * 这个常数管的是"整套地标在章上占多大"。分开两级是为了调整体密度时
 * 不必去动二十几条数据。
 */
const LANDMARK_GAIN = 1.55;

export function buildLandmarks(
  landmarks: readonly Landmark[],
  seed: number,
  groundAt: (x: number, z: number) => number,
): THREE.BufferGeometry | null {
  const carver = new Carver();
  for (const item of landmarks) {
    const builder = BUILDERS[item.kind];
    if (!builder) continue;
    const rng = createRng(seed + item.x * 131 + item.z * 977 + item.kind.length * 13);
    const local = new Carver();
    builder(local, item, rng);
    if (local.empty) continue;
    const scale = (item.scale ?? 1.8) * LANDMARK_GAIN;
    carver.merge(
      local.build(),
      new THREE.Matrix4().compose(
        new THREE.Vector3(item.x, groundAt(item.x, item.z), item.z),
        new THREE.Quaternion(),
        // 只等比放大：地形做竖向夸张，地标不做
        new THREE.Vector3(scale, scale, scale),
      ),
    );
  }
  return carver.empty ? null : carver.build();
}

export { Carver, mat, box, cyl, cone, rock, INK };
