import { readdir } from 'node:fs/promises';
import { json, exists, fail, finish } from './lib/project.mjs';

const errors = [];
const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
let registry;

try {
  registry = await json('games/registry.json');
} catch (error) {
  fail(errors, `无法解析游戏库: ${error.message}`);
  finish(errors, 'validate-library');
  process.exit();
}

const games = registry.games ?? [];
const ids = games.map((game) => game.id);

if (new Set(ids).size !== ids.length) fail(errors, 'games/registry.json 存在重复 game id');
if (registry.activeGameId !== null && !ids.includes(registry.activeGameId)) {
  fail(errors, `activeGameId 未登记: ${registry.activeGameId}`);
}
if (registry.productionPaused && registry.activeGameId !== null) {
  fail(errors, 'productionPaused=true 时 activeGameId 必须为 null');
}

for (const game of games) {
  if (!idPattern.test(game.id ?? '')) fail(errors, `非法 game id: ${game.id}`);
  const expectedPath = `games/${game.id}`;
  const expectedManifest = `${expectedPath}/manifest.json`;
  if (game.path !== expectedPath) fail(errors, `${game.id} path 必须为 ${expectedPath}`);
  if (game.manifest !== expectedManifest) fail(errors, `${game.id} manifest 必须为 ${expectedManifest}`);
  if (!(await exists(expectedManifest))) {
    fail(errors, `缺少 manifest: ${expectedManifest}`);
    continue;
  }
  const manifest = await json(expectedManifest);
  if (manifest.id !== game.id) fail(errors, `${game.id} 的 manifest id 不一致`);
  if (manifest.contextIndex !== `${expectedPath}/context/index.json`) {
    fail(errors, `${game.id} 的 contextIndex 不在自身工作区`);
  }
  for (const folder of ['context', 'runs', 'assets', 'src', 'tests', 'docs']) {
    if (!(await exists(`${expectedPath}/${folder}`))) fail(errors, `${game.id} 缺少目录: ${folder}`);
  }
}

const entries = await readdir('games', { withFileTypes: true });
const unmanaged = entries
  .filter((entry) => entry.isDirectory() && !entry.name.startsWith('_') && !ids.includes(entry.name))
  .map((entry) => entry.name);
if (unmanaged.length > 0) fail(errors, `存在未登记游戏目录: ${unmanaged.join(', ')}`);

for (const schema of ['game-library', 'game-manifest']) {
  if (!(await exists(`schemas/${schema}.schema.json`))) fail(errors, `缺少 schema: ${schema}`);
}

finish(errors, 'validate-library');
