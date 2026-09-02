import { readdir, readFile } from 'node:fs/promises'; import { exists, fromRoot, fail, finish } from './lib/project.mjs';
const errors=[]; const expected=['game-concept-forge','vertical-slice-design','visual-language-system','asset-context-governance','web3d-demo-build','game-quality-loop'];
if(!(await exists('.agents/skills'))) fail(errors,'缺少 .agents/skills（技能 staging 未归位时属于预期阻塞）');
else for(const name of expected){ const rel=`.agents/skills/${name}/SKILL.md`; if(!(await exists(rel))) { fail(errors,`缺少技能: ${name}`); continue; } const text=await readFile(fromRoot(rel),'utf8'); if(!/^---\s*[\s\S]*?name:\s*.+[\s\S]*?description:\s*.+[\s\S]*?---/m.test(text)) fail(errors,`${name} 缺少有效 frontmatter`); }
finish(errors,'validate-skills');
