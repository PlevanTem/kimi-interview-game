export const assetCatalog = {
  'palette.void': '#070a0f',
  'palette.surface': '#101620',
  'palette.ink': '#edf4f2',
  'palette.muted': '#87938f',
  'palette.signal': '#b9ff66',
  'palette.signalSoft': '#62d4b6',
  'palette.alert': '#ff7a6a',
  'palette.gridMajor': '#26363b',
  'palette.gridMinor': '#151e25',
  'palette.inactive': '#29333a',
  'palette.ambient': '#b8d0d1',
  'palette.key': '#ecfff5',
  'palette.fill': '#295d78',
  'material.floor': { color: '#101820', roughness: 0.88, metalness: 0.08 },
  'material.probe': { color: '#d9ffad', emissive: '#789d49', roughness: 0.28, metalness: 0.42 },
  'material.anchor': { color: '#62d4b6', emissive: '#22594f', roughness: 0.34, metalness: 0.2 },
  'geometry.floor': { width: 20, depth: 16, widthSegments: 20, depthSegments: 16 },
  'geometry.probe': { radius: 0.38, detail: 1 },
  'geometry.probeRing': { radius: 0.65, tube: 0.025, radialSegments: 8, tubularSegments: 42 },
  'geometry.anchor': { radius: 0.42, detail: 0 },
  'geometry.anchorRing': { innerRadius: 0.68, outerRadius: 0.73, segments: 32 },
  'geometry.fieldBar': { width: 0.05, depth: 0.5 },
} as const
export type AssetId = keyof typeof assetCatalog
export function resolveAsset<T extends AssetId>(id: T): (typeof assetCatalog)[T] {
  const asset = assetCatalog[id]
  if (asset === undefined) throw new Error(`Unknown asset id: ${id}`)
  return asset
}
