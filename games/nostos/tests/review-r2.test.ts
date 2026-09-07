import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { prologue } from '../src/game/scenes/prologue';
import { CRUMBLE_SECONDS } from '../src/game/vision';
import { weatheredNamePlank } from '../src/world/props';
import { ENV } from '../src/content/palette';

describe('人工审阅第二轮：遮挡与可读性回归', () => {
  it('36秒及全部台词保留，划桨者不与残留船影累积', () => {
    const v = prologue.def.vision;
    expect(v.duration).toBe(36); expect(v.beats.filter(b => b.line)).toHaveLength(6);
    const visible = (t: number) => v.beats.filter(b => b.motif && t > b.at &&
      t < (b.motif.crumbleAt ?? v.duration - CRUMBLE_SECONDS) + CRUMBLE_SECONDS);
    expect(visible(18).map(b => b.motif!.kind)).toEqual(['rower']);
    expect(visible(23).map(b => b.motif!.kind)).toEqual(['rower', 'rower']);
    expect(visible(30).map(b => b.motif!.kind)).toEqual(['wave']);
    for (const b of v.beats) if (b.motif) {
      expect(b.motif.z).toBeLessThanOrEqual(-24);
      expect(b.motif.size / -b.motif.z).toBeLessThan(0.65);
    }
  });
  it('刻痕沿真实船板顶面，固定seed不再埋入倒角板体', () => {
    for (const seed of [120, 121, 130]) {
      const { wood, inscription } = weatheredNamePlank(seed);
      const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(wood, material), p = inscription.getAttribute('position');
      const ray = new THREE.Raycaster(); let exposed = 0;
      for (let i = 0; i < p.count; i++) {
        ray.set(new THREE.Vector3(p.getX(i), 1, p.getZ(i)), new THREE.Vector3(0, -1, 0));
        const hit = ray.intersectObject(mesh)[0];
        if (hit && p.getY(i) > hit.point.y + 0.005) exposed++;
      }
      expect(exposed).toBeGreaterThan(p.count * 0.35);
      wood.dispose(); inscription.dispose(); material.dispose();
    }
  });
  it('忘食岸为晴日而非灰黄暮色，风暴幕保持区别', () => {
    expect(ENV.honeyDusk.sunElevation).toBeGreaterThan(0.5);
    expect(ENV.honeyDusk.cloudiness).toBeLessThan(0.15);
    expect(ENV.honeyDusk.fogDensity).toBeLessThan(0.006);
    expect(ENV.honeyDusk.saturation).toBeGreaterThan(1);
    expect(ENV.thunderCape.cloudiness).toBeGreaterThan(0.8);
  });
});
