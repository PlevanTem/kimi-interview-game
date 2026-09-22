import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { QUALITY_PRESETS, resolveQuality, ResolutionController } from '../src/engine/quality';
import { PostChain } from '../src/engine/post';
import { ShadowMap } from '../src/engine/shadow';
import { ENV } from '../src/content/palette';

describe('quality budgets', () => {
  it('defaults to high desktop / low coarse-pointer and honors explicit URLs', () => {
    expect(resolveQuality('', false).level).toBe('high');
    expect(resolveQuality('', true).level).toBe('low');
    expect(resolveQuality('?quality=high', true).level).toBe('high');
    expect(resolveQuality('?quality=medium', false).level).toBe('medium');
    expect(resolveQuality('?quality=low', false).level).toBe('low');
    expect(resolveQuality('?quality=__proto__', true).level).toBe('low');
  });

  it('requires sustained slow frames, clamps scaling, and ignores suspended frames', () => {
    const c = new ResolutionController(QUALITY_PRESETS.low);
    expect(c.sample(80)).toBe(false);
    expect(c.sample(1000)).toBe(false);
    expect(c.scale).toBe(1);
    for (let i = 0; i < 75; i++) c.sample(40);
    expect(c.scale).toBe(0.9);
    for (let i = 0; i < 1500; i++) c.sample(40);
    expect(c.scale).toBe(0.65);
    for (let i = 0; i < 375; i++) c.sample(16);
    expect(c.scale).toBe(0.65);
    for (let i = 0; i < 200; i++) c.sample(16);
    expect(c.scale).toBe(0.7);
    for (let i = 0; i < 5000; i++) c.sample(16);
    expect(c.scale).toBe(1);
  });

  it('holds resolution inside the hysteresis band', () => {
    const c = new ResolutionController(QUALITY_PRESETS.low);
    for (let i = 0; i < 1000; i++) expect(c.sample(33.3)).toBe(false);
    expect(c.scale).toBe(1);
  });

  it('low removes three fullscreen passes while retaining scene and final color/fade composite', () => {
    for (const enabled of [false, true]) {
      const renderer = { setRenderTarget: vi.fn(), clear: vi.fn(), render: vi.fn() };
      const chain = new PostChain(renderer as unknown as THREE.WebGLRenderer, enabled);
      chain.setSize(800, 600, 1);
      chain.setFade(0xffffff, 0.5);
      chain.render(new THREE.Scene(), new THREE.PerspectiveCamera(), 1);
      expect(renderer.render).toHaveBeenCalledTimes(enabled ? 5 : 2);
      const finalScene = renderer.render.mock.calls.at(-1)![0] as THREE.Scene;
      const finalMaterial = (finalScene.children[0] as THREE.Mesh).material as THREE.ShaderMaterial;
      expect(finalMaterial.uniforms.uFadeAmount!.value).toBe(0.5);
      expect(finalMaterial.uniforms.uHalation!.value).toBe(enabled ? 0.5 : 0);
      chain.applyEnv(ENV.endlessDay);
      expect(finalMaterial.uniforms.uHalation!.value).toBe(enabled ? ENV.endlessDay.halation : 0);
      const target = renderer.setRenderTarget.mock.calls[0]![0] as THREE.WebGLRenderTarget;
      const dispose = vi.fn(); target.addEventListener('dispose', dispose);
      chain.setSize(800, 600, 1);
      chain.render(new THREE.Scene(), new THREE.PerspectiveCamera(), 2);
      expect(dispose).not.toHaveBeenCalled();
      expect(renderer.setRenderTarget).toHaveBeenLastCalledWith(null);
      chain.dispose();
    }
  });

  it('each tier uses matching shadow texture size and texel sampling', () => {
    for (const tier of Object.values(QUALITY_PRESETS)) {
      const shadow = new ShadowMap(tier.shadowSize);
      expect(shadow.target.width).toBe(tier.shadowSize);
      expect(shadow.texel).toBe(1 / tier.shadowSize);
      shadow.dispose();
    }
  });
});
