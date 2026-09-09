import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { RILL_SAMPLES, calypsoGroundHeight, springWaterHeight, CALYPSO_CAVE, CALYPSO_VIEWS } from '../src/world/calypso-layout';
import { resolveNarrativeAsset, type NarrativeAssetId } from '../src/world/narrative-assets';
import { calypso } from '../src/game/scenes/calypso';
import { terrainHeight, Terrain } from '../src/world/terrain';

describe('Calypso R1 implementation',()=>{
  it('four continuous downhill water surfaces reach the sea and stay above their channel beds',()=>{
    for(const line of RILL_SAMPLES){
      let y=Infinity;
      for(const p of line){const level=springWaterHeight(p.t);expect(level).toBeLessThanOrEqual(y);expect(calypsoGroundHeight(p.x,p.z)).toBeLessThan(level+.005);y=level;}
      const end=line.at(-1)!;expect(calypsoGroundHeight(end.x,end.z)).toBeLessThanOrEqual(0);expect(springWaterHeight(end.t)).toBe(0);
    }
  });
  it('terrain, chart and runtime all sample the authored meadow',()=>{
    for(const p of CALYPSO_VIEWS)expect(terrainHeight(calypso.terrain,p.x,p.z)).toBe(calypsoGroundHeight(p.x,p.z));
    const t=Object.assign(Object.create(Terrain.prototype) as Terrain,{params:{waterLevel:0,...calypso.terrain}});
    expect(t.walkable(calypso.def.spawn.x,calypso.def.spawn.z)).toBe(true);
    // Main walk-in remains gentle, rather than solving new waterways by adding jumping.
    for(let i=0;i<=80;i++){const z=33-i*.36,x=4*z/33;expect(t.walkable(x,z)).toBe(true);expect(t.slopeAt(x,z)).toBeLessThan(Math.tan(8*Math.PI/180));}
  });
  it('cave front is open at eye level but has a real back wall and ceiling',()=>{
    const parts=resolveNarrativeAsset('game.nostos.environment.calypso_cave');
    const material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide}),meshes=parts.map(p=>new THREE.Mesh(p.geometry,material));meshes.forEach(m=>m.updateMatrixWorld());
    const front=new THREE.Raycaster(new THREE.Vector3(0,1.68,6),new THREE.Vector3(0,0,-1));
    expect(front.intersectObjects(meshes)[0]!.distance).toBeGreaterThan(10);
    const roof=new THREE.Raycaster(new THREE.Vector3(0,1.68,0),new THREE.Vector3(0,1,0));
    expect(roof.intersectObjects(meshes)[0]!.distance).toBeGreaterThan(2);
    parts.forEach(p=>p.geometry.dispose());material.dispose();
    expect(calypsoGroundHeight(CALYPSO_CAVE.x,CALYPSO_CAVE.z)).toBeCloseTo(CALYPSO_CAVE.floor,3);
  });
  it('every revised asset stays inside its own tighter production budget',()=>{
    const registry=JSON.parse(readFileSync(new URL('../context/asset-registry.json',import.meta.url),'utf8'));
    const records=registry.assets.filter((a:{styleTags:string[];type:string})=>a.styleTags.includes('calypso-r1')&&a.type==='procedural-geometry');
    const measured:Record<string,number>={};
    for(const r of records){const parts=resolveNarrativeAsset(r.id as NarrativeAssetId,1901);const n=parts.reduce((sum,p)=>sum+p.geometry.getAttribute('position').count,0);measured[r.id]=n;expect(n,r.id).toBeLessThanOrEqual(r.vertexBudget);parts.forEach(p=>p.geometry.dispose());}
    console.log('CALYPSO_VERTEX_BUDGETS',JSON.stringify(measured));
  });
  it('the two domestic vessels have separate silhouettes and the completed robe has no floor stand',()=>{
    const domestic=resolveNarrativeAsset('game.nostos.prop.calypso_domestic_set');
    const pos=domestic.find(p=>p.surface==='paintedClay')!.geometry.getAttribute('position');
    const left:number[]=[],right:number[]=[];for(let i=0;i<pos.count;i++)(pos.getX(i)<1.78?left:right).push(pos.getX(i));
    expect(Math.min(...right)-Math.max(...left)).toBeGreaterThan(.2);
    const robe=resolveNarrativeAsset('game.nostos.prop.unworn_robe');
    for(const p of robe){p.geometry.computeBoundingBox();expect(p.geometry.boundingBox!.min.y).toBeGreaterThan(.4);}
    [...domestic,...robe].forEach(p=>p.geometry.dispose());
  });
});
