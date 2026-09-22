import * as THREE from 'three';
import {describe,it,expect} from 'vitest';
import {DOMESTIC_ASSETS,ORCHARD_BAYS,orchardPoint,lotusRillSamples,lotusRill} from '../src/world/domestic-environments';
import {ithaca} from '../src/game/scenes/ithaca';
import {lotus} from '../src/game/scenes/lotus';
import {Dresser,type PlaceOptions,type SurfaceName} from '../src/game/scenes/dresser';
import {Terrain,terrainHeight} from '../src/world/terrain';
import {isBlocked} from '../src/engine/collision';
function asset(id:keyof typeof DOMESTIC_ASSETS){const parts=DOMESTIC_ASSETS[id].make(3201),m=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});const objects=parts.map(p=>new THREE.Mesh(p.geometry,m));objects.forEach(o=>o.updateMatrixWorld());return{objects,dispose(){parts.forEach(p=>p.geometry.dispose());m.dispose();}};}
function ray(objects:THREE.Object3D[],from:[number,number,number],direction:[number,number,number]){return new THREE.Raycaster(new THREE.Vector3(...from),new THREE.Vector3(...direction)).intersectObjects(objects);}
describe('domestic environments R2',()=>{
 it('each authored environment stays within budget with finite positions',()=>{
  for(const id of Object.keys(DOMESTIC_ASSETS) as Array<keyof typeof DOMESTIC_ASSETS>){let count=0;for(const p of DOMESTIC_ASSETS[id].make(3201)){const a=p.geometry.getAttribute('position');count+=a.count;expect(Array.from(a.array).every(Number.isFinite)).toBe(true);p.geometry.dispose();}expect(count).toBeLessThan(id.includes('ithaca')?24000:20000);console.log(id,count);}
 });
 it('home doorway enters a roofed room; chimney has an actual open roof aperture',()=>{
  const a=asset('game.nostos.environment.ithaca_home');
  expect(ray(a.objects,[0,1.68,-12],[0,0,-1])[0]!.distance).toBeGreaterThan(12);
  expect(ray(a.objects,[0,1.68,-20],[0,1,0]).length).toBeGreaterThan(0);
  expect(ray(a.objects,[8.8,1.68,-20],[0,1,0])).toHaveLength(0);
  a.dispose();
 });
 it('shelter foundations meet the actual terrace and roofs shelter the centre',()=>{
  const a=asset('game.nostos.environment.lotus_orchard');
  for(const p of ORCHARD_BAYS){for(const x of[-2.3,2.3])for(const z of[-3,3]){const at=orchardPoint(p,x,z);expect(terrainHeight(lotus.terrain,at.x,at.z)).toBeCloseTo(p.y,2);}
    const hits=ray(a.objects,[p.x,p.y+1.68,p.z],[0,1,0]);expect(hits.length).toBeGreaterThan(0);expect(hits[0]!.distance).toBeGreaterThan(.7);
  }a.dispose();
 });
});
class CollisionDresser extends Dresser {
  override place(geometry:THREE.BufferGeometry,_surface:SurfaceName,p:PlaceOptions){geometry.dispose();if(p.block)this.blockers.push({x:p.x,z:p.z,radius:p.block});}
  override attach(_make:()=>THREE.Mesh){}
}
it('both domestic islands retain a terrain-valid connected route to every interaction',()=>{
  for(const act of [ithaca,lotus]){
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

it('the actual dressed threshold is a walking sill rather than a half-metre solid step',()=>{
 const terrain=Object.assign(Object.create(Terrain.prototype) as Terrain,{params:{waterLevel:0,...ithaca.terrain}}),d=new CollisionDresser(new THREE.Scene(),terrain,ithaca.terrain.seed);
 const pieces:THREE.Mesh[]=[],material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});
 const place=d.place.bind(d);
 d.place=(geometry,surface,p)=>{if(p.x===0&&p.z===-16){const m=new THREE.Mesh(geometry.clone(),material);m.position.set(p.x,p.y??terrain.heightAt(p.x,p.z),p.z);m.updateMatrixWorld();pieces.push(m);}place(geometry,surface,p);};
 ithaca.dress(d);
 for(const x of[-.8,0,.8]){const ground=terrain.heightAt(x,-16),hits=ray(pieces,[x,ground+.6,-16],[0,-1,0]);expect(hits.length).toBeGreaterThan(0);const rise=hits[0]!.point.y-ground;expect(rise).toBeGreaterThan(.04);expect(rise).toBeLessThan(.12);}
 pieces.forEach(m=>m.geometry.dispose());material.dispose();
});

it('orchard irrigation descends into a visible flared outlet and is grounded throughout',()=>{
 const ground=(x:number,z:number)=>terrainHeight(lotus.terrain,x,z),samples=lotusRillSamples(ground);
 for(let i=1;i<samples.length;i++)expect(samples[i]!.y).toBeLessThan(samples[i-1]!.y);
 expect(samples[0]!.y-samples.at(-1)!.y).toBeGreaterThan(1.5);
 expect(samples.at(-1)!.halfWidth).toBeGreaterThan(samples[0]!.halfWidth*2);
 const parts=lotusRill(ground);let count=0;
 for(const p of parts){const a=p.geometry.getAttribute('position');count+=a.count;for(let i=0;i<a.count;i++){const above=a.getY(i)-ground(a.getX(i),a.getZ(i));expect(above).toBeLessThan(.15);expect(above).toBeGreaterThan(-.03);}p.geometry.dispose();}
 expect(count).toBeLessThan(2000);
});
