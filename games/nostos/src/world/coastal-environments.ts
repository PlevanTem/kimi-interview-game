import * as THREE from 'three';
import { mergeSimple } from './props';
import { terrainHeight, type TerrainParams } from './terrain';
import { CALYPSO_CAVE, calypsoGroundHeight, springPath, springWaterHeight } from './calypso-layout';
import type { NarrativePart } from './narrative-assets';
import type { SurfaceName } from '../game/scenes/dresser';

type P = [number, number, number];
type Wall = readonly [number, number, number, number, number];
export const SIRENS_TERRAIN: TerrainParams = {
  seed:20260601,radius:40,amplitude:3.4,frequency:.066,dome:2.6,ridge:2.8,detail:'stone',
  colorFlat:0x6d7178,colorSteep:0x484d54,colorHigh:0x7d818a,heightStart:3.5,heightEnd:9,
};
const ground=(x:number,z:number)=>terrainHeight(SIRENS_TERRAIN,x,z);
const box=(w:number,h:number,l:number,x:number,y:number,z:number)=>new THREE.BoxGeometry(w,h,l).translate(x,y+h/2,z);
function beam(a:P,b:P,w:number,h=w){
  const v=new THREE.Vector3(...a),u=new THREE.Vector3(...b),d=u.clone().sub(v);
  return new THREE.BoxGeometry(w,h,d.length()).applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),d.normalize())).translate(...v.add(u).multiplyScalar(.5).toArray() as P);
}
function cord(points:P[],r:number,segments=8){return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),segments,r,4,false);}
function grouped(groups:[SurfaceName,THREE.BufferGeometry[]][]):NarrativePart[]{return groups.filter(([,g])=>g.length).map(([surface,g])=>({surface,geometry:mergeSimple(g)}));}

// Non-mirrored bedding planes: the throat closes beyond the mast, never over its view.
export const SIRENS_STRATA = [
  {x:-24,z:19,w:9,l:15,h:7,lean:2.2}, {x:-22,z:0,w:10,l:17,h:11,lean:3.1},
  {x:-19,z:-22,w:8,l:13,h:14,lean:2.4}, {x:24,z:12,w:10,l:19,h:9,lean:-2.3},
  {x:23,z:-12,w:9,l:16,h:12,lean:-3}, {x:16,z:-31,w:7,l:9,h:8,lean:-1.5},
] as const;
export const SIRENS_WRECKS = [{x:-13,z:22,length:13,width:4.4},{x:16,z:5,length:14,width:4.2},{x:-13,z:-11,length:11,width:4}] as const;
/** Surface anchors come from the actual generated middle rib and mooring stone. */
export const SIRENS_MOORINGS=SIRENS_WRECKS.map((r,index)=>{
  const left=index===1,sx=r.x+(left?-3.8:3.8),sz=r.z+3.7,y=ground(r.x,r.z),w=r.width/2,z=r.z;
  const rib=cord([[r.x-w,y+1.45,z-.1],[r.x-w*.78,y+.45,z],[r.x,y+.12,z],[r.x+w*.78,y+.55,z],[r.x+w,y+1.8-index*.24,z+.2]],.115,8);
  const p=rib.getAttribute('position'),i=left?0:p.count-5;
  const end:[number,number,number]=[p.getX(i),p.getY(i),p.getZ(i)];rib.dispose();
  const stone=new THREE.DodecahedronGeometry(.75,0).scale(1,.62,1).translate(sx,ground(sx,sz)+.2,sz),s=stone.getAttribute('position');
  let top=0;for(let j=1;j<s.count;j++)if(s.getY(j)>s.getY(top))top=j;
  const start:P=[s.getX(top),s.getY(top),s.getZ(top)];stone.dispose();
  return {stone:start,rib:end};
});
export const COASTAL_WALLS:Record<'sirens'|'calypso',readonly Wall[]>={
  sirens:[...SIRENS_STRATA.flatMap(r=>[
    [r.x-r.w/2,r.z-r.l/2,r.x-r.w/2,r.z+r.l/2,.3] as Wall,
    [r.x+r.w/2,r.z-r.l/2,r.x+r.w/2,r.z+r.l/2,.3] as Wall,
    [r.x-r.w/2,r.z-r.l/2,r.x+r.w/2,r.z-r.l/2,.3] as Wall,
    [r.x-r.w/2,r.z+r.l/2,r.x+r.w/2,r.z+r.l/2,.3] as Wall,
  ]),...SIRENS_WRECKS.flatMap(r=>[-1,1].map(s=>[r.x+s*r.width/2,r.z-r.length*.34,r.x+s*r.width/2,r.z+r.length*.34,.25] as Wall))],
  calypso:[[-14.8,-16.35,-12.5,-16.35,.85],[-9.1,-15.7,-7.7,-15.7,.9],[16.4,-23.8,16.4,-17.5,.45],[19.3,-23.8,19.3,-17.5,.45]],
};

