import * as THREE from 'three';
import { expect, it } from 'vitest';
import { IslandWeather } from '../src/world/weather';
import { ISLAND_LAYOUTS, underRoof } from '../src/world/island-layout';
import type { Terrain } from '../src/world/terrain';
import { terrainHeight } from '../src/world/terrain';
import { circe } from '../src/game/scenes/circe';

it('rain cannot cross an actual roof and releases its GPU objects',()=>{
  const roof=new THREE.Mesh(new THREE.BoxGeometry(100,1,100),new THREE.MeshBasicMaterial());roof.position.y=12;
  const rain=new IslandWeather('cyclops',{heightAt:()=>0} as unknown as Terrain,[roof]);
  for(let t=0;t<40;t++)rain.update(.1,true);
  const positions=rain.mesh!.geometry.getAttribute('position');
  for(let i=0;i<positions.count;i++)expect(positions.getY(i)).toBeGreaterThanOrEqual(12.5);
  rain.update(.1,false);expect(rain.mesh!.visible).toBe(false);
  const scene=new THREE.Scene();scene.add(rain.mesh!);rain.dispose();expect(scene.children).toHaveLength(0);
  roof.geometry.dispose();(roof.material as THREE.Material).dispose();
});
it('open courtyards and broken seaward roofs remain exposed',()=>{
  const zones=ISLAND_LAYOUTS.circe!.shelters;
  expect(underRoof(-11,5,-12,zones)).toBe(true);
  expect(underRoof(0,5,0,zones)).toBe(false);
  expect(underRoof(11,5,1,zones)).toBe(false);
  expect(underRoof(-11,14,-12,zones)).toBe(false);
});
it('authored gallery floor matches its visible platform and blends outside',()=>{
  for(const [x,z] of [[-15,-21],[-8,-2],[15,-9],[0,10]])expect(terrainHeight(circe.terrain,x!,z!)).toBeCloseTo(3.4,5);
  const edge=terrainHeight(circe.terrain,-17,-12),outside=terrainHeight(circe.terrain,-17.01,-12);
  expect(Math.abs(edge-outside)).toBeLessThan(.01);
});
