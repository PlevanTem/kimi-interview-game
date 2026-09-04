import { describe, expect, it } from 'vitest'
import { ISLANDS } from '../src/content'
import { evaluate, evaluateOptional, firstMatching } from '../src/domain/conditions'

const ctx = {
  facts: new Set(['F-a', 'F-b']),
  locked: new Set(['L-1']),
  flags: new Set(['done']),
  trust: 2,
}

describe('条件求值', () => {
  it('has / locked / flag', () => {
    expect(evaluate({ has: 'F-a' }, ctx)).toBe(true)
    expect(evaluate({ has: 'F-z' }, ctx)).toBe(false)
    expect(evaluate({ locked: 'L-1' }, ctx)).toBe(true)
    expect(evaluate({ flag: 'done' }, ctx)).toBe(true)
  })

  it('lockedCount 与 trust 是阈值比较', () => {
    expect(evaluate({ lockedCount: 1 }, ctx)).toBe(true)
    expect(evaluate({ lockedCount: 2 }, ctx)).toBe(false)
    expect(evaluate({ trust: 2 }, ctx)).toBe(true)
    expect(evaluate({ trust: 3 }, ctx)).toBe(false)
  })

  it('not / all / any 可以嵌套', () => {
    expect(evaluate({ not: { has: 'F-z' } }, ctx)).toBe(true)
    expect(evaluate({ all: [{ has: 'F-a' }, { has: 'F-b' }] }, ctx)).toBe(true)
    expect(evaluate({ all: [{ has: 'F-a' }, { has: 'F-z' }] }, ctx)).toBe(false)
    expect(evaluate({ any: [{ has: 'F-z' }, { flag: 'done' }] }, ctx)).toBe(true)
    expect(evaluate({ not: { all: [{ has: 'F-a' }, { not: { flag: 'done' } }] } }, ctx)).toBe(true)
  })

  it('缺省条件视为恒真', () => {
    expect(evaluateOptional(undefined, ctx)).toBe(true)
  })

  it('firstMatching 取第一个满足者', () => {
    const picked = firstMatching(
      [{ node: 'a', when: { has: 'F-z' } }, { node: 'b', when: { has: 'F-a' } }, { node: 'c' }],
      ctx,
    )
    expect(picked?.node).toBe('b')
  })
})

describe('对话树完整性', () => {
  it('每个 NPC 的入口节点都存在，且最后一项无条件兜底', () => {
    for (const island of ISLANDS) {
      for (const npc of island.npcs) {
        const ids = new Set(npc.nodes.map((n) => n.id))
        expect(npc.entries.length, `${npc.name} 需要至少一个入口`).toBeGreaterThan(0)
        for (const entry of npc.entries) {
          expect(ids, `${npc.name} 的入口 ${entry.node}`).toContain(entry.node)
        }
        expect(npc.entries[npc.entries.length - 1].when, `${npc.name} 的最后一个入口必须无条件`).toBeUndefined()
      }
    }
  })

  it('每个对话选项的 goto 都指向存在的节点', () => {
    for (const island of ISLANDS) {
      for (const npc of island.npcs) {
        const ids = new Set(npc.nodes.map((n) => n.id))
        for (const node of npc.nodes) {
          for (const choice of node.choices) {
            if (choice.goto) expect(ids, `${npc.name}/${node.id}`).toContain(choice.goto)
          }
        }
      }
    }
  })

  it('每个节点都至少有一个选项（哪怕只是结束对话）', () => {
    for (const island of ISLANDS) {
      for (const npc of island.npcs) {
        for (const node of npc.nodes) {
          expect(node.choices.length, `${npc.name}/${node.id}`).toBeGreaterThan(0)
        }
      }
    }
  })

  it('每座岛的证物 tableau 引用都指向本岛真实存在的定影', () => {
    for (const island of ISLANDS) {
      const ids = new Set(island.tableaux.map((t) => t.id))
      for (const ev of island.evidence) {
        if (ev.tableau) expect(ids, `${island.name}/${ev.id}`).toContain(ev.tableau)
      }
    }
  })
})
