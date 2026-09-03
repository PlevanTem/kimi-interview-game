import { describe, expect, it } from 'vitest';
import { GRAYBOX_ASSET_ID, resolveProceduralAsset } from '../src/presentation/assetResolver';

describe('asset resolver', () => {
  it('resolves the registered stable asset ID', () => {
    expect(resolveProceduralAsset(GRAYBOX_ASSET_ID)).toBeTypeOf('function');
  });

  it('fails loudly for an unregistered ID', () => {
    expect(() => resolveProceduralAsset('game.odyssey-drifter.unknown.asset' as never)).toThrow('Unresolved procedural asset');
  });
});
