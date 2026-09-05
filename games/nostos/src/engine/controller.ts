import * as THREE from 'three';

/**
 * 第一人称行走控制器。
 *
 * 这是一部只有"走、看、触碰"三个动词的作品，所以走路本身必须是有表演的：
 * - 起步与停步都有惯性，不会像贴图一样瞬移；
 * - 步伐带极低幅度的上下与横向摆动，落脚点上有一点微不可察的侧倾；
 * - 站着不动时仍有呼吸与手持摄影般的漂移，画面永远不是死的；
 * - 幻象接管时移动被锁，但转头保留——"我在经历，不是在看"。
 *
 * 所有摆动在 prefers-reduced-motion 下自动归零。
 */

export interface GroundSampler {
  /** 该点地面高度 */
  heightAt(x: number, z: number): number;
  /** 该点是否可以站人（水下、悬崖外返回 false） */
  walkable(x: number, z: number): boolean;
}

export interface Blocker {
  x: number;
  z: number;
  radius: number;
}

const WALK_SPEED = 2.05;
/**
 * 快跑倍率。
 *
 * 步行叙事作品通常刻意不给奔跑，好把节奏攥在自己手里。但这几座岛
 * 从岸边走到岛心要一分多钟，来回找东西时那一分钟会变成负担——
 * 于是给一个克制的倍率：快到能省时间，慢到跑起来仍然像一个疲惫的人，
 * 而不是像在冲刺。快跑时步伐摆动与脚步声一起加快，视野略微推开。
 */
const SPRINT_MULTIPLIER = 1.75;
const ACCELERATION = 9;
const DAMPING = 11;
const EYE_HEIGHT = 1.68;
const PITCH_LIMIT = Math.PI / 2 - 0.05;

export class Walker {
  readonly position = new THREE.Vector3();
  yaw = 0;
  pitch = 0;

  /** 移动开关：幻象与对话时关闭 */
  movementEnabled = true;
  /** 视角开关：只有转场全黑时才关闭 */
  lookEnabled = true;
  reducedMotion = false;
  sensitivity = 1;

  private readonly velocity = new THREE.Vector3();
  private readonly keys = new Set<string>();
  private bobPhase = 0;
  private swayTime = 0;
  private locked = false;
  private sprintHeld = false;

  private ground: GroundSampler | null = null;
  private blockers: Blocker[] = [];

  /** 供 UI 读取，用于"点击以进入"提示 */
  get pointerLocked(): boolean {
    return this.locked;
  }

  /** 当前水平速度（0–1 归一化），HUD 与音频用它调节脚步与风声 */
  get speedRatio(): number {
    return Math.min(1, Math.hypot(this.velocity.x, this.velocity.z) / WALK_SPEED);
  }

  /** 步幅比例：走路时封顶在 1，快跑时可以到 SPRINT_MULTIPLIER。脚步频率与镜头用它 */
  get strideRatio(): number {
    return Math.min(SPRINT_MULTIPLIER, Math.hypot(this.velocity.x, this.velocity.z) / WALK_SPEED);
  }

  /** 此刻是不是在快跑。视野推开与音频加密都看它 */
  get sprinting(): boolean {
    return this.sprintHeld && this.movementEnabled && this.speedRatio > 0.5;
  }

  constructor(private readonly canvas: HTMLCanvasElement) {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
    document.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('blur', this.onBlur);
  }

  requestPointerLock(): void {
    if (!this.locked) void this.canvas.requestPointerLock();
  }

  exitPointerLock(): void {
    if (this.locked) document.exitPointerLock();
  }

  setGround(ground: GroundSampler, blockers: Blocker[]): void {
    this.ground = ground;
    this.blockers = blockers;
  }

  /** 放置玩家（登岛时用）。 */
  place(x: number, z: number, yaw: number): void {
    const h = this.ground ? this.ground.heightAt(x, z) : 0;
    this.position.set(x, h + EYE_HEIGHT, z);
    this.yaw = yaw;
    this.pitch = 0;
    this.velocity.set(0, 0, 0);
    this.bobPhase = 0;
  }

  /** 当前站立点的地面坐标（不含眼高）。 */
  footPosition(target: THREE.Vector3): THREE.Vector3 {
    return target.set(this.position.x, this.position.y - EYE_HEIGHT, this.position.z);
  }

