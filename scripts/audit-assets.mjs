import { readFile } from 'node:fs/promises';
import { json, exists, fail, finish, fromRoot } from './lib/project.mjs';
const errors=[]; const registry=await json('game-context/asset-registry.json'); const assets=registry.assets??[]; const ids=assets.map(a=>a.id);
if(new Set(ids).size!==ids.length) fail(errors,'资产 ID 重复');
for(const asset of assets){
  if(!asset.license) fail(errors,`${asset.id} 缺少 license`);
  if(!asset.styleTags?.length) fail(errors,`${asset.id} 缺少 styleTags`);
  if(asset.sizeBudgetBytes<0) fail(errors,`${asset.id} sizeBudgetBytes 不合法`);
  if(asset.locator?.kind==='file' && !(await exists(asset.locator.value))) fail(errors,`${asset.id} 文件不存在: ${asset.locator.value}`);
  for(const dependency of asset.dependencies??[]) if(!ids.includes(dependency)) fail(errors,`${asset.id} 依赖未登记: ${dependency}`);
}
const catalogSource = await readFile(fromRoot('src/assets/catalog.ts'), 'utf8');
const catalogIds = [...catalogSource.matchAll(/^\s*'([^']+)':/gm)].map(match => match[1]);
for (const id of catalogIds) if (!ids.includes(id)) fail(errors, `代码资产未登记: ${id}`);
for (const id of ids) if (!catalogIds.includes(id)) fail(errors, `注册表孤儿资产: ${id}`);
finish(errors,'audit-assets');
