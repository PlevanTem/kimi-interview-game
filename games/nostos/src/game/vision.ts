import * as THREE from 'three';
import { PIGMENT, VISION_GRADE } from '../content/palette';
import { NO_SHADOW_LAYER } from '../engine/shadow';
import { Motif } from '../world/silhouette';
import { holdFor, type Caption, type VisionBeat, type VisionDef } from './types';

/**
 * 回忆幻象。
 *
 * 这是本作对《艾迪芬奇的记忆》那套"碰到物件 → 进入一段被导演过的回忆"的回应。
 * 但这里的回忆不做成第二套玩法，而是做成**一幅活过来的壁画**：
 *
 *   世界褪成石灰底 → 遮幅收窄 → 环境音退去只剩嗡鸣 →
 *   黑绘剪影按旁白的节拍一层层被"画"上去 → 说完最后一句 → 全部碎成颗粒
 *
 * 玩家在整个过程中仍然可以转头。镜头只是被"轻轻推"向该看的方向，
 * 不会硬锁——因为这是他的记忆，不是播给他看的片子。
 */

/** 时间轴。纯逻辑，不碰 three 与 DOM，单元测试直接驱动它。 */
export class VisionTimeline {
  time = 0;
  done = false;
  /** 已经开始过的拍号 */
  private readonly fired = new Set<number>();
  private skipping = false;

  constructor(readonly def: VisionDef) {}

  /** 推进时间，返回本帧新开始的拍号。 */
  advance(dt: number): number[] {
    if (this.done) return [];
    this.time += dt;
    const started: number[] = [];
    this.def.beats.forEach((beat, index) => {
      if (!this.fired.has(index) && this.time >= beat.at) {
        this.fired.add(index);
        started.push(index);
      }
    });
    if (this.time >= this.def.duration) this.done = true;
    return started;
  }

  /** 跳过：直接推到崩解段，让画面自然碎掉而不是硬切。 */
  skip(): void {
    if (this.skipping) return;
    this.skipping = true;
    this.time = Math.max(this.time, this.def.duration - CRUMBLE_SECONDS);
    for (let i = 0; i < this.def.beats.length; i += 1) this.fired.add(i);
  }

  get skipped(): boolean {
    return this.skipping;
  }

  /**
   * 整体强度包络 0–1：进入时用 1.2 秒淡入，退出时用 1.8 秒淡出。
   * 色彩坍缩、遮幅收窄、音量下潜全都乘这个值。
   */
  get intensity(): number {
    const t = this.time;
    const d = this.def.duration;
    const inAmount = Math.min(1, t / 1.2);
    const outAmount = Math.min(1, Math.max(0, d - t) / 1.8);
    return Math.max(0, Math.min(inAmount, outAmount));
  }

  /** 崩解量 0–1，只在最后 CRUMBLE_SECONDS 秒里从 0 走到 1。 */
  get crumble(): number {
    const remaining = this.def.duration - this.time;
    if (remaining > CRUMBLE_SECONDS) return 0;
    return Math.min(1, Math.max(0, (CRUMBLE_SECONDS - remaining) / CRUMBLE_SECONDS));
  }

  /** 当前该显示的字幕；没有就返回 null。 */
  captionAt(): Caption | null {
    let current: { beat: VisionBeat; index: number } | null = null;
    this.def.beats.forEach((beat, index) => {
      if (beat.line && this.time >= beat.at) current = { beat, index };
    });
    if (!current) return null;
    const { beat } = current as { beat: VisionBeat };
    const hold = beat.hold ?? holdFor(beat.line ?? '');
    const remaining = beat.at + hold - this.time;
    if (remaining <= 0) return null;
    return { text: beat.line ?? '', remaining };
  }

  /** 当前的镜头推力：取最后一个已触发的 camera 拍，按其缓动时间插值。 */
  cameraCue(): { yaw: number; pitch: number; fov: number } {
    let target = { yaw: 0, pitch: 0, fov: 0 };
    let from = { yaw: 0, pitch: 0, fov: 0 };
    let start = 0;
    let ease = 2.5;
    for (const beat of this.def.beats) {
      if (!beat.camera || this.time < beat.at) continue;
      from = target;
      target = {
        yaw: beat.camera.yaw ?? target.yaw,
        pitch: beat.camera.pitch ?? target.pitch,
        fov: beat.camera.fov ?? target.fov,
      };
      start = beat.at;
      ease = beat.camera.ease ?? 2.5;
    }
    const t = ease <= 0 ? 1 : Math.min(1, (this.time - start) / ease);
    // 平滑进出，镜头不会一顿一顿地走
    const k = t * t * (3 - 2 * t);
    return {
      yaw: from.yaw + (target.yaw - from.yaw) * k,
      pitch: from.pitch + (target.pitch - from.pitch) * k,
      fov: from.fov + (target.fov - from.fov) * k,
    };
  }

