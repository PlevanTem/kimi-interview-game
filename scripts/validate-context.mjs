import { json, exists, fail, finish } from './lib/project.mjs';
const errors = [];
let index, brief, concepts, style;
try {
  index = await json('game-context/index.json'); brief = await json('game-context/game-brief.json');
  concepts = await json('game-context/concepts.json'); style = await json('game-context/style-bible.json');
} catch (error) { fail(errors, `无法解析核心上下文 JSON: ${error.message}`); finish(errors, 'validate-context'); process.exit(); }
for (const [name, target] of Object.entries(index.sources ?? {})) if (!(await exists(target))) fail(errors, `索引目标不存在: ${name} -> ${target}`);
if (concepts.candidates?.length !== 3) fail(errors, `概念数必须恰好为 3，实际 ${concepts.candidates?.length ?? 0}`);
const ids = concepts.candidates?.map(item => item.id) ?? [];
if (new Set(ids).size !== ids.length) fail(errors, 'ConceptCandidate id 重复');
const weights = concepts.scoring?.weights ?? {};
if (Math.abs(Object.values(weights).reduce((a, b) => a + b, 0) - 1) > 1e-9) fail(errors, '概念评分权重之和必须为 1');
for (const candidate of concepts.candidates ?? []) {
  const s = candidate.scores ?? {}; const expected = s.feasibility*.3+s.coreFun*.25+s.visualMemorability*.2+s.onboardingClarity*.15+s.scopeSafety*.1;
  if (Math.abs(expected - s.weightedTotal) > .011) fail(errors, `${candidate.id} weightedTotal 错误: 应为 ${expected.toFixed(2)}`);
}
if (index.gateState?.gate1 === 'pending') {
  if (concepts.selection !== null || concepts.status !== 'awaiting_human_selection') fail(errors, 'Gate 1 pending 时禁止选择概念');
  if (brief.frozen || brief.coreVerb !== null) fail(errors, 'Gate 1 pending 时 Brief 不得冻结或写入 coreVerb');
  if (style.approved || style.conceptId !== null || style.status !== 'blocked_by_gate1') fail(errors, 'Gate 1 pending 时 StyleBible 必须保持阻塞占位');
}
for (const schema of ['game-brief','concept-candidate','concept-candidates','style-bible','asset-record','asset-registry','eval-run','iteration-entry','iteration-ledger','context-index']) if (!(await exists(`schemas/${schema}.schema.json`))) fail(errors, `缺少 schema: ${schema}`);
finish(errors, 'validate-context');
