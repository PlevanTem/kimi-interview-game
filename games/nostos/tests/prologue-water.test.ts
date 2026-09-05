import { describe, expect, it } from 'vitest';
import { prologue } from '../src/game/scenes/prologue';
import { findFocus } from '../src/game/interact';
import { Terrain } from '../src/world/terrain';

// 使用真实高度与行走函数，只省略依赖 DOM 的网格和材质构造。
const ground = Object.assign(Object.create(Terrain.prototype) as Terrain, {
  params: { frequency: 0.045, dome: 3, ridge: 0, waterLevel: 0, ...prologue.terrain },
});
const water = prologue.def.interactables.find((item) => item.id === 'prologue.water')!;

describe('序章水温线索的真实岸边可达性', () => {
  it('从内陆到湿岸的路可走，实际水边在交互范围内', () => {
    const r = Math.hypot(water.x, water.z);
    expect(prologue.terrain.radius - r).toBeLessThan(2.5);
    const ux = water.x / r;
    const uz = water.z / r;
    for (let radius = 18; radius <= 24.4; radius += 0.2) {
      expect(ground.walkable(ux * radius, uz * radius), `radius=${radius}`).toBe(true);
    }
    const hit = findFocus({ x: ux * 24.4, z: uz * 24.4, yaw: Math.atan2(-ux, -uz) }, [water]);
    expect(hit?.def.id).toBe(water.id);
  });

  it('贴近触水区域后转身仍有提示，远处仍必须朝向目标', () => {
    for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
      expect(findFocus({ x: water.x, z: water.z + 0.8, yaw }, [water])?.def.id).toBe(water.id);
    }
    expect(findFocus({ x: water.x, z: water.z + 2.5, yaw: Math.PI }, [water])).toBeNull();
    expect(findFocus({ x: water.x, z: water.z + 5, yaw: 0 }, [water])).toBeNull();
  });
});
