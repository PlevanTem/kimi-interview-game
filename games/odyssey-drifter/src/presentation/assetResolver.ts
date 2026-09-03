import { createGrayboxPrimitives, GRAYBOX_ASSET_ID } from './grayboxAssets';

export { GRAYBOX_ASSET_ID };

const proceduralAssets = {
  [GRAYBOX_ASSET_ID]: createGrayboxPrimitives
} as const;

export type ProceduralAssetId = keyof typeof proceduralAssets;

export function resolveProceduralAsset(id: ProceduralAssetId) {
  const factory = proceduralAssets[id];
  if (!factory) throw new Error(`Unresolved procedural asset: ${id}`);
  return factory;
}
