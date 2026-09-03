import { readFile } from 'node:fs/promises';
import { exists, fromRoot, fail, finish } from './lib/project.mjs';

const errors = [];
const expected = [
  'game-concept-forge',
  'vertical-slice-design',
  'technology-fit-selection',
  'visual-language-system',
  'asset-context-governance',
  'adaptive-prototype-build',
  'game-quality-loop',
];
const expectedAgents = [
  'concept-director',
  'experience-designer',
  'visual-director',
  'prototype-engineer',
  'quality-auditor',
];

if (!(await exists('.agents/skills'))) {
  fail(errors, '缺少 .agents/skills（技能 staging 未归位时属于预期阻塞）');
} else {
  for (const name of expected) {
    const relativePath = `.agents/skills/${name}/SKILL.md`;
    if (!(await exists(relativePath))) {
      fail(errors, `缺少技能: ${name}`);
      continue;
    }
    const content = await readFile(fromRoot(relativePath), 'utf8');
    if (!/^---\s*[\s\S]*?name:\s*.+[\s\S]*?description:\s*.+[\s\S]*?---/m.test(content)) {
      fail(errors, `${name} 缺少有效 frontmatter`);
    }
  }
}

if (!(await exists('.codex/agents'))) {
  fail(errors, '缺少 .codex/agents');
} else {
  for (const name of expectedAgents) {
    const relativePath = `.codex/agents/${name}.toml`;
    if (!(await exists(relativePath))) {
      fail(errors, `缺少专家: ${name}`);
      continue;
    }
    const content = await readFile(fromRoot(relativePath), 'utf8');
    const hasName = new RegExp(`^name\\s*=\\s*"${name}"`, 'm').test(content);
    const hasDescription = /^description\s*=\s*".+"/m.test(content);
    const hasInstructions = /^developer_instructions\s*=\s*"""/m.test(content);
    if (!hasName || !hasDescription || !hasInstructions) {
      fail(errors, `${name} 配置契约不完整`);
    }
  }
}

const activeConceptInstructions = [
  '.agents/skills/game-concept-forge/SKILL.md',
  '.agents/skills/vertical-slice-design/SKILL.md',
  '.codex/agents/concept-director.toml',
];
const forbiddenFixedDurationRules = [
  /Required:[^\n]*(?:3[–-]5|five)[^\n]*minute/i,
  /Produce[^\n]*(?:3[–-]5|five)[^\n]*minute[^\n]*concept/i,
  /a run fits five minutes/i,
];

for (const relativePath of activeConceptInstructions) {
  const content = await readFile(fromRoot(relativePath), 'utf8');
  if (forbiddenFixedDurationRules.some((pattern) => pattern.test(content))) {
    fail(errors, `${relativePath} 把固定分钟数重新设为完整游戏或统一 Demo 硬约束`);
  }
}

finish(errors, 'validate-skills');