  update(dt: number): void {
    this.swayTime += dt;
    this.readGamepad(dt);

    const wish = new THREE.Vector2(0, 0);
    if (this.movementEnabled) {
      if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) wish.y += 1;
      if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) wish.y -= 1;
      if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) wish.x -= 1;
      if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) wish.x += 1;
      wish.add(this.padMove);
      if (wish.lengthSq() > 1) wish.normalize();
    }

    // Shift 或手柄扳机：只有真的在往前走时才算快跑，站着按住不作数
    this.sprintHeld =
      this.movementEnabled && (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') || this.padSprint);
    const speed = WALK_SPEED * (this.sprintHeld ? SPRINT_MULTIPLIER : 1);

    const sin = Math.sin(this.yaw);
    const cos = Math.cos(this.yaw);
    // yaw = 0 时朝 -Z 看，与 three 的相机默认朝向一致
    const forwardX = -sin;
    const forwardZ = -cos;
    const rightX = cos;
    const rightZ = -sin;

    const targetX = (forwardX * wish.y + rightX * wish.x) * speed;
    const targetZ = (forwardZ * wish.y + rightZ * wish.x) * speed;

    const accel = wish.lengthSq() > 0.0001 ? ACCELERATION : DAMPING;
    this.velocity.x += (targetX - this.velocity.x) * Math.min(1, accel * dt);
    this.velocity.z += (targetZ - this.velocity.z) * Math.min(1, accel * dt);
    if (Math.abs(this.velocity.x) < 1e-4) this.velocity.x = 0;
    if (Math.abs(this.velocity.z) < 1e-4) this.velocity.z = 0;

    this.moveWithCollision(this.velocity.x * dt, this.velocity.z * dt);

    // 贴地：向下跟随地形，向上（上台阶）稍快一点，避免抖动
    const groundY = this.ground ? this.ground.heightAt(this.position.x, this.position.z) : 0;
    const targetY = groundY + EYE_HEIGHT;
    const follow = targetY > this.position.y ? 14 : 9;
    this.position.y += (targetY - this.position.y) * Math.min(1, follow * dt);

    this.bobPhase += this.strideRatio * dt * 8.6;
  }

  /** 把当前姿态写进相机，包含步伐摆动与手持漂移。 */
  applyTo(camera: THREE.PerspectiveCamera): void {
    camera.position.copy(this.position);
    camera.rotation.set(0, 0, 0);
    camera.rotation.order = 'YXZ';

    let roll = 0;
    if (!this.reducedMotion) {
      const stride = this.strideRatio;
      const speed = this.speedRatio;
      // 步伐：竖向是横向的两倍频，这才是人走路的样子。快跑时幅度按步幅放大
      const bobY = Math.sin(this.bobPhase * 2) * 0.032 * stride;
      const bobX = Math.sin(this.bobPhase) * 0.026 * stride;
      roll = Math.sin(this.bobPhase) * 0.011 * stride;

      // 呼吸：站着不动时也有
      const breathe = Math.sin(this.swayTime * 0.85) * 0.011 * (1 - speed * 0.6);
      // 手持漂移：两个不同周期的慢正弦，避免看出规律
      const driftYaw = Math.sin(this.swayTime * 0.23) * 0.0022 + Math.sin(this.swayTime * 0.61) * 0.0011;
      const driftPitch = Math.cos(this.swayTime * 0.31) * 0.0018;

      camera.position.y += bobY + breathe;
      const sin = Math.sin(this.yaw);
      const cos = Math.cos(this.yaw);
      camera.position.x += cos * bobX;
      camera.position.z += -sin * bobX;
      camera.rotation.y = this.yaw + driftYaw;
      camera.rotation.x = this.pitch + driftPitch;
    } else {
      camera.rotation.y = this.yaw;
      camera.rotation.x = this.pitch;
    }
    camera.rotation.z = roll;
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
    document.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('blur', this.onBlur);
  }

  // --- 内部 ---

  private readonly padMove = new THREE.Vector2();
  private padSprint = false;

  private readGamepad(dt: number): void {
    this.padMove.set(0, 0);
    this.padSprint = false;
    const pads = navigator.getGamepads?.() ?? [];
    const pad = pads.find((p) => p !== null);
    if (!pad) return;
    // 左扳机快跑
    this.padSprint = (pad.buttons[6]?.value ?? 0) > 0.4 || (pad.buttons[10]?.pressed ?? false);
    const dead = (v: number): number => (Math.abs(v) < 0.18 ? 0 : v);
    this.padMove.set(dead(pad.axes[0] ?? 0), -dead(pad.axes[1] ?? 0));
    if (this.lookEnabled) {
      this.yaw -= dead(pad.axes[2] ?? 0) * 2.4 * dt * this.sensitivity;
      this.pitch -= dead(pad.axes[3] ?? 0) * 1.8 * dt * this.sensitivity;
      this.pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, this.pitch));
    }
  }

  /** 分轴推进，撞到东西时沿墙滑动而不是被卡死。 */
  private moveWithCollision(dx: number, dz: number): void {
    const tryAxis = (nx: number, nz: number): boolean => {
      if (this.ground && !this.ground.walkable(nx, nz)) return false;
      for (const b of this.blockers) {
        const ddx = nx - b.x;
        const ddz = nz - b.z;
        if (ddx * ddx + ddz * ddz < b.radius * b.radius) return false;
      }
      return true;
    };

    const nx = this.position.x + dx;
    if (tryAxis(nx, this.position.z)) {
      this.position.x = nx;
    } else {
      this.velocity.x *= 0.2;
    }
    const nz = this.position.z + dz;
    if (tryAxis(this.position.x, nz)) {
      this.position.z = nz;
    } else {
      this.velocity.z *= 0.2;
    }
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    this.keys.add(event.code);
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    this.keys.delete(event.code);
  };

  private readonly onBlur = (): void => {
    this.keys.clear();
  };

  private readonly onPointerLockChange = (): void => {
    this.locked = document.pointerLockElement === this.canvas;
  };

  private readonly onMouseMove = (event: MouseEvent): void => {
    if (!this.locked || !this.lookEnabled) return;
    const scale = 0.0021 * this.sensitivity;
    this.yaw -= event.movementX * scale;
    this.pitch -= event.movementY * scale;
    this.pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, this.pitch));
  };
}

export { EYE_HEIGHT, WALK_SPEED };
