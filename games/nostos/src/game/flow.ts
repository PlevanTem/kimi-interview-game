import * as THREE from 'three';
import { Soundscape } from '../engine/audio';
import { Walker } from '../engine/controller';
import { GameLoop } from '../engine/loop';
import { setVisionAmount, tickMaterials } from '../engine/materials';
import { Viewport } from '../engine/renderer';
import { ENV, VISION_GRADE } from '../content/palette';
import { TEXT } from '../content/script';
import { Overlay, type Settings } from '../ui/overlay';
import { findFocus } from './interact';
import { canDepart, clear as clearSave, createProgress, hasTriggered, load, markTriggered, save } from './progress';
import { ACTS, TOTAL_ACTS, actAt } from './scenes';
import { Stage } from './stage';
import { LinePlayer } from './talk';
import { VisionStage, type VisionTimeline } from './vision';
import type { InteractableDef } from './types';

/**
 * 主流程。
 *
 * 一幕的生命周期只有五步，和玩家实际经历的顺序一模一样：
 *
 *   登岸(arriving) → 漫游(roaming) → 幻象(vision) → 走向船(roaming) → 硬切(departing)
 *
 * 这里没有任务系统、没有状态机图谱、没有事件总线。因为这部作品要做的事
 * 就这么多——多写一层抽象，就是在给不存在的复杂度收税。
 */

type Phase = 'title' | 'arriving' | 'roaming' | 'vision' | 'departing' | 'ended';

const ARRIVE_FADE = 2.4;
const DEPART_FADE = 1.8;

export class Game {
  private readonly viewport: Viewport;
  private readonly overlay: Overlay;
  private readonly walker: Walker;
  private readonly sound = new Soundscape();
  private readonly stage = new Stage();
  private readonly visionStage: VisionStage;
  private readonly loop: GameLoop;

  private progress = createProgress();
  private phase: Phase = 'title';
  private paused = false;
  private started = false;

  private narration: LinePlayer | null = null;
  private timeline: VisionTimeline | null = null;
  private focus: InteractableDef | null = null;

  /** 转场用：白光量与它的目标 */
  private fade = 1;
  private fadeTarget = 1;
  private fadeSpeed = 1 / ARRIVE_FADE;
  private fadeColor = 0xf3ead6;

  /** 登岸横摇 */
  private arriveTime = 0;
  private arriveFrom = 0;
  private arriveTo = 0;

  private stepPhase = 0;
  private readonly tmpVector = new THREE.Vector3();

  constructor(container: HTMLElement) {
    this.viewport = new Viewport(container);
    this.walker = new Walker(this.viewport.canvas);
    this.visionStage = new VisionStage(this.stage.scene);

    this.overlay = new Overlay(container, {
      onStart: () => this.beginRun(createProgress()),
      onResume: () => this.resume(),
      onRestart: () => this.restart(),
      onSettingsChange: (settings) => this.applySettings(settings),
    });

    this.overlay.showTitle(load() !== null);

    this.loop = new GameLoop(
      (dt, elapsed) => this.update(dt, elapsed),
      (_, elapsed) => this.render(elapsed),
    );

    window.addEventListener('resize', this.onResize);
    window.addEventListener('keydown', this.onKeyDown);
    this.viewport.canvas.addEventListener('mousedown', this.onMouseDown);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);

