import thaleiaPainterlyV2 from "./thaleia-painterly-v2.png";

const ASSET_TARGETS = Object.freeze({
  "game.odyssey-reimagined.experiment.portrait.thaleia-painterly": thaleiaPainterlyV2,
});

function resolveAsset(id) {
  const target = ASSET_TARGETS[id];
  if (!target) throw new Error(`ASSET_UNRESOLVED:${id}`);
  return target;
}

export { resolveAsset };
