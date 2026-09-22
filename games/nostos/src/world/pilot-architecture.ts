import * as THREE from 'three';
import { mergeSimple } from './props';
import type { NarrativePart } from './narrative-assets';
import type { SurfaceName } from '../game/scenes/dresser';

type XYZ = [number, number, number];
export type PilotWall = readonly [number, number, number, number, number];
/** World XZ, local Y relative to the 3.4 m courtyard. All doors are actual gaps. */
export const PILOT_WALLS: Record<'circe' | 'cyclops', readonly PilotWall[]> = {
  circe: [[-16,-22,-16,2,.7],[-16,-22,-7,-22,.7],[-16,2,-12,2,.7],[-9,2,-7,2,.7],
    [16,-10,16,2,.7],[7,-10,16,-10,.7],[7,2,10,2,.7],[13,2,16,2,.7]],
  cyclops: [[-6,-25,-6,-30,.8],[6,-25,6,-30,.8]],
};
export const PILOT_POSTS = [-20,-14,-8,-2].map(z=>({x:-7,z,radius:.48})).concat([-8,-2].map(z=>({x:7,z,radius:.48})));
const box=(w:number,h:number,l:number,x:number,y:number,z:number)=>new THREE.BoxGeometry(w,h,l).translate(x,y+h/2,z);
function beam(a:XYZ,b:XYZ,w:number,h=w){
  const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),delta=end.clone().sub(start);
  return new THREE.BoxGeometry(w,h,delta.length()).applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),delta.normalize())).translate(...start.add(end).multiplyScalar(.5).toArray() as XYZ);
}
// Open, thick-lipped storage jar: ten sides are sufficient at architectural distance.
function amphora(height:number,_seed:number){
  const profile=[[.16,0],[.33,.1],[.43,.4],[.39,.67],[.19,.85],[.2,.95],[.16,.95],[.145,.84],[.31,.65],[.34,.4],[.25,.13],[0,.08]];
  return new THREE.LatheGeometry(profile.map(([r,y])=>new THREE.Vector2(r!*height,y!*height)),10);
}
function grouped(groups:[SurfaceName,THREE.BufferGeometry[]][]):NarrativePart[]{return groups.filter(([,g])=>g.length).map(([surface,g])=>({surface,geometry:mergeSimple(g)}));}

