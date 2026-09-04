import { describe, expect, it } from 'vitest'
import { resolveEnding } from '../src/domain/endings'

const ctx = (over: Partial<{ truth: number; wrath: number; shades: number; flags: string[] }> = {}) => ({
  truth: over.truth ?? 0,
  wrath: over.wrath ?? 0,
  shades: over.shades ?? 0,
  flags: new Set(over.flags ?? []),
})

describe('结局判定', () => {
  it('吃过莲花且真相稀薄 → 遗忘者', () => {
    expect(resolveEnding(ctx({ flags: ['ate_lotus'], truth: 11 })).id).toBe('lethe')
  })

  it('吃过莲花但查清了足够多 → 不再是遗忘者', () => {
    expect(resolveEnding(ctx({ flags: ['ate_lotus'], truth: 12 })).id).not.toBe('lethe')
  })

  it('神怒满溢 → 僭越者，且优先级低于遗忘者', () => {
    expect(resolveEnding(ctx({ wrath: 7 })).id).toBe('hubris')
    expect(resolveEnding(ctx({ wrath: 9, flags: ['ate_lotus'], truth: 3 })).id).toBe('lethe')
  })

  it('近乎全解 + 送归大多数亡魂 + 归罪自己 → 不朽者', () => {
    expect(resolveEnding(ctx({ truth: 27, shades: 8, flags: ['blame_self'] })).id).toBe('athanatos')
  })

  it('不朽者三个条件缺一不可', () => {
    expect(resolveEnding(ctx({ truth: 26, shades: 9, flags: ['blame_self'] })).id).not.toBe('athanatos')
    expect(resolveEnding(ctx({ truth: 28, shades: 7, flags: ['blame_self'] })).id).not.toBe('athanatos')
    expect(resolveEnding(ctx({ truth: 28, shades: 9, flags: ['blame_crew'] })).id).not.toBe('athanatos')
  })

  it('真相够但几乎没人跟着走 → 孤舟者', () => {
    expect(resolveEnding(ctx({ truth: 20, shades: 2 })).id).toBe('monos')
  })

  it('真相够且带回三个以上 → 归乡者', () => {
    expect(resolveEnding(ctx({ truth: 20, shades: 3 })).id).toBe('nostos')
  })

  it('什么都没查清 → 无名者兜底', () => {
    expect(resolveEnding(ctx()).id).toBe('anonymos')
    expect(resolveEnding(ctx({ truth: 19, shades: 12 })).id).toBe('anonymos')
  })

  it('每个结局都有名字、希腊文和正文', () => {
    for (const c of [
      ctx({ flags: ['ate_lotus'] }),
      ctx({ wrath: 8 }),
      ctx({ truth: 30, shades: 12, flags: ['blame_self'] }),
      ctx({ truth: 22 }),
      ctx({ truth: 22, shades: 6 }),
      ctx(),
    ]) {
      const ending = resolveEnding(c)
      expect(ending.name.length).toBeGreaterThan(0)
      expect(ending.greek.length).toBeGreaterThan(0)
      expect(ending.lines.length).toBeGreaterThan(2)
    }
  })
})
