import * as THREE from 'three';
import { sharedUniforms } from '../engine/materials';
import { resolveQuality } from '../engine/quality';
import { ISLAND_LAYOUTS, underRoof } from './island-layout';
import { createRng } from '../engine/noise';
import type { Terrain } from './terrain';

/** Bounded local rain, owned by one Stage. No fullscreen transparent weather layers. */
export class IslandWeather {
  readonly mesh: THREE.LineSegments | null;
  private time = 0;
  private readonly seeds: Float32Array;
  private readonly positions: Float32Array;
  private readonly ground: Float32Array;
  constructor(private readonly id: string, terrain: Terrain, roofs: THREE.Object3D[] = []) {
    const count = id === 'cyclops' ? Math.round(320 * resolveQuality().environmentDensity) : 0;
    this.seeds = new Float32Array(count * 3);
    this.positions = new Float32Array(count * 6);
    this.ground = new Float32Array(count);
    const rng = createRng(220922);
    // Sample the actual completed architecture once, rather than assuming a
    // rectangular shelter matches a pitched or irregular cave roof.
    roofs.forEach(mesh => mesh.updateWorldMatrix(true,false));
    const ray = new THREE.Raycaster(new THREE.Vector3(),new THREE.Vector3(0,-1,0));
    for(let i=0;i<count;i++) {
      this.seeds[i*3] = (rng()-.5)*68;
      this.seeds[i*3+1] = rng()*16;
      this.seeds[i*3+2] = (rng()-.5)*74;
      this.ground[i] = Math.max(0,terrain.heightAt(this.seeds[i*3],this.seeds[i*3+2]));
      ray.ray.origin.set(this.seeds[i*3],50,this.seeds[i*3+2]);
      const roof = ray.intersectObjects(roofs,false)[0];
      if(roof) this.ground[i]=Math.max(this.ground[i],roof.point.y);
    }
    if (!count) { this.mesh=null; return; }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.BufferAttribute(this.positions,3).setUsage(THREE.DynamicDrawUsage));
    this.mesh = new THREE.LineSegments(g,new THREE.LineBasicMaterial({color:0xadc5d0,transparent:true,opacity:.24,depthWrite:false}));
    this.mesh.layers.set(1); this.mesh.frustumCulled=false;
  }
  update(dt:number, motion:boolean):void {
    if (!this.mesh) return;
    this.mesh.visible=motion && sharedUniforms.uVision.value<.1;
    if(!this.mesh.visible) return;
    this.time+=Math.min(dt,.1);
    const shelters=ISLAND_LAYOUTS[this.id]?.shelters ?? [];
    const wind=sharedUniforms.uWind.value;
    for(let i=0;i<this.ground.length;i++) {
      const x=this.seeds[i*3],z=this.seeds[i*3+2];
      const y=this.ground[i]+((this.seeds[i*3+1]-this.time*9)%16+16)%16;
      const hidden=underRoof(x,y,z,shelters);
      const a=i*6;
      this.positions[a]=x;this.positions[a+1]=hidden?-100:y;this.positions[a+2]=z;
      this.positions[a+3]=x-wind.x*.09;this.positions[a+4]=hidden?-100:y+.7;this.positions[a+5]=z-wind.y*.09;
    }
    this.mesh.geometry.attributes.position.needsUpdate=true;
  }
  dispose():void {this.mesh?.removeFromParent();this.mesh?.geometry.dispose();(this.mesh?.material as THREE.Material|undefined)?.dispose();}
}