/** Asymmetric inhabited galleries frame an open sky courtyard, not another temple facade. */
export function circeCourtyard(_seed=2401):NarrativePart[]{
  const trim:THREE.BufferGeometry[]=[],masonry:THREE.BufferGeometry[]=[],timber:THREE.BufferGeometry[]=[],tiles:THREE.BufferGeometry[]=[],clay:THREE.BufferGeometry[]=[],water:THREE.BufferGeometry[]=[];
  for(const [ax,az,bx,bz,t] of PILOT_WALLS.circe){
    const length=Math.hypot(bx-ax,bz-az),yaw=Math.atan2(bx-ax,bz-az);
    masonry.push(box(t,4.95,length,0,0,0).rotateY(yaw).translate((ax+bx)/2,0,(az+bz)/2));
    // Continuous mineral base extends into the existing platform, never floats above it.
    trim.push(box(t+.25,.55,length,0,-.5,0).rotateY(yaw).translate((ax+bx)/2,0,(az+bz)/2));
  }
  // Door lintels bear on the solid returns, leaving a 3 m wide, 3.3 m high opening.
  masonry.push(box(3.7,1.5,.7,-10.5,3.3,2),box(3.7,1.5,.7,11.5,3.3,2));
  for(const p of PILOT_POSTS){
    masonry.push(box(.9,.28,.9,p.x,0,p.z),new THREE.CylinderGeometry(.32,.4,4.65,8).translate(p.x,2.6,p.z),box(1.05,.3,1.05,p.x,4.8,p.z));
  }
  for(const [left,right,front,back] of [[-16,-7,2,-22],[7,16,2,-10]]){
    const ridge=left<0?left+2.6:(left+right)/2, ridgeY=left<0?7.5:6.8;
    timber.push(box(.38,.42,front-back,left,4.95,(front+back)/2),box(.38,.42,front-back,right,4.95,(front+back)/2));
    // Full triangular trusses transfer ridge loads through ties onto wall and columns.
    for(let z=back+2;z<front;z+=6){
      timber.push(beam([left,5.1,z],[right,5.1,z],.28,.38),beam([left,5.1,z],[ridge,ridgeY,z],.23),beam([ridge,ridgeY,z],[right,5.1,z],.23),beam([ridge,5.1,z],[ridge,ridgeY,z],.18));
    }
    timber.push(box(.25,.28,front-back,ridge,ridgeY-.1,(front+back)/2));
    // Three broad overlapping courses run with the slope; cap joints are sparse
    // and offset. The tall, off-centre western ridge is the authored silhouette.
    const roofEnd=left>0?-1:front, length=roofEnd-back;
    for(const [edge] of [[left],[right]]) for(let course=0;course<3;course++){
      const a=course/3,b=(course+1)/3;
      const ax=edge!+(ridge-edge!)*a,bx=edge!+(ridge-edge!)*b;
      const ay=5.22+(ridgeY-5.07)*a,by=5.22+(ridgeY-5.07)*b;
      tiles.push(new THREE.BoxGeometry(Math.hypot(bx-ax,by-ay)+.04,.18,length).rotateZ(Math.atan2(by-ay,bx-ax)).translate((ax+bx)/2,(ay+by)/2,(roofEnd+back)/2));
    }
    for(let z=back+.7;z<roofEnd;z+=1.4){
      tiles.push(new THREE.CylinderGeometry(.24,.26,1.43,6,1,false,0,Math.PI).rotateX(Math.PI/2).translate(ridge,ridgeY+.13,z));
    }
    // The western end wall rises in stepped bearing masses under its eccentric ridge.
    if(left<0)for(const z of [back,front]){
      for(const [x,w,h] of [[-15,1.4,.55],[-13.5,1.6,1.9],[-11.5,1.5,1.35],[-9.5,1.5,.7]])
        trim.push(box(w!,h!,.76,x!,4.95,z));
      trim.push(box(.9,3.3,1.15,-15.7,0,z),box(.74,1.8,1,-15.7,3.3,z));
    }
  }

  // Rear storage wall: shoulder-height jars stand on an actual bearing shelf.
  for(const x of [-14.8,-13.6,-12.4,-11.2,-10]){
    masonry.push(box(.9,.55,1.1,x,0,-20.6));clay.push(amphora(.82,Math.round(x*100)).translate(x,.55,-20.6));
  }
  // An offset impluvium leaves the central mural and route empty. Water is inside a rim.
  masonry.push(box(3.8,.3,.28,3.8,0,-5.8),box(3.8,.3,.28,3.8,0,-9.2),box(.28,.3,3.4,1.9,0,-7.5),box(.28,.3,1.4,5.7,0,-8.5),box(.28,.3,1.4,5.7,0,-6.5));
  water.push(box(3.5,.015,3.1,3.8,.05,-7.5));
  // The folded ceramic collector bears on a mineral downspout pier. Its open
  // channel drains inward through the pool rim; no unsupported floating waterfall.
  trim.push(box(.7,4.95,.8,6.45,0,-7.5));
  for(const z of [-7.82,-7.18])tiles.push(beam([7.2,5.3,z],[6.15,4.9,z],.16,.28));
  tiles.push(beam([7.2,5.18,-7.5],[6.15,4.78,-7.5],.64,.12));
  // Dark recessed rain trace, backed by the pier, with an integral bottom rill.
  trim.push(box(.26,4.4,.035,6.08,.3,-7.5));
  for(const z of [-7.77,-7.23])trim.push(beam([6.5,.32,z],[5.48,.13,z],.12,.2));
  trim.push(beam([6.5,.23,-7.5],[5.48,.08,-7.5],.48,.08));
  // Covered food preparation and a grounded dining bench, kept away from cup trigger.
  for(const z of [-6.5,-3.5]){timber.push(box(3.8,.18,.8,12.2,.48,z));for(const x of [10.6,13.8])timber.push(box(.2,.5,.65,x,0,z));}
  return grouped([['paintedPlaster',masonry],['weatheredMarble',trim],['oliveWood',timber],['paintedClay',tiles.concat(clay)],['calypsoWater',water]]);
}

/** Built-in giant-scale storage and milking ledges fit the existing cave shell. */
export function cyclopsHusbandry(_seed=2501):NarrativePart[]{
  const rock:THREE.BufferGeometry[]=[],wood:THREE.BufferGeometry[]=[],clay:THREE.BufferGeometry[]=[];
  for(const side of [-1,1]){
    const x=side*5.3;
    // Two real recesses: uprights + projecting cap, open toward the cave centre.
    for(const z of [-26,-29]){
      rock.push(box(1.45,.6,2.5,x,0,z));
      // Tilted bedding planes taper into the parent cave, instead of square cupboards.
      for(const end of [-1,1]) rock.push(new THREE.CylinderGeometry(.42,.62,2.8,5).scale(1.45,1,.85).rotateZ(side*.12).translate(x+side*.12,1.8,z+end*1.02));
      rock.push(new THREE.CylinderGeometry(1,.85,.58,5).scale(.95,1,1.7).rotateY(.12*side).rotateZ(-.08*side).translate(x,3.18,z));
      clay.push(amphora(1.25,2501+z+side).translate(x,.6,z));
    }
    // Stone seats and timber milking rails tell how the space is used, at giant scale.
    rock.push(box(1.7,.95,1.1,side*5.2,0,-23.7));
    wood.push(beam([side*4.6,.2,-23.7],[side*4.6,2.2,-23.7],.25),beam([side*4.6,2.1,-23.7],[side*4.6,2.1,-26],.2));
  }
  return grouped([['layeredBasalt',rock],['saltWood',wood],['paintedClay',clay]]);
}
export const PILOT_ASSETS = {
  'game.nostos.environment.circe_courtyard':{name:'喀耳刻偏心庭院 · 承重屋架与织作宴厅',make:circeCourtyard},
  'game.nostos.environment.cyclops_husbandry':{name:'独眼岬洞居设施 · 巨人壁龛与挤奶架',make:cyclopsHusbandry},
} as const;
