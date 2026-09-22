import * as THREE from 'three';
import { describe, it, expect } from 'vitest';
import { ACTS } from '../src/game/scenes';
import { Dresser, type PlaceOptions, type SurfaceName } from '../src/game/scenes/dresser';
import { Terrain } from '../src/world/terrain';
import { isBlocked } from '../src/engine/collision';
import { PILOT_ASSETS, PILOT_WALLS, PILOT_POSTS } from '../src/world/pilot-architecture';

function meshes(id:keyof typeof PILOT_ASSETS){
  const parts=PILOT_ASSETS[id].make(2401),material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});
  const objects=parts.map(p=>new THREE.Mesh(p.geometry,material));objects.forEach(o=>o.updateMatrixWorld());
  return {objects,dispose:()=>{parts.forEach(p=>p.geometry.dispose());material.dispose();}};
}
function ray(objects:THREE.Object3D[],from:[number,number,number],direction:[number,number,number]){
  return new THREE.Raycaster(new THREE.Vector3(...from),new THREE.Vector3(...direction)).intersectObjects(objects);
}
describe('authored architecture pilots',()=>{
  it('budgets include every generated surface and all coordinates are finite',()=>{
    const budgets={'game.nostos.environment.circe_courtyard':18000,'game.nostos.environment.cyclops_husbandry':8000};
    for(const id of Object.keys(PILOT_ASSETS) as Array<keyof typeof PILOT_ASSETS>){
      const parts=PILOT_ASSETS[id].make(2401);let count=0;
      for(const part of parts){const p=part.geometry.getAttribute('position');count+=p.count;expect(Array.from(p.array).every(Number.isFinite)).toBe(true);part.geometry.dispose();}
      expect(count,id).toBeLessThan(budgets[id]);console.log(id,count);
    }
  });
  it('gallery doors have real walk-through voids, supported lintels and roof cover',()=>{
    const m=meshes('game.nostos.environment.circe_courtyard');
    // The west doorway at z2 remains open through to the rear wall, not a decal.
    const door=ray(m.objects,[-10.5,1.68,4],[0,0,-1]);
    expect(door[0]!.distance).toBeGreaterThan(20);
    expect(ray(m.objects,[-10.5,4,4],[0,0,-1])[0]!.distance).toBeLessThan(3);
    const roof=ray(m.objects,[-11.5,1.68,-12],[0,1,0]);expect(roof.length).toBeGreaterThan(0);expect(roof[0]!.distance).toBeGreaterThan(3);
    // Central mural and the memory approach are still open to the sky.
    expect(ray(m.objects,[0,1.68,4],[0,1,0])).toHaveLength(0);
    expect(ray(m.objects,[0,1.68,4],[0,0,-1])).toHaveLength(0);
    // Off-centre ridge is taller near the exterior wall, not a symmetric shed.
    const ridge=ray(m.objects,[-13.4,1.68,-12],[0,1,0])[0]!;
    const courtSlope=ray(m.objects,[-9.6,1.68,-12],[0,1,0])[0]!;
    expect(ridge.distance-courtSlope.distance).toBeGreaterThan(.7);
    // Wall now reaches bearing beam: no daylight slit at local y4.88.
    expect(ray(m.objects,[-18,4.88,-12],[1,0,0])[0]!.distance).toBeLessThan(2);
    m.dispose();
  });
  it('cave storage keeps the stake sightline and central walk-through empty',()=>{
    const m=meshes('game.nostos.environment.cyclops_husbandry');
    expect(ray(m.objects,[0,1.68,-22],[0,0,-1])).toHaveLength(0);
    expect(ray(m.objects,[0,1.68,-26],[1,0,0]).length).toBeGreaterThan(0);
    m.dispose();
  });
  it('new courtyard collisions preserve the central 3m corridor and 3m doors',()=>{
    for(const [ax,,bx,,thickness] of PILOT_WALLS.circe){expect(Math.min(Math.abs(ax),Math.abs(bx))-thickness/2).toBeGreaterThan(3);}
    for(const p of PILOT_POSTS)expect(Math.abs(p.x)-p.radius).toBeGreaterThan(3);
    const front=PILOT_WALLS.circe.filter(w=>w[1]===2&&w[3]===2);
    expect(front[1]![0]-front[0]![2]).toBe(3);
    expect(front[3]![0]-front[2]![2]).toBe(3);
  });
});

class CollisionDresser extends Dresser {
  override place(geometry:THREE.BufferGeometry,_surface:SurfaceName,p:PlaceOptions){geometry.dispose();if(p.block)this.blockers.push({x:p.x,z:p.z,radius:p.block});}
  override attach(_make:()=>THREE.Mesh){}
}
it('all eight islands retain a terrain-valid connected route to every interaction',()=>{
  for(const act of ACTS){
    const terrain=Object.assign(Object.create(Terrain.prototype) as Terrain,{params:{waterLevel:0,...act.terrain}});
    const d=new CollisionDresser(new THREE.Scene(),terrain,act.terrain.seed);act.dress(d);
    const step=.6,spawn=act.def.spawn,queue:Array<[number,number]>=[[0,0]],seen=new Set(['0,0']);
    const reachable:Array<[number,number]>=[];
    for(let cursor=0;cursor<queue.length;cursor++){
      const [ix,iz]=queue[cursor]!,x=spawn.x+ix*step,z=spawn.z+iz*step;reachable.push([x,z]);
      for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
        const nx=ix+dx!,nz=iz+dz!,key=`${nx},${nz}`,wx=spawn.x+nx*step,wz=spawn.z+nz*step;
        if(seen.has(key)||Math.abs(wx)>45||Math.abs(wz)>45)continue;seen.add(key);
        if(!terrain.walkable(wx,wz)||d.blockers.some(b=>isBlocked(wx,wz,{...b,radius:b.radius+.22})))continue;
        queue.push([nx,nz]);
      }
    }
    for(const p of act.def.interactables){
      const distance=Math.min(...reachable.map(([x,z])=>Math.hypot(x-p.x,z-p.z)));
      expect(distance,`${act.def.id}:${p.id}`).toBeLessThan((p.radius??2.6)-.35);
    }
  }
});
