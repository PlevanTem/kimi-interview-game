import * as THREE from 'three';
import { describe,it,expect } from 'vitest';
import { LIMINAL_ASSETS,LIMINAL_TERRAINS,LIMINAL_RIDGES,LIBATION_RILL } from '../src/world/liminal-environments';
import { terrainHeight,Terrain } from '../src/world/terrain';
import { prologue } from '../src/game/scenes/prologue';
import { nekyia } from '../src/game/scenes/nekyia';
import { Dresser,type PlaceOptions,type SurfaceName } from '../src/game/scenes/dresser';
import { isBlocked } from '../src/engine/collision';

describe('liminal authored coastal environments',()=>{
  it('deterministic surfaces stay within 20k and preserve the empty centre',()=>{
    for(const id of Object.keys(LIMINAL_ASSETS) as Array<keyof typeof LIMINAL_ASSETS>){
      const parts=LIMINAL_ASSETS[id].make(2601),again=LIMINAL_ASSETS[id].make(2601);let count=0,central=0;
      parts.forEach((part,i)=>{
        const p=part.geometry.getAttribute('position');count+=p.count;
        expect(Array.from(p.array).every(Number.isFinite)).toBe(true);
        expect(Array.from(p.array)).toEqual(Array.from(again[i]!.geometry.getAttribute('position').array));
        for(let v=0;v<p.count;v++)if(Math.abs(p.getX(v))<6&&Math.abs(p.getZ(v))<10)central++;
        part.geometry.dispose();again[i]!.geometry.dispose();
      });
      expect(count).toBeLessThan(20000);expect(central).toBe(0);console.log(id,count);
    }
  });
  it('shoreward libation route loses elevation and both islands keep three broken low contours',()=>{
    let previous=Infinity;
    for(const [x,z] of LIBATION_RILL){const h=terrainHeight(LIMINAL_TERRAINS.nekyia,x,z);expect(h).toBeLessThanOrEqual(previous+.015);previous=h;}
    for(const id of ['prologue','nekyia'] as const){
      expect(LIMINAL_RIDGES[id]).toHaveLength(3);
      const parts=LIMINAL_ASSETS[id==='prologue'?'game.nostos.environment.prologue_tideland':'game.nostos.environment.nekyia_ritual'].make();
      const p=parts[0]!.geometry.getAttribute('position');
      for(let i=0;i<p.count;i++)expect(p.getY(i)-terrainHeight(LIMINAL_TERRAINS[id],p.getX(i),p.getZ(i))).toBeLessThan(1.21);
      parts.forEach(p=>p.geometry.dispose());
    }
  });
  it('sediment surfaces conform to ground and face upward rather than disappear underneath it',()=>{
    for(const [id,key] of [['prologue','game.nostos.environment.prologue_tideland'],['nekyia','game.nostos.environment.nekyia_ritual']] as const){
      const parts=LIMINAL_ASSETS[key].make();const p=parts[1]!.geometry.getAttribute('position'),n=parts[1]!.geometry.getAttribute('normal');
      for(let i=0;i<p.count;i++){
        const clearance=p.getY(i)-terrainHeight(LIMINAL_TERRAINS[id],p.getX(i),p.getZ(i));
        expect(clearance).toBeGreaterThan(.011);expect(clearance).toBeLessThan(.015);
        expect(n.getY(i)).toBeGreaterThan(.5);
      }
      parts.forEach(p=>p.geometry.dispose());
    }
  });
});

class CollisionDresser extends Dresser {
  override place(geometry:THREE.BufferGeometry,_surface:SurfaceName,p:PlaceOptions){geometry.dispose();if(p.block)this.blockers.push({x:p.x,z:p.z,radius:p.block});}
  override attach(_make:()=>THREE.Mesh){}
}
it('low ridges and all existing props leave every original story anchor reachable',()=>{
  for(const act of [prologue,nekyia]){
    const terrain=Object.assign(Object.create(Terrain.prototype) as Terrain,{params:{waterLevel:0,...act.terrain}});
    const d=new CollisionDresser(new THREE.Scene(),terrain,act.terrain.seed);act.dress(d);
    const step=.6,spawn=act.def.spawn,queue:Array<[number,number]>=[[0,0]],seen=new Set(['0,0']);
    const reachable:Array<[number,number]>=[];
    for(let cursor=0;cursor<queue.length;cursor++){
      const [ix,iz]=queue[cursor]!,x=spawn.x+ix*step,z=spawn.z+iz*step;reachable.push([x,z]);
      for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
        const nx=ix+dx!,nz=iz+dz!,key=`${nx},${nz}`,wx=spawn.x+nx*step,wz=spawn.z+nz*step;
        if(seen.has(key)||Math.abs(wx)>40||Math.abs(wz)>40)continue;seen.add(key);
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