/** Six closed, sloping rock masses with fractured bedding, not upright architectural piers. */
export function sirensChannel(_seed=3201):NarrativePart[]{
  const result:NarrativePart[]=[];
  const rock:THREE.BufferGeometry[]=[],seams:THREE.BufferGeometry[]=[],wood:THREE.BufferGeometry[]=[],rope:THREE.BufferGeometry[]=[];
  for(const r of SIRENS_STRATA){
    const base=Math.min(...[-1,1].flatMap(s=>[-1,1].map(t=>ground(r.x+s*r.w/2,r.z+t*r.l/2))))-r.l*.06-.8;
    // Shared perimeter rings form one continuous wedge. Bedding is a surface
    // transition, never an air gap or an independent stack of rectangular slabs.
    const footprint=[[-1,-.75],[-.28,-1],[.63,-.86],[1,-.15],[.73,.72],[.12,1],[-.7,.84],[-.94,.14]];
    const ring=(level:number)=>footprint.map(([x,z],i):P=>{
      const t=level/5,shrink=1-t*.46;
      return[r.x+x!*r.w*.5*shrink+r.lean*t,
        base+r.h*t+z!*r.l*.055+Math.sin(i*1.7+level*.35)*.18,
        r.z+z!*r.l*.5*shrink-t*1.4];
    });
    const rings=Array.from({length:6},(_,i)=>ring(i));
    for(let i=0;i<5;i++){
      const vertices:number[]=[],low=rings[i]!,high=rings[i+1]!;
      for(let j=0;j<8;j++){
        const k=(j+1)%8,a=low[j]!,b=low[k]!,c=high[k]!,d=high[j]!;
        vertices.push(...a,...d,...c,...a,...c,...b);
      }
      if(i===0)for(let j=1;j<7;j++)vertices.push(...low[0]!,...low[j]!,...low[j+1]!);
      if(i===4)for(let j=1;j<7;j++)vertices.push(...high[0]!,...high[j+1]!,...high[j]!);
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.computeVertexNormals();
      (i%3===0?seams:rock).push(g);
    }
    result.push(...grouped([['layeredBasalt',rock.splice(0)],['darkRock',seams.splice(0)]]));
  }
  for(const [index,r] of SIRENS_WRECKS.entries()){
    // Broken ships share the flow axis but differ in height, intact side and exposed ribs.
    const points:P[]=[];
    for(let i=0;i<=10;i++){const z=r.z-r.length/2+i*r.length/10;points.push([r.x,ground(r.x,z)+.1,z]);}
    wood.push(cord(points,.18,12));
    for(let i=0;i<7;i++){
      const t=(i-3)/3,z=r.z+t*r.length*.42,w=r.width/2*(1-Math.abs(t)*.38);
      const y=ground(r.x,z);
      wood.push(cord([[r.x-w,y+1.45,z-.1],[r.x-w*.78,y+.45,z],[r.x,y+.12,z],[r.x+w*.78,y+.55,z],[r.x+w,y+1.8-index*.24,z+.2]],.115,8));
    }
    // Flat wreck-plank fan follows actual terrain, traversable from both open ends.
    for(let row=0;row<9;row++)for(let col=0;col<3;col++){
      const x=r.x+(col-1)*.62,z=r.z+(row-4)*.64;
      const g=new THREE.BoxGeometry(.57,.06,.66),p=g.getAttribute('position');
      for(let v=0;v<p.count;v++){const vx=x+p.getX(v),vz=z+p.getZ(v);p.setXYZ(v,vx,ground(vx,vz)+p.getY(v)+.02,vz);}
      g.computeVertexNormals();wood.push(g);
    }
    // Mooring stone and a sagging taut line connect to an actual upper rib.
    const sx=r.x+(index===1?-3.8:3.8),sz=r.z+3.7,sy=ground(sx,sz);
    rock.push(new THREE.DodecahedronGeometry(.75,0).scale(1,.62,1).translate(sx,sy+.2,sz));
    const {stone:start,rib:end}=SIRENS_MOORINGS[index]!;
    rope.push(cord([start,[(start[0]+end[0])/2,Math.min(start[1],end[1])-.2,(start[2]+end[2])/2],end],.06));
    result.push(...grouped([['layeredBasalt',rock.splice(0)],['saltWood',wood.splice(0)],['rope',rope.splice(0)]]));
  }
  return result;
}

