import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { COASTAL_ASSETS, COASTAL_WALLS, SIRENS_STRATA, SIRENS_WRECKS, SIRENS_MOORINGS, sirensChannel, calypsoLiving } from '../src/world/coastal-environments';
import { calypsoGroundHeight } from '../src/world/calypso-layout';

describe('R2 authored coastal environments',()=>{
  it('deterministic world-space geometry is finite and within the 20000 vertex budget',()=>{
    for(const asset of Object.values(COASTAL_ASSETS)){
      const parts=asset.make(3201),again=asset.make(3201);
      const count=parts.reduce((n,p)=>n+p.geometry.getAttribute('position').count,0);
      expect(count).toBeGreaterThan(1000);expect(count).toBeLessThanOrEqual(20000);
      parts.forEach((p,i)=>{expect(Array.from(p.geometry.getAttribute('position').array)).toEqual(Array.from(again[i]!.geometry.getAttribute('position').array));expect(Array.from(p.geometry.getAttribute('position').array).every(Number.isFinite)).toBe(true);p.geometry.dispose();again[i]!.geometry.dispose();});
    }
  });
  it('rock throat has asymmetric large silhouette and keeps the central safe route open',()=>{
    expect(SIRENS_STRATA.filter(r=>r.x<0).map(r=>r.z)).not.toEqual(SIRENS_STRATA.filter(r=>r.x>0).map(r=>r.z));
    expect(Math.max(...SIRENS_STRATA.map(r=>r.h))).toBeGreaterThanOrEqual(12);
    for(const [ax,,bx] of COASTAL_WALLS.sirens)expect(Math.min(Math.abs(ax),Math.abs(bx))).toBeGreaterThan(7);
    for(const r of SIRENS_WRECKS)expect(r.length/r.width).toBeGreaterThan(2.5);
  });
  it('each stratified rock is a closed continuous shell with no unpaired layer seams',()=>{
    const parts=sirensChannel();
    for(let rock=0;rock<SIRENS_STRATA.length;rock++){
      const edges=new Map<string,number>();
      for(const part of parts.slice(rock*2,rock*2+2)){
        const p=part.geometry.getAttribute('position');
        const key=(i:number)=>[p.getX(i),p.getY(i),p.getZ(i)].join(',');
        for(let i=0;i<p.count;i+=3)for(const [a,b] of [[0,1],[1,2],[2,0]]){
          const e=[key(i+a!),key(i+b!)].sort().join('|');edges.set(e,(edges.get(e)??0)+1);
        }
      }
      expect([...edges.values()].every(count=>count===2)).toBe(true);
    }
    parts.forEach(p=>p.geometry.dispose());
  });
  it('new blockers do not occupy existing story anchors',()=>{
    const targets={sirens:[[-10,18],[11,9],[-8,-2],[12,-12],[-3,-20],[1,-27],[3,37]],calypso:[[24,14],[-12,3],[10,-5],[-14,-9],[-15.8,-14.2],[-7,-9],[10,-19],[6,36]]};
    for(const island of ['sirens','calypso'] as const)for(const [x,z] of targets[island])for(const [ax,az,bx,bz,w] of COASTAL_WALLS[island]){
      const dx=bx-ax,dz=bz-az,t=Math.max(0,Math.min(1,((x!-ax)*dx+(z!-az)*dz)/(dx*dx+dz*dz)));
      expect(Math.hypot(x!-ax-t*dx,z!-az-t*dz)).toBeGreaterThan(w/2+.3);
    }
  });
  it('Calypso additions leave the cave mouth and host face clear at eye height',()=>{
    const parts=calypsoLiving();const mat=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});
    const meshes=parts.map(p=>new THREE.Mesh(p.geometry,mat));meshes.forEach(m=>m.updateMatrixWorld());
    const entrance=new THREE.Raycaster(new THREE.Vector3(-12,3.3,-8),new THREE.Vector3(0,0,-1),0,5);
    expect(entrance.intersectObjects(meshes)).toHaveLength(0);
    const toHost=new THREE.Vector3(-7,3.3,-9).sub(new THREE.Vector3(-5,3.3,-6.5));
    const face=new THREE.Raycaster(new THREE.Vector3(-5,3.3,-6.5),toHost.clone().normalize(),0,toHost.length());
    expect(face.intersectObjects(meshes)).toHaveLength(0);
    parts.forEach(p=>p.geometry.dispose());mat.dispose();
  });
  it('Sirens central mast/rope sightline remains unoccluded',()=>{
    const parts=sirensChannel(),mat=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});
    const meshes=parts.map(p=>new THREE.Mesh(p.geometry,mat));meshes.forEach(m=>m.updateMatrixWorld());
    expect(new THREE.Raycaster(new THREE.Vector3(0,3,28),new THREE.Vector3(0,0,-1),0,56).intersectObjects(meshes)).toHaveLength(0);
    parts.forEach(p=>p.geometry.dispose());mat.dispose();
  });
  it('the original wreck clue has actual ship timber within 2 metres, independent of world-space asset pivot',()=>{
    const parts=sirensChannel();let nearest=Infinity;
    for(const part of parts.filter(p=>p.surface==='saltWood')){
      const p=part.geometry.getAttribute('position');
      for(let i=0;i<p.count;i++)nearest=Math.min(nearest,Math.hypot(p.getX(i)+10,p.getZ(i)-18));
    }
    expect(nearest).toBeLessThan(2);
    parts.forEach(p=>p.geometry.dispose());
  });
  it('drinking bays stay above their terrain beds with upward-facing water',()=>{
    const parts=calypsoLiving(),water=parts.find(p=>p.surface==='calypsoWater')!.geometry;
    const p=water.getAttribute('position'),n=water.getAttribute('normal');
    for(let i=0;i<p.count;i++){expect(p.getY(i)).toBeGreaterThan(calypsoGroundHeight(p.getX(i),p.getZ(i)));expect(n.getY(i)).toBeGreaterThan(.9);}
    parts.forEach(p=>p.geometry.dispose());
  });
  it('mooring endpoints physically contact their rib and stone geometry',()=>{
    const parts=sirensChannel();
    const distance=(target:THREE.Vector3,surface:string)=>{
      let nearest=Infinity;const tri=new THREE.Triangle(),closest=new THREE.Vector3();
      for(const part of parts.filter(p=>p.surface===surface)){
        const p=part.geometry.getAttribute('position');
        for(let i=0;i<p.count;i+=3){tri.a.fromBufferAttribute(p,i);tri.b.fromBufferAttribute(p,i+1);tri.c.fromBufferAttribute(p,i+2);tri.closestPointToPoint(target,closest);nearest=Math.min(nearest,closest.distanceTo(target));}
      }return nearest;
    };
    for(const anchor of SIRENS_MOORINGS){
      // Both centreline endpoints lie on real surfaces, so the .06 m rope overlaps them.
      expect(distance(new THREE.Vector3(...anchor.rib),'saltWood')).toBeLessThan(.001);
      expect(distance(new THREE.Vector3(...anchor.stone),'layeredBasalt')).toBeLessThan(.001);
    }
    parts.forEach(p=>p.geometry.dispose());
  });
  it('Calypso mineral lining is continuous from below floor to the original vault height',()=>{
    const parts=calypsoLiving(),lining=parts.find(p=>p.surface==='darkRock')!.geometry;
    lining.computeBoundingBox();expect(lining.boundingBox!.min.y).toBeLessThan(1.75);expect(lining.boundingBox!.max.y).toBeGreaterThan(6);
    const pos=lining.getAttribute('position');
    for(const side of [-16.68,-7.01]){
      let bottom=Infinity;for(let i=0;i<pos.count;i++)if(Math.abs(pos.getX(i)-side)<.5)bottom=Math.min(bottom,pos.getY(i));
      expect(bottom).toBeLessThan(1.75);
    }
    parts.forEach(p=>p.geometry.dispose());
  });
});
