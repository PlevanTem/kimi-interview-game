import { access, readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const gameRoot = fileURLToPath(new URL('../', import.meta.url));
const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url));
const registryPath = path.join(gameRoot, 'context/asset-registry.json');
const resolverPath = path.join(gameRoot, 'src/presentation/assetResolver.ts');
const sourceRoot = path.join(gameRoot, 'src');
const registry = JSON.parse(await readFile(registryPath, 'utf8'));
const resolver = await readFile(resolverPath, 'utf8');

if (registry.version !== 2 || !Array.isArray(registry.assets) || registry.assets.length === 0) {
  throw new Error('Asset registry is empty or has an unsupported version');
}

const ids = new Set();
const targets = new Set();
const byId = new Map();
for (const asset of registry.assets) {
  if (!asset.id.startsWith('game.odyssey-drifter.')) throw new Error(`Invalid asset namespace: ${asset.id}`);
  if (ids.has(asset.id)) throw new Error(`Duplicate asset ID: ${asset.id}`);
  const targetKey = asset.locator.kind === 'procedural-entrypoint'
    ? `${asset.locator.value}#${asset.locator.symbol ?? ''}`
    : asset.locator.value;
  if (targets.has(targetKey)) throw new Error(`Duplicate asset target: ${targetKey}`);
  ids.add(asset.id);
  targets.add(targetKey);
  byId.set(asset.id, asset);
  const locatorPath = path.resolve(repositoryRoot, asset.locator.value);
  await access(locatorPath);
  const fileInfo = await stat(locatorPath);
  if (fileInfo.size > asset.sizeBudgetBytes) throw new Error(`Asset exceeds size budget: ${asset.id}`);
  if (asset.locator.kind === 'procedural-entrypoint') {
    if (asset.approval !== 'graybox-only') throw new Error(`Procedural graybox asset has unexpected approval: ${asset.id}`);
    const locatorSource = await readFile(locatorPath, 'utf8');
    if (!locatorSource.includes(asset.id)) throw new Error(`Locator does not define its registered ID: ${asset.id}`);
    if (asset.locator.symbol && !locatorSource.includes(`const ${asset.locator.symbol}`)) {
      throw new Error(`Locator does not define symbol ${asset.locator.symbol}: ${asset.id}`);
    }
  } else if (asset.locator.kind === 'file') {
    if (asset.approval !== 'pending') throw new Error(`Concept file must remain pending before Gate 3: ${asset.id}`);
    if (!asset.promptHash || !asset.generation?.promptFile) throw new Error(`Generated file lacks prompt traceability: ${asset.id}`);
    const promptPath = path.resolve(repositoryRoot, asset.generation.promptFile);
    await access(promptPath);
    const promptDigest = createHash('sha256').update(await readFile(promptPath)).digest('hex');
    if (asset.promptHash !== `sha256:${promptDigest}`) throw new Error(`Prompt hash mismatch: ${asset.id}`);
    const imageDigest = createHash('sha256').update(await readFile(locatorPath)).digest('hex');
    if (asset.generation.imageSha256 !== imageDigest) throw new Error(`Image hash mismatch: ${asset.id}`);
  } else {
    throw new Error(`Unsupported locator kind: ${asset.locator.kind}`);
  }
}

for (const asset of registry.assets) {
  for (const dependency of asset.dependencies) {
    if (!byId.has(dependency)) throw new Error(`Unresolved dependency ${dependency} from ${asset.id}`);
  }
}

const visit = (id, active = new Set(), visited = new Set()) => {
  if (active.has(id)) throw new Error(`Asset dependency cycle at ${id}`);
  if (visited.has(id)) return;
  active.add(id);
  for (const dependency of byId.get(id)?.dependencies ?? []) visit(dependency, active, visited);
  active.delete(id);
  visited.add(id);
};
for (const id of ids) visit(id);

const renderer = await readFile(path.join(sourceRoot, 'presentation/renderer.ts'), 'utf8');
if (!resolver.includes('GRAYBOX_ASSET_ID') || !resolver.includes('createGrayboxPrimitives')) throw new Error('Resolver does not register the graybox asset symbol');
if (renderer.includes("from './grayboxAssets'")) throw new Error('Renderer bypasses the stable asset resolver');

const godotResolverPath = path.join(sourceRoot, 'godot/scripts/asset_resolver.gd');
const godotMainPath = path.join(sourceRoot, 'godot/scripts/main.gd');
const godotAssets = registry.assets.filter((asset) => asset.locator.value.endsWith('src/godot/scripts/asset_resolver.gd'));
if (godotAssets.length > 0) {
  const godotResolver = await readFile(godotResolverPath, 'utf8');
  const godotMain = await readFile(godotMainPath, 'utf8');
  for (const asset of godotAssets) {
    if (!godotResolver.includes(asset.id)) throw new Error(`Godot resolver lacks ID: ${asset.id}`);
  }
  if (!godotMain.includes('LightlineAssetResolver')) throw new Error('Godot main does not consume the stable asset resolver');
  if (godotMain.includes('res://assets/')) throw new Error('Godot main bypasses the stable asset resolver');
}

console.log(`asset-audit: PASS (${registry.assets.length} registered, 0 unresolved, 0 resolver bypasses)`);
