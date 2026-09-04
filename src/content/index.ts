import { LOTUS } from './islands/00-lotus'
import { CYCLOPS } from './islands/01-cyclops'
import { AEOLIA } from './islands/02-aeolia'
import { AIAIA } from './islands/03-aiaia'
import { THRINACIA } from './islands/04-thrinacia'
import { ITHACA } from './islands/05-ithaca'
import type { Evidence, Island, LedgerEntry, Tableau } from './types'

/** 五座岛 + 尾声，按航程顺序。岛与岛之间完全隔离，没有返回、没有无缝地图。 */
export const ISLANDS: Island[] = [LOTUS, CYCLOPS, AEOLIA, AIAIA, THRINACIA, ITHACA]

export const ALL_EVIDENCE: Evidence[] = ISLANDS.flatMap((island) => island.evidence)
export const ALL_TABLEAUX: Tableau[] = ISLANDS.flatMap((island) => island.tableaux)
export const ALL_LEDGER_ENTRIES: LedgerEntry[] = ISLANDS.flatMap((island) => island.ledger)

export const EVIDENCE_BY_ID = new Map(ALL_EVIDENCE.map((e) => [e.id, e]))
export const TABLEAU_BY_ID = new Map(ALL_TABLEAUX.map((t) => [t.id, t]))
export const ISLAND_BY_ID = new Map(ISLANDS.map((i) => [i.id, i]))

export * from './types'
