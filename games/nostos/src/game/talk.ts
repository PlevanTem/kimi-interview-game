import { holdFor, type Caption } from './types';

/**
 * 逐句播放器：环境线索的旁白、NPC 的短对话都走它。
 *
 * 没有分支，没有选项。这是一部只让人听的作品——四位 NPC 各说一段就走开，
 * 玩家唯一能做的是听完，或者按跳过键走开。这本身就是态度。
 */
export class LinePlayer {
  private index = 0;
  private remaining = 0;
  private started = false;

  constructor(
    private readonly lines: readonly string[],
    readonly speaker?: string,
  ) {
    this.remaining = lines.length > 0 ? holdFor(lines[0]!) : 0;
    this.started = lines.length > 0;
  }

  update(dt: number): void {
    if (!this.started || this.done) return;
    this.remaining -= dt;
    if (this.remaining <= 0) this.next();
  }

  /** 手动推进到下一句（玩家按了交互键）。 */
  next(): void {
    if (this.done) return;
    this.index += 1;
    this.remaining = this.index < this.lines.length ? holdFor(this.lines[this.index]!) : 0;
  }

  get done(): boolean {
    return !this.started || this.index >= this.lines.length;
  }

  get caption(): Caption | null {
    if (this.done) return null;
    const result: Caption = { text: this.lines[this.index]!, remaining: this.remaining };
    if (this.speaker !== undefined) result.speaker = this.speaker;
    return result;
  }

  /** 已播到第几句，从 0 开始。 */
  get position(): number {
    return this.index;
  }
}