/** Existing shell and spring network remain intact; additions occupy peripheral use zones. */
export function calypsoLiving(_seed=3301):NarrativePart[]{
  const result:NarrativePart[]=[];
  const stone:THREE.BufferGeometry[]=[],wood:THREE.BufferGeometry[]=[],linen:THREE.BufferGeometry[]=[],clay:THREE.BufferGeometry[]=[];
  const f=CALYPSO_CAVE.floor;
  // Continuous mineral rib follows and embeds into the existing inner shell.
  // Endpoints extend below the floor; the crown joins both grounded shoulders.
  const lining=[cord([[-16.68,f-.5,-16.2],[-17.1,f+1.92,-16.2],[-15.4,f+4.02,-16.2],[-11.78,f+4.32,-16.2],[-8.17,f+3.32,-16.2],[-7.01,f-.5,-16.2]],.34,22)];
  // Dry sleeping platform: bearing legs and woven surface in the back-left recess.
  for(const x of [-14.6,-12.7])for(const z of [-16.65,-16.05])wood.push(box(.18,.42,.18,x,f,z));
  wood.push(box(2.3,.14,.98,-13.65,f+.4,-16.35));
  linen.push(box(2.13,.06,.84,-13.65,f+.54,-16.35));
  for(let i=0;i<6;i++)linen.push(box(.035,.025,.86,-14.5+i*.34,f+.6,-16.35));
  // Hearth/counter footprint is separated from loom, robe and host anchors.
  stone.push(box(1.5,.35,1,-8.4,f-.1,-15.7),box(.24,.65,1,-9.05,f,-15.7),box(.24,.65,1,-7.75,f,-15.7));
  clay.push(box(.88,.03,.65,-8.4,f+.27,-15.7));
  for(let i=0;i<4;i++)wood.push(beam([-8.9+i*.25,f+.4,-15.95],[-8.5+i*.15,f+.42,-15.5],.08));
  // A supported work ledge and an open bowl, not high floating storage.
  stone.push(box(.35,.66,.65,-9.35,f,-17),box(.35,.66,.65,-10.7,f,-17),box(1.8,.16,.8,-10,f+.66,-17));
  clay.push(new THREE.LatheGeometry([new THREE.Vector2(.05,0),new THREE.Vector2(.3,.06),new THREE.Vector2(.38,.32),new THREE.Vector2(.32,.32),new THREE.Vector2(.25,.12),new THREE.Vector2(.05,.08)],10).translate(-10,f+.82,-17));
  result.push(...grouped([['darkRock',lining],['weatheredMarble',stone.splice(0)],['saltWood',wood.splice(0)],['cloth',linen.splice(0)],['paintedClay',clay.splice(0)]]));
  // Eastern timber yard: trestles carry a rising unfinished keel, off the axe route.
  const yardY=Math.max(calypsoGroundHeight(17.8,-23),calypsoGroundHeight(17.8,-18.5));
  for(const z of [-23,-18.5]){
    for(const x of [16.4,19.3])wood.push(beam([x,calypsoGroundHeight(x,z)-.15,z],[x,yardY+.85,z],.22));
    wood.push(beam([16.1,yardY+.78,z],[19.6,yardY+.78,z],.25));
  }
  wood.push(beam([17.8,yardY+1,-24.5],[17.8,yardY+1,-17],.35,.3));
  for(let i=0;i<5;i++){const z=-23+i*1.15;wood.push(cord([[16.6,yardY+2,z],[16.9,yardY+1.25,z],[17.8,yardY+1,z],[18.7,yardY+1.25,z],[19,yardY+2,z]],.11,6));}
  for(let i=0;i<5;i++){const x=21+i*.2,z=-19+i*.13,y=calypsoGroundHeight(x,z);wood.push(beam([x,y+.16,z-2.7],[x,y+.16,z+2.7],.15,.13));}
  for(let i=0;i<9;i++){const x=14.3+(i%3)*.35,z=-21+Math.floor(i/3)*.42;wood.push(box(.28,.025,.1,x,calypsoGroundHeight(x,z)+.02,z).rotateY(0));}
  result.push(...grouped([['saltWood',wood.splice(0)]]));
  // Two curved lips follow the real rill; water remains the original downhill surface.
  const pool:number[]=[];
  const bankPoint=(arm:number,t:number,side:number,lip:boolean):P=>{
    const p=springPath(arm,t),q=springPath(arm,t+.001),l=Math.hypot(q.x-p.x,q.z-p.z);
    const width=.43+.43*Math.sin((t-.035)/.08*Math.PI)+(lip?.08:0);
    const x=p.x-(q.z-p.z)/l*width*side,z=p.z+(q.x-p.x)/l*width*side;
    return[x,springWaterHeight(t)+(lip?.06:.004),z];
  };
  for(const arm of [0,2])for(const side of [-1,1]){
    const points:P[]=[];
    for(let i=0;i<=8;i++)points.push(bankPoint(arm,.035+i*.01,side,true));
    stone.push(cord(points,.085,10));
  }
  for(const arm of [0,2])for(let i=0;i<8;i++){
    const t=.035+i*.01,a=bankPoint(arm,t,-1,false),b=bankPoint(arm,t+.01,-1,false),c=bankPoint(arm,t+.01,1,false),d=bankPoint(arm,t,1,false);
    const normal=new THREE.Vector3(...b).sub(new THREE.Vector3(...a)).cross(new THREE.Vector3(...c).sub(new THREE.Vector3(...a)));
    pool.push(...a,...(normal.y>0?b:c),...(normal.y>0?c:b),...a,...(normal.y>0?c:d),...(normal.y>0?d:c));
  }
  const water=new THREE.BufferGeometry();water.setAttribute('position',new THREE.Float32BufferAttribute(pool,3));water.computeVertexNormals();
  return [...result,...grouped([['weatheredMarble',stone],['calypsoWater',[water]]])];
}

export const COASTAL_ASSETS={
  'game.nostos.environment.sirens_channel':{name:'塞壬斜层岩峡 · 顺流船骸与系泊',make:sirensChannel},
  'game.nostos.environment.calypso_living':{name:'卡吕普索洞居生活 · 造舟料场与取水岸',make:calypsoLiving},
} as const;
