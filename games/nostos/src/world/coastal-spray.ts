import * as THREE from 'three';
import { sharedUniforms } from '../engine/materials';
import { resolveQuality } from '../engine/quality';
import type { Terrain } from './terrain';

/** One small windward emission strip; the sheltered shore stays still. */
export class CoastalSpray {
  readonly mesh: THREE.Points;
  private time=0;
  private readonly anchors:THREE.Vector3[]=[];
  constructor(terrain:Terrain,density=resolveQuality().environmentDensity){
    const count=Math.round(48*density),positions=new Float32Array(count*3);
    for(let i=0;i<count;i++){
      const angle=Math.PI*.72+i/count*Math.PI*.6;
      let radius=20;
      // Find the actual terrain shoreline instead of emitting through inland rock.
      while(radius<48&&terrain.heightAt(Math.cos(angle)*radius,Math.sin(angle)*radius)>.25)radius+=.25;
      this.anchors.push(new THREE.Vector3(Math.cos(angle)*radius,.35,Math.sin(angle)*radius));
    }
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));
    const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{},
      vertexShader:'void main(){vec4 p=modelViewMatrix*vec4(position,1.0); gl_Position=projectionMatrix*p; gl_PointSize=clamp(80.0/max(1.0,-p.z),1.0,5.0);}',
      fragmentShader:'void main(){float a=1.0-smoothstep(0.1,0.5,length(gl_PointCoord-0.5)); if(a<0.02)discard; gl_FragColor=vec4(0.69,0.78,0.82,a*0.32);}',
    });
    this.mesh=new THREE.Points(geometry,material);this.mesh.layers.set(1);this.mesh.frustumCulled=false;this.mesh.name='windward-shore-spray';
    this.update(0,true);
  }
  update(dt:number,motion:boolean){
    this.mesh.visible=motion&&sharedUniforms.uVision.value<.1;
    if(!this.mesh.visible)return;
    this.time+=Math.min(dt,.1);const pos=this.mesh.geometry.getAttribute('position'),wind=sharedUniforms.uWind.value;
    this.anchors.forEach((p,i)=>{const t=(i/this.anchors.length+this.time*.38)%1;
      pos.setXYZ(i,p.x+wind.x*t*2,p.y+Math.sin(t*Math.PI)*.9,p.z+wind.y*t*2);
    });pos.needsUpdate=true;
  }
  dispose(){this.mesh.removeFromParent();this.mesh.geometry.dispose();(this.mesh.material as THREE.Material).dispose();}
}
