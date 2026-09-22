import * as THREE from 'three';
import {it,expect,vi} from 'vitest';
import {CoastalSpray} from '../src/world/coastal-spray';
import {sharedUniforms} from '../src/engine/materials';
import type {Terrain} from '../src/world/terrain';
it('emits only at shoreline, follows directed wind, scales count and releases resources',()=>{
 const terrain={heightAt:(x:number,z:number)=>Math.hypot(x,z)<30?4:0} as Terrain;
 const old=sharedUniforms.uWind.value.clone();sharedUniforms.uWind.value.set(.65,-.35);
 const spray=new CoastalSpray(terrain,.45),high=new CoastalSpray(terrain,1);
 const p=spray.mesh.geometry.getAttribute('position');expect(p.count).toBe(22);expect(high.mesh.geometry.getAttribute('position').count).toBe(48);
 const x=p.getX(0),z=p.getZ(0);expect(Math.hypot(x,z)).toBeCloseTo(30,3);
 spray.update(.1,true);expect(p.getX(0)).toBeGreaterThan(x);expect(p.getZ(0)).toBeLessThan(z);
 const frozen=p.getX(0);spray.update(.1,false);expect(spray.mesh.visible).toBe(false);expect(p.getX(0)).toBe(frozen);
 const g=vi.spyOn(spray.mesh.geometry,'dispose'),m=vi.spyOn(spray.mesh.material as THREE.Material,'dispose');
 const scene=new THREE.Scene();scene.add(spray.mesh);spray.dispose();high.dispose();
 expect(scene.children).toHaveLength(0);expect(g).toHaveBeenCalledOnce();expect(m).toHaveBeenCalledOnce();sharedUniforms.uWind.value.copy(old);
});
