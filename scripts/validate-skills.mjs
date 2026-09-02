import { readFile } from 'node:fs/promises'; import { exists, fromRoot, fail, finish } from './lib/project.mjs';
const errors=[];
const expected=['game-concept-forge','vertical-slice-design','technology-fit-selection','visual-language-system','asset-context-governance','adaptive-prototype-build','game-quality-loop'];
const expectedAgents=['concept-director','experience-designer','visual-director','prototype-engineer','quality-auditor'];
if(!(await exists('.agents/skills'))) fail(errors,'缺少 .agents/skills（技能 staging 未归位时属于预期阻塞）');
else for(const name of expected){ const rel=`.agents/skills/${name}/SKILL.md`; if(!(await exists(rel))) { fail(errors,`缺少技能: ${name}`); continue; } const text=await readFile(fromRoot(rel),'utf8'); if(!/^---\s*[\s\S]*?name:\s*.+[\s\S]*?description:\s*.+[\s\S]*?---/m.test(text)) fail(errors,`${name} 缺少有效 frontmatter`); }
if(!(await exists('.codex/agents'))) fail(errors,'缺少 .codex/agents');
else for(const name of expectedAgents){ const rel=`.codex/agents/${name}.toml`; if(!(await exists(rel))) { fail(errors,`缺少专家: ${name}`); continue; } const text=await readFile(fromRoot(rel),'utf8'); if(!new RegExp(`^name\\s*=\\s*"${name}"`,'m').test(text) || !/^description\s*=\s*".+"/m.test(text) || !/^developer_instructions\s*=\s*"""/m.test(text)) fail(errors,`${name} 配置契约不完整`); }
finish(errors,'validate-skills');
