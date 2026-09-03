import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../..");
const gameId = "odyssey-reimagined";
const failures = [];

const fail = (message) => failures.push(message);
const readJson = async (relativePath) => JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
const exists = async (relativePath) => {
  try {
    await access(path.join(root, relativePath));
    return true;
  } catch {
    return false;
  }
};

const gameRoot = `games/${gameId}`;
const registry = await readJson("games/registry.json");
const manifest = await readJson(`${gameRoot}/manifest.json`);
const context = await readJson(`${gameRoot}/context/index.json`);
const brief = await readJson(`${gameRoot}/context/game-brief-sea-of-thousand-names-v2.json`);
const gameplay = await readJson(`${gameRoot}/context/gameplay-sea-of-thousand-names-v2.json`);
const technology = await readJson(`${gameRoot}/context/technology-decision-sea-of-thousand-names-v4.json`);
const assets = await readJson(`${gameRoot}/assets/asset-registry-v1.json`);
const activeInput = await readJson(context.sources.activeRunInput);
const activeResults = await readJson(context.sources.activeRunResults);

if (registry.activeGameId !== gameId || registry.productionPaused) {
  fail("odyssey-reimagined must be the active, unpaused game");
}
if (!registry.games.some((game) => game.id === gameId && game.status === "graybox")) {
  fail("active game must be registered as graybox");
}
if (manifest.id !== gameId || manifest.status !== "graybox") fail("manifest identity/status mismatch");
if (manifest.gateState?.gate1 !== "locked") fail("Gate 1 must remain human-locked");
for (const gate of ["gate2", "gate3", "gate4"]) {
  if (manifest.gateState?.[gate] !== "blocked" || context.gateState?.[gate] !== "blocked") {
    fail(`${gate} must remain blocked pending human approval`);
  }
}
if (manifest.technologyDecision !== `${gameRoot}/context/technology-decision-sea-of-thousand-names-v4.json`) {
  fail("manifest must point to the approved technology decision");
}

if (context.activeRunId !== activeInput.runId || activeResults.runId !== activeInput.runId) {
  fail("active run input/results provenance mismatch");
}
if (context.sources?.styleBible !== null) fail("formal StyleBible must remain null before Gate 3");
for (const [name, target] of Object.entries(context.sources ?? {})) {
  if (target === null) continue;
  if (!target.startsWith(`${gameRoot}/`)) fail(`cross-game source ${name}: ${target}`);
  else if (!(await exists(target))) fail(`missing indexed source ${name}: ${target}`);
}
for (const target of context.readOrder ?? []) {
  if (!target.startsWith(`${gameRoot}/`)) fail(`cross-game readOrder target: ${target}`);
  else if (!(await exists(target))) fail(`missing readOrder target: ${target}`);
}

if (brief.id !== "brief-sea-of-thousand-names-v2" || brief.status !== "frozen" || !brief.frozen) {
  fail("Brief v2 must be the frozen full-game brief");
}
if ("sessionMinutes" in brief) fail("full-game brief must not inherit a fixed Demo duration");
if (brief.demoValidation?.role !== "early_playable_level_and_risk_evidence_slice") {
  fail("Brief must separate the playable slice from the full game");
}
if ((brief.demoValidation?.requiredCoverage ?? []).length < 7) fail("Demo coverage is incomplete");

if (technology.status !== "locked" || technology.locked !== true) fail("Tech Fit must be locked");
if (technology.selectedCandidateId !== "web-native-three-r3f") fail("wrong technology selected");
if (technology.humanApproval?.decisionMaker !== "human_user" || technology.humanApproval?.result !== "approved") {
  fail("Tech Fit lacks explicit human approval");
}
if (technology.selectedStack?.scene !== "React Three Fiber 9.3.0"
  || technology.selectedStack?.renderer !== "Three.js 0.180.0 WebGL2") {
  fail("locked Three/R3F versions drifted");
}

if (gameplay.status !== "implementation_ready_graybox" || gameplay.briefId !== brief.id) {
  fail("gameplay v2 must match the active brief and graybox state");
}
for (const state of ["TITLE", "SHORE", "IDENTITY", "GUARD_TUTORIAL", "WARDEN_FIGHT", "NAME_RESOLUTION", "RUMOR_PREVIEW", "SUCCESS", "FAILURE", "PAUSED"]) {
  if (!gameplay.stateMachine?.states?.includes(state)) fail(`missing gameplay state ${state}`);
}
if ((gameplay.combat?.victoryChoices ?? []).length !== 3) fail("combat must retain three name resolutions");
if ((gameplay.tutorial ?? []).length < 5) fail("tutorial contract is incomplete");

if (!assets.approvalPolicy?.includes("Gate 3 is blocked")) fail("asset registry must preserve the Gate 3 boundary");
if (!(assets.assets ?? []).every((asset) => asset.approval === "graybox-only")) {
  fail("no registered asset may be production-approved before Gate 3");
}
const assetIds = new Set((assets.assets ?? []).map((asset) => asset.id));
for (const actor of gameplay.actors ?? []) {
  if (!assetIds.has(actor.asset)) fail(`actor asset is not registered: ${actor.asset}`);
}
for (const requiredFile of [
  `${gameRoot}/src/App.tsx`,
  `${gameRoot}/src/CharacterLab.tsx`,
  `${gameRoot}/src/HeroCharacterModel.tsx`,
  `${gameRoot}/tests/e2e/vertical-slice.spec.ts`,
  `${gameRoot}/tests/e2e/character-lab.spec.ts`,
  `${gameRoot}/runs/run-20260904-sea-of-thousand-names-action-vertical-slice-v1/success-screen.png`,
  `${gameRoot}/runs/run-20260904-sea-of-thousand-names-hero-code-model-v1/character-lab.png`,
]) {
  if (!(await exists(requiredFile))) fail(`missing implementation/evidence file: ${requiredFile}`);
}

if (failures.length) {
  console.error("validate-sea-of-thousand-names-action-demo-v1: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log("validate-sea-of-thousand-names-action-demo-v1: PASS");
  console.log(`activeRun=${context.activeRunId}`);
  console.log(`technology=${technology.selectedStack.renderer} + ${technology.selectedStack.scene}`);
  console.log(`assets=${assets.assets.length} all graybox-only`);
  console.log("gate2=blocked gate3=blocked gate4=blocked");
}
