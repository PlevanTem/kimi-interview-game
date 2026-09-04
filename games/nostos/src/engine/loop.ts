/**
 * 固定步长主循环。
 *
 * 物理与镜头呼吸走固定 1/60 步长，渲染跟随刷新率。
 * 这样在 144Hz 屏上头部摆动的节奏不会变快，走路的"呼吸感"是恒定的。
 */
export type UpdateFn = (dt: number, elapsed: number) => void;
export type RenderFn = (alpha: number, elapsed: number) => void;

const STEP = 1 / 60;
const MAX_FRAME = 0.5;
const MAX_STEPS = Math.ceil(MAX_FRAME / STEP);

export class GameLoop {
  private raf = 0;
  private last = 0;
  private accumulator = 0;
  private elapsed = 0;
  private running = false;

  /** 供测试与性能断言读取的帧计数 */
  frames = 0;

  constructor(
    private readonly update: UpdateFn,
    private readonly render: RenderFn,
  ) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.last = performance.now() / 1000;
    this.raf = requestAnimationFrame(this.tick);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  get time(): number {
    return this.elapsed;
  }

  private readonly tick = (): void => {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.tick);

    const now = performance.now() / 1000;
    // 标签页切回来时不要一次性补上几十秒；
    // 上限取得比一般"两三帧"更宽，是为了在软件渲染这类极低帧率下
    // 模拟时间仍能跟上墙上时钟——否则整部作品会变成慢动作
    const frame = Math.min(now - this.last, MAX_FRAME);
    this.last = now;
    this.accumulator += frame;

    // 上限正好覆盖 MAX_FRAME，低帧率下模拟时间才不会越落越远；
    // 真的追不上就丢掉余量，宁可跳一下也不进入死亡螺旋
    let steps = 0;
    while (this.accumulator >= STEP && steps < MAX_STEPS) {
      this.update(STEP, this.elapsed);
      this.elapsed += STEP;
      this.accumulator -= STEP;
      steps += 1;
    }
    if (this.accumulator > STEP) this.accumulator = 0;

    this.frames += 1;
    this.render(this.accumulator / STEP, this.elapsed);
  };
}
