import { releaseFrescoMaterial } from '../engine/materials';
import * as THREE from 'three';
import { springPath, springWaterHeight } from './calypso-layout';
export { springPath } from './calypso-layout';
import type { Terrain } from './terrain';


/** Local, owned resources. No growing allocations or wall-clock motion while paused. */
export class LateEffects {
  readonly group = new THREE.Group();
  private clock = 0;
  private readonly smoke: THREE.Sprite[] = [];
  private readonly glints: THREE.Mesh[] = [];
  private readonly materials = new Set<THREE.Material>();
  private texture?: THREE.Texture;
  constructor(id: string, _terrain: Terrain) {
    this.group.name = 'late-scene-effects';
    if (id === 'calypso') this.springs();
    if (id === 'ithaca') this.hearth();
  }
  private material(color: number, opacity = 1) {
    const m = new THREE.MeshBasicMaterial({color, transparent: opacity < 1, opacity, side: THREE.DoubleSide, depthWrite: opacity === 1});
    this.materials.add(m); return m;
  }
  private springs() {
    // Static water and channel banks are registered/batched by the scene. Own only moving glints.
    for(let arm=0;arm<4;arm++)for(let i=0;i<3;i++){
      const glint=new THREE.Mesh(new THREE.PlaneGeometry(.3,.045).rotateX(-Math.PI/2),this.material(0xe2e9d1,.65));
      glint.name='spring-glint-'+arm+'-'+i;glint.userData.arm=arm;glint.userData.offset=i/3;this.glints.push(glint);this.group.add(glint);
    }
  }
  private hearth() {
    const canvas=document.createElement('canvas');canvas.width=64;canvas.height=64;
    const c=canvas.getContext('2d')!;const g=c.createRadialGradient(32,32,0,32,32,32);
    g.addColorStop(0,'rgba(255,255,255,.7)');g.addColorStop(.35,'rgba(255,255,255,.48)');g.addColorStop(1,'rgba(255,255,255,0)');
    c.fillStyle=g;c.fillRect(0,0,64,64);this.texture=new THREE.CanvasTexture(canvas);
    for(let i=0;i<14;i++){
      const mat=new THREE.SpriteMaterial({map:this.texture,color:0x665d4e,opacity:.55,depthWrite:false,fog:true});
      this.materials.add(mat);const puff=new THREE.Sprite(mat);puff.name='hearth-smoke-'+i;
      this.smoke.push(puff);this.group.add(puff);
    }
    const ember=new THREE.Mesh(new THREE.SphereGeometry(.38,9,6).scale(1,.4,1),this.material(0xbb6937));
    ember.position.set(0,5.55,-20);ember.name='home-hearth-ember';this.group.add(ember);
  }
  update(dt:number, motion:boolean) {
    if(motion)this.clock+=dt;
    this.smoke.forEach((p,i)=>{
      const t=(i/14+this.clock*.07)%1;
      p.position.set(t*1.8+Math.sin(t*8)*.16,9.65+t*6.5,-20+t*.6);
      p.scale.setScalar(.85+t*2.6);
      p.material.opacity=.48*Math.sin(Math.PI*Math.min(.95,t+.08));
    });
    this.glints.forEach(p=>{
      const t=(p.userData.offset+this.clock*.095)%1,q=springPath(p.userData.arm,t);
      p.position.set(q.x,springWaterHeight(t)+.025,q.z);
      const ahead=springPath(p.userData.arm,Math.min(1,t+.005));
      p.rotation.y=-Math.atan2(ahead.z-q.z,ahead.x-q.x);
    });
  }
  dispose(){
    this.group.removeFromParent();this.group.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});
    this.materials.forEach(m=>{if(m instanceof THREE.ShaderMaterial)releaseFrescoMaterial(m);else m.dispose();});this.texture?.dispose();this.group.clear();
  }
}
