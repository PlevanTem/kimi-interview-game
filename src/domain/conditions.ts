import type { Condition } from '../content/types'

/** 条件求值所需的最小状态切片。domain 层不依赖 React。 */
export interface ConditionContext {
  facts: ReadonlySet<string>
  locked: ReadonlySet<string>
  flags: ReadonlySet<string>
  trust: number
}

/**
 * 求值一条门控条件。
 *
 * 全部分支都是纯读取，无副作用——对话选项、抉择可用性、条目出现与否都走这里，
 * 保证"什么时候能说什么话"这件事只有一个真相来源。
 */
export function evaluate(condition: Condition, ctx: ConditionContext): boolean {
  if ('has' in condition) return ctx.facts.has(condition.has)
  if ('locked' in condition) return ctx.locked.has(condition.locked)
  if ('lockedCount' in condition) return ctx.locked.size >= condition.lockedCount
  if ('flag' in condition) return ctx.flags.has(condition.flag)
  if ('trust' in condition) return ctx.trust >= condition.trust
  if ('not' in condition) return !evaluate(condition.not, ctx)
  if ('all' in condition) return condition.all.every((c) => evaluate(c, ctx))
  return condition.any.some((c) => evaluate(c, ctx))
}

/** 条件缺省视为恒真——内容层大多数选项不需要门控。 */
export function evaluateOptional(condition: Condition | undefined, ctx: ConditionContext): boolean {
  return condition === undefined || evaluate(condition, ctx)
}

/**
 * 从一组带条件的候选中取第一个满足者。
 * 用于挑选 NPC 的对话入口节点：内容层把最苛刻的条件写在前面，最后一项作兜底。
 */
export function firstMatching<T extends { when?: Condition }>(
  candidates: readonly T[],
  ctx: ConditionContext,
): T | undefined {
  return candidates.find((candidate) => evaluateOptional(candidate.when, ctx))
}
