import { CREW, EXTRA_OPTIONS } from '../content/crew'
import type { LedgerEntry, LedgerOption } from '../content/types'

/**
 * 归乡录的核心机制：**三条一组校验**。
 *
 * 这是本作对标《Obra Dinn》最关键的一条规则，原样沿用：
 * 单独填对一条**不会有任何反馈**——没有对勾、没有提示、没有音效。只有当尚未锁定
 * 的条目中累计出现三条全部正确时，它们才会一起锁定并响铃。
 *
 * 这条规则的意义是从机制上杜绝暴力穷举：玩家无法靠逐个试错来确认单条答案，
 * 必须先在脑子里建立起三条互相印证的推理，才能换来一次确认。
 */
export const LOCK_THRESHOLD = 3

/** 玩家在归乡录里填下的答案：条目 id → 每个下拉框选中的选项 id（未填为 null）。 */
export type LedgerAnswers = Readonly<Record<string, readonly (string | null)[]>>

/** 一条条目是否被完整且正确地填写。空槽一律视为未填对。 */
export function isEntryCorrect(entry: LedgerEntry, answers: LedgerAnswers): boolean {
  const filled = answers[entry.id]
  if (!filled) return false
  return entry.slots.every((slot, index) => filled[index] === slot.answer)
}

export interface LockResult {
  /** 本次校验后新锁定的条目 id。空数组表示没到阈值。 */
  newlyLocked: string[]
  /** 合并后的完整锁定集合。 */
  locked: Set<string>
}

/**
 * 执行一次三条一组校验。
 *
 * 玩家每次只能改动一个下拉框，所以"正确且未锁定"的条目数每次至多 +1；一旦达到
 * 阈值就把当时全部正确的条目一并锁定。锁定不可逆——已锁条目不再参与后续计数，
 * 也不允许再修改。
 */
export function checkLocks(
  entries: readonly LedgerEntry[],
  answers: LedgerAnswers,
  locked: ReadonlySet<string>,
): LockResult {
  const correct = entries
    .filter((entry) => !locked.has(entry.id) && isEntryCorrect(entry, answers))
    .map((entry) => entry.id)

  if (correct.length < LOCK_THRESHOLD) {
    return { newlyLocked: [], locked: new Set(locked) }
  }
  return { newlyLocked: correct, locked: new Set([...locked, ...correct]) }
}

/**
 * 某个下拉框此刻可选的选项。
 *
 * - `crew` 池（人名）**受证物门控**：一个名字只有在某件证物或某段记忆揭示过之后
 *   才会出现在列表里。玩家永远不会看到没有依据的名字。
 * - 其余池（死因、手段、动机……）**始终全部可见**，与《Obra Dinn》里"命运列表"
 *   一开始就全部列出的做法一致：难点在于指认谁，而不是猜有哪些可能。
 */
export function availableOptions(pool: string, facts: ReadonlySet<string>): LedgerOption[] {
  if (pool === 'crew') {
    return CREW.filter((member) => member.revealedBy.some((fact) => facts.has(fact))).map(
      ({ id, label }) => ({ id, label }),
    )
  }
  return EXTRA_OPTIONS[pool] ?? []
}

/** 某岛已锁定的条目数，用于离岛条件与抉择门控。 */
export function lockedOnIsland(
  entries: readonly LedgerEntry[],
  locked: ReadonlySet<string>,
  island: string,
): number {
  return entries.filter((entry) => entry.island === island && locked.has(entry.id)).length
}