  /** 当前曝光倍率，取最后一个已触发的 exposure 拍，向 1 缓慢回落。 */
  exposureScale(): number {
    let value = 1;
    let at = 0;
    for (const beat of this.def.beats) {
      if (beat.exposure === undefined || this.time < beat.at) continue;
      value = beat.exposure;
      at = beat.at;
    }
    if (value === 1) return 1;
    const back = Math.min(1, (this.time - at) / 1.6);
    return value + (1 - value) * back;
  }
}

export const CRUMBLE_SECONDS = 2.6;

/** 幻象舞台：把时间轴的状态画成一层层剪影。 */
export class VisionStage {
  readonly group = new THREE.Group();
  private readonly motifs = new Map<number, { motif: Motif; beat: VisionBeat }>();
  private timeline: VisionTimeline | null = null;

  constructor(private readonly scene: THREE.Scene) {
    this.group.visible = false;
    this.scene.add(this.group);
  }

  /** 开演：按定义把所有剪影建好但不显示，等各自的拍号到了再"画"上去。 */
  begin(def: VisionDef, facingYaw: number): VisionTimeline {
    this.clear();
    const timeline = new VisionTimeline(def);
    this.timeline = timeline;

    this.group.position.set(def.stage.x, def.stage.y, def.stage.z);
    // 舞台整体朝向玩家进入幻象时的视线，构图才成立
    this.group.rotation.set(0, facingYaw, 0);
    this.group.visible = true;

    // 幻象里不做深度测试，所以要自己定前后：越远的先画，近的盖在上面
    const depthOrder = def.beats
      .map((beat, index) => ({ index, z: beat.motif?.z ?? 0 }))
      .filter((entry) => def.beats[entry.index]!.motif)
      .sort((a, b) => a.z - b.z)
      .map((entry) => entry.index);

    def.beats.forEach((beat, index) => {
      if (!beat.motif) return;
      const spec = beat.motif;
      const motif = new Motif({
        kind: spec.kind,
        size: spec.size,
        ink: spec.ink === 'shadow' ? VISION_GRADE.shadow : PIGMENT.blackFigure,
        billboard: spec.billboard ?? false,
        opacity: spec.opacity ?? 1,
        depthTest: false,
        renderOrder: 100 + depthOrder.indexOf(index),
      });
      motif.mesh.layers.set(NO_SHADOW_LAYER);
      motif.mesh.position.set(spec.x, spec.y, spec.z);
      if (!spec.billboard) motif.mesh.rotation.y = spec.yaw ?? 0;
      this.group.add(motif.mesh);
      this.motifs.set(index, { motif, beat });
    });

    return timeline;
  }

  /** 每帧推进；返回时间轴便于外部读取字幕与镜头推力。 */
  update(dt: number, elapsed: number): VisionTimeline | null {
    const timeline = this.timeline;
    if (!timeline) return null;
    timeline.advance(dt);

    const crumble = timeline.crumble;
    for (const [index, entry] of this.motifs) {
      const beat = this.timeline!.def.beats[index]!;
      const grow = entry.beat.motif?.grow ?? 1.6;
      const since = timeline.time - beat.at;
      entry.motif.reveal = since <= 0 ? 0 : Math.min(1, since / Math.max(grow, 0.01));

      const crumbleAt = entry.beat.motif?.crumbleAt;
      if (crumbleAt !== undefined) {
        const local = (timeline.time - crumbleAt) / CRUMBLE_SECONDS;
        entry.motif.dissolve = Math.min(1, Math.max(0, local));
      } else {
        entry.motif.dissolve = crumble;
      }
      entry.motif.tick(elapsed);
    }

    if (timeline.done) {
      this.clear();
      this.timeline = null;
    }
    return timeline;
  }

  get active(): boolean {
    return this.timeline !== null;
  }

  clear(): void {
    for (const { motif } of this.motifs.values()) {
      this.group.remove(motif.mesh);
      motif.dispose();
    }
    this.motifs.clear();
    this.group.visible = false;
  }

  dispose(): void {
    this.clear();
    this.scene.remove(this.group);
  }
}
