import { describe, expect, it } from 'vitest';
import { CRUMBLE_SECONDS, VisionTimeline } from '../src/game/vision';
import { LinePlayer } from '../src/game/talk';
import { holdFor, type VisionDef } from '../src/game/types';

const DEF: VisionDef = {
  id: 'test.vision',
  duration: 30,
  stage: { x: 0, y: 0, z: 0 },
  beats: [
    { at: 0, line: '第一句', camera: { yaw: 0.2, fov: -6, ease: 2 } },
    { at: 5, line: '第二句', motif: { kind: 'galley', x: 0, y: 4, z: -10, size: 8 } },
    { at: 12, line: '第三句', camera: { yaw: -0.4, ease: 4 }, exposure: 1.4 },
    { at: 20, line: '第四句' },
  ],
};

/** 按固定步长推进，模拟主循环。 */
function run(timeline: VisionTimeline, seconds: number): void {
  const step = 1 / 60;
  for (let t = 0; t < seconds; t += step) timeline.advance(step);
}

describe('幻象时间轴', () => {
  it('每一拍只触发一次，且按时间顺序触发', () => {
    const timeline = new VisionTimeline(DEF);
    const fired: number[] = [];
    const step = 1 / 60;
    for (let t = 0; t < 25; t += step) fired.push(...timeline.advance(step));
    expect(fired).toEqual([0, 1, 2, 3]);
  });

  it('强度包络在进入时淡入、结束前淡出', () => {
    const timeline = new VisionTimeline(DEF);
    expect(timeline.intensity).toBe(0);
    run(timeline, 2);
    expect(timeline.intensity).toBeCloseTo(1, 2);
    run(timeline, 27);
    expect(timeline.intensity).toBeLessThan(0.6);
    expect(timeline.intensity).toBeGreaterThan(0);
  });

  it('崩解只发生在最后一段，之前恒为 0', () => {
    const timeline = new VisionTimeline(DEF);
    run(timeline, DEF.duration - CRUMBLE_SECONDS - 1);
    expect(timeline.crumble).toBe(0);
    run(timeline, CRUMBLE_SECONDS + 1);
    expect(timeline.crumble).toBe(1);
  });

  it('时间走完后标记结束', () => {
    const timeline = new VisionTimeline(DEF);
    run(timeline, DEF.duration + 0.5);
    expect(timeline.done).toBe(true);
  });

  it('跳过会把时间推到崩解段，让画面碎掉而不是硬切', () => {
    const timeline = new VisionTimeline(DEF);
    run(timeline, 3);
    timeline.skip();
    expect(timeline.skipped).toBe(true);
    expect(timeline.time).toBeCloseTo(DEF.duration - CRUMBLE_SECONDS, 5);
    expect(timeline.done).toBe(false);
    run(timeline, CRUMBLE_SECONDS + 0.5);
    expect(timeline.done).toBe(true);
  });

  it('跳过是幂等的，连按不会把时间推得更远', () => {
    const timeline = new VisionTimeline(DEF);
    run(timeline, 3);
    timeline.skip();
    const first = timeline.time;
    timeline.skip();
    expect(timeline.time).toBe(first);
  });

  it('字幕跟着当前这一拍走，说完就消失', () => {
    const timeline = new VisionTimeline(DEF);
    run(timeline, 0.5);
    expect(timeline.captionAt()?.text).toBe('第一句');
    run(timeline, 5);
    expect(timeline.captionAt()?.text).toBe('第二句');
    // 第四句在 20 秒，它说完之后到 duration 之间应该是安静的
    run(timeline, 19);
    expect(timeline.time).toBeGreaterThan(20 + holdFor('第四句'));
    expect(timeline.captionAt()).toBeNull();
  });

  it('镜头推力在两拍之间平滑插值，不会瞬移', () => {
    const timeline = new VisionTimeline(DEF);
    run(timeline, 0.02);
    expect(timeline.cameraCue().yaw).toBeLessThan(0.05);
    run(timeline, 3);
    expect(timeline.cameraCue().yaw).toBeCloseTo(0.2, 1);
    // 第三拍把镜头带向另一侧，中途必须落在两个目标之间
    run(timeline, 10);
    const mid = timeline.cameraCue().yaw;
    expect(mid).toBeLessThan(0.2);
    expect(mid).toBeGreaterThan(-0.4);
    run(timeline, 5);
    expect(timeline.cameraCue().yaw).toBeCloseTo(-0.4, 1);
  });

  it('曝光倍率在触发后向 1 回落', () => {
    const timeline = new VisionTimeline(DEF);
    run(timeline, 12.05);
    expect(timeline.exposureScale()).toBeGreaterThan(1.2);
    run(timeline, 2);
    expect(timeline.exposureScale()).toBeCloseTo(1, 2);
  });
});

describe('逐句播放器', () => {
  it('按估算时长自动推进，说完即结束', () => {
    const player = new LinePlayer(['第一句话', '第二句话']);
    expect(player.caption?.text).toBe('第一句话');
    player.update(holdFor('第一句话') + 0.01);
    expect(player.caption?.text).toBe('第二句话');
    player.update(holdFor('第二句话') + 0.01);
    expect(player.done).toBe(true);
    expect(player.caption).toBeNull();
  });

  it('手动推进可以跳过当前这句', () => {
    const player = new LinePlayer(['甲', '乙', '丙']);
    player.next();
    expect(player.position).toBe(1);
    player.next();
    player.next();
    expect(player.done).toBe(true);
  });

  it('说话人会带进字幕；旁白没有说话人', () => {
    expect(new LinePlayer(['你来了。'], '留下的人').caption?.speaker).toBe('留下的人');
    expect(new LinePlayer(['水是温的。']).caption?.speaker).toBeUndefined();
  });

  it('空台词直接算作说完，不会卡住流程', () => {
    const player = new LinePlayer([]);
    expect(player.done).toBe(true);
    expect(player.caption).toBeNull();
    expect(() => player.update(1)).not.toThrow();
  });
});