    // 标题界面也要有画面：先把第一幕装好，让玩家隔着面板看见海
    this.stage.load(actAt(0), this.viewport, this.sound);
    this.walker.setGround(this.stage.terrain, this.stage.blockers);
    this.placeAtSpawn(actAt(0).def.spawn);
    this.loop.start();
  }

  // ── 运行控制 ──

  private beginRun(progress: { act: number; triggered: string[] }): void {
    this.progress = progress;
    this.started = true;
    this.sound.resume();
    this.overlay.hideTitle();
    this.overlay.hideEnd();
    this.loadAct(this.progress.act);
    this.walker.requestPointerLock();
  }

  private restart(): void {
    clearSave();
    this.overlay.setPaused(false);
    this.paused = false;
    this.beginRun(createProgress());
  }

  private resume(): void {
    if (!this.started) {
      const saved = load();
      this.beginRun(saved ?? createProgress());
      return;
    }
    this.paused = false;
    this.overlay.setPaused(false);
    this.walker.requestPointerLock();
  }

  private pause(): void {
    if (!this.started || this.phase === 'ended') return;
    this.paused = true;
    this.overlay.setPaused(true);
    this.walker.exitPointerLock();
  }

  private applySettings(settings: Settings): void {
    this.walker.reducedMotion = settings.reducedMotion;
    this.walker.sensitivity = settings.sensitivity;
    this.viewport.baseFov = settings.fov;
    this.sound.setMuted(settings.muted);
  }

  private loadAct(index: number): void {
    const act = actAt(index);
    this.stage.load(act, this.viewport, this.sound);
    this.walker.setGround(this.stage.terrain, this.stage.blockers);
    this.placeAtSpawn(act.def.spawn);

    // 登岸：从白里出来，镜头缓慢横摇过整座岛
    this.phase = 'arriving';
    this.arriveTime = 0;
    this.arriveFrom = act.def.spawn.yaw - act.def.arrival.pan * 0.5;
    this.arriveTo = act.def.spawn.yaw + act.def.arrival.pan * 0.5;
    this.walker.yaw = this.arriveFrom;
    this.walker.movementEnabled = false;

    this.fade = 1;
    this.fadeTarget = 0;
    this.fadeColor = 0xf3ead6;
    this.fadeSpeed = 1 / ARRIVE_FADE;

    this.overlay.showActCard(act.def.act, act.def.title, act.def.subtitle, act.def.arrival.seconds + 2);
    this.refreshDeparture();
    save(this.progress);
  }

  private placeAtSpawn(spawn: { x: number; z: number; yaw: number }): void {
    const settled = this.stage.terrain.settle(spawn.x, spawn.z);
    this.walker.place(settled.x, settled.z, spawn.yaw);
  }

  private refreshDeparture(): void {
    const act = actAt(this.progress.act);
    const depart = act.def.interactables.find((item) => item.kind === 'depart');
    if (depart) this.stage.setDepartureReady(depart.id, canDepart(this.progress, act.def));
  }

  // ── 输入 ──

  private readonly onResize = (): void => this.viewport.resize();

  private readonly onPointerLockChange = (): void => {
    // 玩家按了浏览器的 Esc 退出鼠标锁定：视为暂停
    if (this.started && !this.walker.pointerLocked && !this.paused && this.phase !== 'ended') {
      this.pause();
    }
  };

  private readonly onMouseDown = (): void => {
    if (!this.started || this.paused) return;
    if (!this.walker.pointerLocked) {
      this.walker.requestPointerLock();
      return;
    }
    this.interact();
  };

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.code === 'Escape') {
      event.preventDefault();
      if (this.paused) this.resume();
      else this.pause();
      return;
    }
    if (!this.started || this.paused) return;

    if (event.code === 'Space') {
      event.preventDefault();
      if (this.phase === 'vision') this.timeline?.skip();
      else if (this.narration) this.narration.next();
      return;
    }
    if (event.code === 'KeyE' || event.code === 'Enter') {
      event.preventDefault();
      this.interact();
    }
  };

  private interact(): void {
    if (this.phase !== 'roaming') return;
    // 正在念旁白时，交互键先用来推进旁白
    if (this.narration && !this.narration.done) {
      this.narration.next();
      return;
    }
    const def = this.focus;
    if (!def) return;

    switch (def.kind) {
      case 'clue':
      case 'memory':
        this.narration = new LinePlayer(def.lines);
        break;
      case 'talk':
        this.narration = new LinePlayer(def.lines, def.speaker);
        break;
      case 'depart':
        this.depart();
        return;
    }

    this.sound.pluck(def.kind === 'memory' ? -5 : 2);
    markTriggered(this.progress, def.id);
    this.stage.extinguish(def.id);
    save(this.progress);

    if (def.kind === 'memory') {
      // 旁白先说完那一两句，再让世界褪色——幻象在 startVision() 里等着
      this.pendingVision = true;
    }
    this.refreshDeparture();
  }

  private pendingVision = false;

  private startVision(): void {
    this.pendingVision = false;
    const act = actAt(this.progress.act);
    this.phase = 'vision';
    this.timeline = this.visionStage.begin(act.def.vision, this.walker.yaw);
    this.walker.movementEnabled = false;
    this.sound.setVision(true);
    this.overlay.setPrompt(null);
    this.overlay.setReticle(false, false);
    this.overlay.setSkipHint(true);
  }

  private endVision(): void {
    this.timeline = null;
    this.sound.setVision(false);
    setVisionAmount(0);
    this.viewport.post.setVision(0, VISION_GRADE.aspectFrom, VISION_GRADE.aspectTo, VISION_GRADE.ground);
    this.viewport.post.applyEnv(ENV[actAt(this.progress.act).def.env]);
    this.overlay.setSkipHint(false);

    if (this.progress.act >= TOTAL_ACTS - 1) {
      this.finish();
      return;
    }
    this.phase = 'roaming';
    this.walker.movementEnabled = true;
    this.refreshDeparture();
  }

  private depart(): void {
    this.phase = 'departing';
    this.walker.movementEnabled = false;
    this.fadeTarget = 1;
    this.fadeColor = 0xf3ead6;
    this.fadeSpeed = 1 / DEPART_FADE;
    this.overlay.setPrompt(null);
    this.overlay.setReticle(false, false);
  }

  private finish(): void {
    this.phase = 'ended';
    this.walker.movementEnabled = false;
    this.walker.exitPointerLock();
    this.overlay.setReticle(false, false);
    this.overlay.setCaption(null);
    this.overlay.showEnd(TEXT.ithaca.epitaph, TEXT.ithaca.epitaphSub);
    clearSave();
  }

  // ── 每帧 ──

  private update(dt: number, elapsed: number): void {
    this.overlay.update(dt);
    if (this.paused) {
      this.viewport.post.setFade(this.fadeColor, this.fade);
      return;
    }

    switch (this.phase) {
      case 'arriving':
        this.updateArriving(dt);
        break;
      case 'roaming':
        this.updateRoaming(dt);
        break;
      case 'vision':
        this.updateVision(dt, elapsed);
        break;
      case 'departing':
        this.updateDeparting(dt);
        break;
      case 'title':
        // 标题界面：镜头极缓慢地横摇，让海一直在动
        this.walker.yaw += dt * 0.012;
        break;
      case 'ended':
        break;
    }

    this.walker.update(dt);
    this.walker.applyTo(this.viewport.camera);
    this.stage.update(dt, elapsed, this.focus?.id ?? null, this.viewport.camera.position);

    // 脚步声：跟着步伐相位走，而不是按固定间隔播
    if (this.phase === 'roaming' && this.walker.speedRatio > 0.15) {
      this.stepPhase += this.walker.speedRatio * dt * 8.6;
      if (this.stepPhase > Math.PI) {
        this.stepPhase -= Math.PI;
        this.sound.footstep(0.85 + Math.random() * 0.35);
      }
    }

    // 转场
    this.fade += Math.sign(this.fadeTarget - this.fade) * this.fadeSpeed * dt;
    this.fade = Math.max(0, Math.min(1, this.fade));
    this.viewport.post.setFade(this.fadeColor, this.fade);
  }

  private updateArriving(dt: number): void {
    const act = actAt(this.progress.act);
    this.arriveTime += dt;
    const t = Math.min(1, this.arriveTime / act.def.arrival.seconds);
    const eased = t * t * (3 - 2 * t);
    this.walker.yaw = this.arriveFrom + (this.arriveTo - this.arriveFrom) * eased;
    // 登岸时视野略宽，站定后收回基准值——一个很轻的"到了"
    this.viewport.setFovOffset(4 * (1 - eased));
    if (t >= 1) {
      this.phase = 'roaming';
      this.walker.movementEnabled = true;
      this.overlay.setReticle(true, false);
    }
  }

  private updateRoaming(dt: number): void {
    const act = actAt(this.progress.act);

    if (this.narration) {
      this.narration.update(dt);
      this.overlay.setCaption(this.narration.caption);
      if (this.narration.done) {
        this.narration = null;
        this.overlay.setCaption(null);
        if (this.pendingVision) {
          this.startVision();
          return;
        }
      }
    }

    this.walker.footPosition(this.tmpVector);
    const result = findFocus(
      { x: this.tmpVector.x, z: this.tmpVector.z, yaw: this.walker.yaw },
      act.def.interactables,
      (def) => {
        if (def.kind === 'depart') return canDepart(this.progress, act.def);
        return !hasTriggered(this.progress, def.id);
      },
    );
    this.focus = result?.def ?? null;

    const busy = this.narration !== null;
    this.overlay.setReticle(true, this.focus !== null && !busy);
    this.overlay.setPrompt(this.focus && !busy ? this.focus.prompt : null);

    // 凝视：看着可触碰之物时把 FOV 收窄一点点，像人不自觉地眯眼
    const target = this.focus && !busy ? -2.2 : 0;
    const current = this.viewport.camera.fov - this.viewport.baseFov;
    this.viewport.setFovOffset(current + (target - current) * Math.min(1, dt * 4));
  }

  private updateVision(dt: number, elapsed: number): void {
    const timeline = this.visionStage.update(dt, elapsed);
    if (!timeline) {
      this.endVision();
      return;
    }
    this.timeline = timeline;

    const amount = timeline.intensity;
    setVisionAmount(amount * 0.92);
    this.viewport.post.setVision(amount, VISION_GRADE.aspectFrom, VISION_GRADE.aspectTo, VISION_GRADE.ground);
    this.viewport.post.setExposureScale(
      timeline.exposureScale(),
      ENV[actAt(this.progress.act).def.env],
    );

    // 镜头推力：不锁定视角，只是把它往该看的方向轻轻带
    const cue = timeline.cameraCue();
    const pull = Math.min(1, dt * 1.6) * amount;
    this.walker.yaw += (this.visionYaw(cue.yaw) - this.walker.yaw) * pull * 0.5;
    this.walker.pitch += (cue.pitch - this.walker.pitch) * pull * 0.5;
    this.viewport.setFovOffset(cue.fov);

    this.overlay.setCaption(timeline.captionAt());

    if (timeline.done) this.endVision();
  }

  /** 幻象的镜头目标是相对进入时的朝向说的。 */
  private visionYaw(offset: number): number {
    const base = this.visionStage.group.rotation.y;
    return base + offset;
  }

  private updateDeparting(dt: number): void {
    void dt;
    this.overlay.setCaption(null);
    if (this.fade < 0.999) return;
    if (this.progress.act >= TOTAL_ACTS - 1) {
      this.finish();
      return;
    }
    this.progress = { act: this.progress.act + 1, triggered: [...this.progress.triggered] };
    this.loadAct(this.progress.act);
  }

  private render(elapsed: number): void {
    tickMaterials(elapsed, this.viewport.camera.position);
    this.viewport.render(this.stage.scene, elapsed);
  }

  /** 供 e2e 使用的只读探针。不参与任何玩法逻辑。 */
  debugState(): {
    phase: Phase;
    act: number;
    actId: string;
    triggered: number;
    focus: string | null;
    vertexCount: number;
    frames: number;
    visionTime: number;
    memoryId: string;
    departId: string | null;
    interactableIds: string[];
    narrating: boolean;
  } {
    const act = actAt(this.progress.act);
    return {
      phase: this.phase,
      act: this.progress.act,
      actId: act.def.id,
      triggered: this.progress.triggered.length,
      focus: this.focus?.id ?? null,
      vertexCount: this.stage.vertexCount,
      frames: this.loop.frames,
      visionTime: this.timeline?.time ?? 0,
      memoryId: act.def.memoryId,
      departId: act.def.interactables.find((item) => item.kind === 'depart')?.id ?? null,
      interactableIds: act.def.interactables.map((item) => item.id),
      narrating: this.narration !== null,
    };
  }

  /** 供 e2e 使用：直接把玩家放到某个交互点前，避免用脚本走路。 */
  debugTeleport(interactableId: string): boolean {
    const act = actAt(this.progress.act);
    const def = act.def.interactables.find((item) => item.id === interactableId);
    if (!def) return false;
    const angle = Math.atan2(this.walker.position.x - def.x, this.walker.position.z - def.z);
    const distance = 2.3;
    const x = def.x + Math.sin(angle) * distance;
    const z = def.z + Math.cos(angle) * distance;
    const settled = this.stage.terrain.settle(x, z);
    // yaw = angle 时前向量正好指回物件（前向量是 (-sin yaw, -cos yaw)）
    this.walker.place(settled.x, settled.z, angle);
    return true;
  }

  /** 供 e2e 使用：触发当前对焦物。 */
  debugInteract(): void {
    this.interact();
  }

  debugSkipVision(): void {
    this.timeline?.skip();
  }

  /** 供 e2e 使用：把当前旁白一口气念完。 */
  debugSkipNarration(): void {
    while (this.narration && !this.narration.done) this.narration.next();
  }

  /** 供 e2e 使用：直接跳到某一幕。 */
  debugGotoAct(index: number): void {
    this.progress = { act: Math.max(0, Math.min(TOTAL_ACTS - 1, index)), triggered: [] };
    this.started = true;
    this.overlay.hideTitle();
    this.overlay.hideEnd();
    this.loadAct(this.progress.act);
  }

  get actCount(): number {
    return ACTS.length;
  }

  dispose(): void {
    this.loop.stop();
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
    this.viewport.canvas.removeEventListener('mousedown', this.onMouseDown);
    this.walker.dispose();
    this.visionStage.dispose();
    this.stage.dispose();
    this.sound.dispose();
    this.viewport.dispose();
  }
}
