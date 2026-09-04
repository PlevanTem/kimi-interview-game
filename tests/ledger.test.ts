import { describe, expect, it } from 'vitest'
import { ALL_LEDGER_ENTRIES, ISLANDS } from '../src/content'
import { CREW, EXTRA_OPTIONS } from '../src/content/crew'
import type { LedgerEntry } from '../src/content/types'
import { availableOptions, checkLocks, isEntryCorrect, LOCK_THRESHOLD } from '../src/domain/ledger'
import { TRUTH_TOTAL } from '../src/domain/endings'

const entry = (id: string, ...answers: string[]): LedgerEntry => ({
  id,
  island: 'lotus',
  prompt: id,
  slots: answers.map((answer, i) => ({ label: `槽${i}`, pool: 'crew', answer })),
})

describe('三条一组校验', () => {
  const entries = [entry('A', 'a'), entry('B', 'b'), entry('C', 'c'), entry('D', 'd')]

  it('填对一条不锁定，也不给任何反馈', () => {
    const result = checkLocks(entries, { A: ['a'] }, new Set())
    expect(result.newlyLocked).toEqual([])
    expect(result.locked.size).toBe(0)
  })

  it('填对两条仍然不锁定', () => {
    const result = checkLocks(entries, { A: ['a'], B: ['b'] }, new Set())
    expect(result.newlyLocked).toEqual([])
  })

  it('第三条正确时三条一起锁定', () => {
    const result = checkLocks(entries, { A: ['a'], B: ['b'], C: ['c'] }, new Set())
    expect(result.newlyLocked.sort()).toEqual(['A', 'B', 'C'])
    expect(result.locked.size).toBe(LOCK_THRESHOLD)
  })

  it('已锁定的条目不再参与下一轮计数', () => {
    const locked = new Set(['A', 'B', 'C'])
    const result = checkLocks(entries, { A: ['a'], B: ['b'], C: ['c'], D: ['d'] }, locked)
    expect(result.newlyLocked).toEqual([])
    expect(result.locked.size).toBe(3)
  })

  it('填错不影响已锁定的条目', () => {
    const locked = new Set(['A', 'B', 'C'])
    const result = checkLocks(entries, { A: ['wrong'], D: ['wrong'] }, locked)
    expect([...result.locked].sort()).toEqual(['A', 'B', 'C'])
  })

  it('多槽条目必须全部正确才算正确', () => {
    const multi = entry('M', 'x', 'y')
    expect(isEntryCorrect(multi, { M: ['x', null] })).toBe(false)
    expect(isEntryCorrect(multi, { M: ['x', 'wrong'] })).toBe(false)
    expect(isEntryCorrect(multi, { M: ['x', 'y'] })).toBe(true)
  })

  it('未填写的条目永远不算正确', () => {
    expect(isEntryCorrect(entry('A', 'a'), {})).toBe(false)
    expect(isEntryCorrect(entry('A', 'a'), { A: [null] })).toBe(false)
  })
})

describe('选项可用性', () => {
  it('人名池受证物门控：没有相应事实就不出现在下拉框里', () => {
    expect(availableOptions('crew', new Set())).toEqual([])
    const withStart = availableOptions('crew', new Set(['F-start']))
    expect(withStart.map((o) => o.id).sort()).toEqual(['eurylochus', 'odysseus'])
  })

  it('揭示某个名字后它才可选', () => {
    const options = availableOptions('crew', new Set(['F-lotus-amulet']))
    expect(options.map((o) => o.id)).toContain('perimedes')
  })

  it('死因/动机等非人名池始终全部可见', () => {
    const options = availableOptions('lotus-cause', new Set())
    expect(options.length).toBe(EXTRA_OPTIONS['lotus-cause'].length)
  })

  it('未知池返回空数组而不是抛错', () => {
    expect(availableOptions('does-not-exist', new Set())).toEqual([])
  })
})

describe('内容完整性', () => {
  it('归乡录条目总数与结局判定的满值一致', () => {
    expect(ALL_LEDGER_ENTRIES.length).toBe(TRUTH_TOTAL)
  })

  it('每个 crew 槽的正确答案都是名册里真实存在的人', () => {
    const crewIds = new Set(CREW.map((m) => m.id))
    for (const e of ALL_LEDGER_ENTRIES) {
      for (const slot of e.slots) {
        if (slot.pool !== 'crew') continue
        expect(crewIds, `${e.id} 的答案 ${slot.answer}`).toContain(slot.answer)
      }
    }
  })

  it('每个非 crew 槽的正确答案都在对应选项池里', () => {
    for (const e of ALL_LEDGER_ENTRIES) {
      for (const slot of e.slots) {
        if (slot.pool === 'crew') continue
        const pool = EXTRA_OPTIONS[slot.pool] ?? []
        expect(pool.map((o) => o.id), `${e.id} 的池 ${slot.pool}`).toContain(slot.answer)
      }
    }
  })

  it('每个 crew 答案在其所属岛屿之前或之内已经能被解锁', () => {
    const crewById = new Map(CREW.map((m) => [m.id, m]))
    const revealed = new Set(['F-start'])
    for (const island of ISLANDS) {
      // 本岛所有证物与定影提供的事实，都在本岛内可获得。
      for (const ev of island.evidence) for (const f of ev.grantsFacts) revealed.add(f)
      for (const t of island.tableaux) for (const f of t.grantsFacts) revealed.add(f)
      for (const e of island.ledger) {
        for (const slot of e.slots) {
          if (slot.pool !== 'crew') continue
          const member = crewById.get(slot.answer)!
          expect(
            member.revealedBy.some((f) => revealed.has(f)),
            `${e.id} 需要的名字「${member.label}」在 ${island.name} 之内还无法解锁`,
          ).toBe(true)
        }
      }
    }
  })

  it('每条归乡录条目的 id 唯一', () => {
    const ids = ALL_LEDGER_ENTRIES.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('每座岛的离岛门槛不超过本岛条目数', () => {
    for (const island of ISLANDS) {
      expect(island.departureRequirement, island.name).toBeLessThanOrEqual(island.ledger.length)
    }
  })
})
