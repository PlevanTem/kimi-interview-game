import * as THREE from 'three';
import { AUDIO, type Soundscape } from '../engine/audio';
import { applyEnvToMaterials, sharedUniforms } from '../engine/materials';
import { NO_SHADOW_LAYER, ShadowMap } from '../engine/shadow';
import { ENV } from '../content/palette';
import { Sea } from '../engine/sea';
import { Sky } from '../engine/sky';
import { Terrain } from '../world/terrain';
import { Glint } from '../world/glint';
import { GuideLight, guidePath } from '../world/guidelight';
import { MOTIF_FOOT, Motif } from '../world/silhouette';
import { Dresser } from './scenes/dresser';
import type { Act } from './scenes';
import type { Blocker } from '../engine/controller';
import type { InteractableDef } from './types';
import type { Viewport } from '../engine/renderer';

/**
 * 一幕的世界。
 *
 * 建岛、装配、点上微光、把 NPC 立成剪影，然后在换幕时把这一切彻底拆掉。
 * 幕与幕之间不共用任何几何——这就是"多个小型独立孤岛场景"在代码里的样子。
 */
export class Stage {
  readonly scene = new THREE.Scene();
  readonly sky = new Sky();
  readonly sea = new Sea();
  private readonly shadow = new ShadowMap();
  private readonly guide: GuideLight;

  terrain!: Terrain;
  act!: Act;
  blockers: Blocker[] = [];
  vertexCount = 0;

  private dresser: Dresser | null = null;
  private readonly glints = new Map<string, Glint>();
  private readonly npcs = new Map<string, Motif>();

  constructor() {
    this.guide = new GuideLight(this.scene);
    // 天与海不投影：一个是无限远的背景，一个是自己会动的面
    this.sky.mesh.layers.set(NO_SHADOW_LAYER);
    this.sea.mesh.layers.set(NO_SHADOW_LAYER);
    this.scene.add(this.sky.mesh);
    this.scene.add(this.sea.mesh);
  }

  /** 装载一幕。会先把上一幕拆干净。 */
  load(act: Act, viewport: Viewport, sound: Soundscape): void {
    this.unload();
    this.act = act;

    const env = ENV[act.def.env];
    applyEnvToMaterials(env);
    this.sky.applyEnv(env);
    this.sea.applyEnv(env);
    viewport.applyEnv(env);
    sound.applyProfile(AUDIO[act.def.audio]!, 3);

    this.terrain = new Terrain(act.terrain);
    this.scene.add(this.terrain.mesh);
    this.sea.setShore(new THREE.Vector2(0, 0), this.terrain.shorelineRadius(), 3.2);

    this.dresser = new Dresser(this.scene, this.terrain, act.terrain.seed);
    act.dress(this.dresser);
    const committed = this.dresser.commit();
    this.blockers = this.dresser.blockers;
    this.vertexCount = committed.vertexCount;

    for (const def of act.def.interactables) {
      this.addGlint(def);
      this.addNpc(def);
    }

    // 这一幕的材质是刚刚才建出来的，必须再写一次天候，
    // 否则地形与新构件会停在上一幕（或默认）的影色与轮廓光上
    applyEnvToMaterials(env);

    // 地形与构件都是静态的，阴影图一幕只需要烘一次
    this.shadow.configure(sharedUniforms.uSunDir.value, act.terrain.radius, (act.terrain.dome ?? 3) * 0.5);
    this.shadow.render(viewport.renderer, this.scene);
    sharedUniforms.uShadowMap.value = this.shadow.target.texture;
    sharedUniforms.uShadowMatrix.value.copy(this.shadow.matrix);
    sharedUniforms.uShadowTexel.value = this.shadow.texel;
    // 亡者之岸没有方向光，也就不该有影子
    sharedUniforms.uShadowStrength.value = env.sunIntensity < 0.45 ? 0 : 0.85;
  }

  private addGlint(def: InteractableDef): void {
    if (def.glint === false) return;
    const ground = this.terrain.heightAt(def.x, def.z);
    // 记忆物件的微光更大更暖一点，离岛点最大——它是"该走了"的唯一提示
    const size = def.kind === 'memory' ? 0.8 : def.kind === 'depart' ? 1.0 : 0.5;
    const color = def.kind === 'clue' ? 0xffe4b0 : 0xffd08a;
    const glint = new Glint(color, size);
    glint.mesh.layers.set(NO_SHADOW_LAYER);
    // 对话对象的微光浮在头顶，其余浮在物件上方一点点
    const lift = def.kind === 'talk' ? (def.modelHeight ?? def.motifSize ?? 1.9) + 0.35 : (def.y ?? 1) + 0.4;
    glint.mesh.position.set(def.x, ground + lift, def.z);
    this.scene.add(glint.mesh);
    this.glints.set(def.id, glint);
  }

  private addNpc(def: InteractableDef): void {
    if (def.kind !== 'talk' || !def.motif) return;
    const size = def.motifSize ?? 1.9;
    const motif = new Motif({ kind: def.motif, size, ink: 0x241a15, billboard: true, opacity: 0.92 });
    motif.mesh.layers.set(NO_SHADOW_LAYER);
    const ground = this.terrain.heightAt(def.x, def.z);
    // 把贴图里的空白补偿掉，让剪影的脚真的踩在地上
    const foot = MOTIF_FOOT[def.motif] ?? 0;
    motif.mesh.position.set(def.x, ground + size * (0.5 - foot), def.z);
    motif.reveal = 1;
    this.scene.add(motif.mesh);
    this.npcs.set(def.id, motif);
  }

  /** 点一条通向目标的引路光。玩家按键呼唤时才亮，几秒后自己熄灭。 */
  showGuide(from: { x: number; z: number }, yaw: number, to: { x: number; z: number }): void {
    this.guide.show(guidePath(this.terrain, from, yaw, to));
  }

  get guideActive(): boolean {
    return this.guide.active;
  }

  /** 已经触碰过的东西，微光熄灭，永不再亮。 */
  extinguish(id: string): void {
    this.glints.get(id)?.extinguish();
  }

  /** 离岛点在核心记忆触发之前不发光。 */
  setDepartureReady(id: string, ready: boolean): void {
    const glint = this.glints.get(id);
    if (!glint) return;
    glint.mesh.visible = ready;
  }

  update(
    dt: number,
    elapsed: number,
    focusedId: string | null,
    hintId: string | null,
    cameraPosition: THREE.Vector3,
  ): void {
    this.sky.follow(cameraPosition);
    this.sea.follow(cameraPosition, this.act.terrain.waterLevel ?? 0);
    // 被引路光指着的那件东西，微光和被看着时一样亮起来
    for (const [id, glint] of this.glints) glint.update(dt, elapsed, id === focusedId || id === hintId);
    for (const motif of this.npcs.values()) motif.tick(elapsed);
    this.guide.update(dt, elapsed);
  }

  unload(): void {
    this.guide.clear();
    for (const glint of this.glints.values()) {
      this.scene.remove(glint.mesh);
      glint.dispose();
    }
    this.glints.clear();
    for (const motif of this.npcs.values()) {
      this.scene.remove(motif.mesh);
      motif.dispose();
    }
    this.npcs.clear();
    this.dresser?.dispose();
    this.dresser = null;
    if (this.terrain) {
      this.scene.remove(this.terrain.mesh);
      this.terrain.dispose();
    }
    this.blockers = [];
  }

  dispose(): void {
    this.unload();
    this.sky.dispose();
    this.sea.dispose();
    this.shadow.dispose();
    this.guide.dispose();
  }
}
