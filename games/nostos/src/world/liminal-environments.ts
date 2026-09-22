import * as THREE from 'three';
import { createRng } from '../engine/noise';
import { terrainHeight, type TerrainParams } from './terrain';
import { mergeSimple } from './props';
import type { NarrativePart } from './narrative-assets';

type XZ = readonly [number, number];
export const TIDAL_RUNNELS: readonly (readonly XZ[])[] = [
  [[-12,8],[-15,7],[-18,5],[-21,2],[-24,-1],[-26,-3]],
  [[12,11],[14,13],[16,15],[17,18],[18,20]],
];
export const LIBATION_RILL: readonly XZ[] = [[-2,-24],[-4,-25.8],[-6,-27.8],[-7.2,-30],[-7.8,-33],[-8,-36]];
export const LIMINAL_TERRAINS: Record<'prologue'|'nekyia', TerrainParams> = {
  prologue: { seed:20260101,radius:26,amplitude:1.05,frequency:.06,dome:2.1,ridge:0,detail:'sand',
    colorFlat:0x6b6b6b,colorSteep:0x45474d,colorHigh:0x7a7970,heightStart:1.2,heightEnd:2.6,
    shoreWetWidth:5.6,shoreWetColor:0x26384c,shoreWetStrength:.62,
    basins:TIDAL_RUNNELS.flatMap(line=>line.map(([x,z])=>({x,z,radius:1.65,depth:.10}))) },
  nekyia: { seed:20260501,radius:38,amplitude:1.1,frequency:.026,dome:1.4,ridge:0,detail:'sand',
    colorFlat:0x9fa3a1,colorSteep:0x7c807e,colorHigh:0xafb2b0,heightStart:1.4,heightEnd:3,
    shoreWetWidth:4.5,shoreWetColor:0x535f60,shoreWetStrength:.24,
    basins:[{x:-2,z:-13,radius:4.5,depth:1.1},...LIBATION_RILL.slice(1).map(([x,z])=>({x,z,radius:1.8,depth:.07}))] },
};
export const LIMINAL_RIDGES: Record<'prologue'|'nekyia', readonly (readonly XZ[])[]> = {
  prologue:[
    Array.from({length:9},(_,i)=>[Math.cos(2+i*.1125)*21,Math.sin(2+i*.1125)*21] as const),
    Array.from({length:8},(_,i)=>[Math.cos(.1+i*.09)*22,Math.sin(.1+i*.09)*22] as const),
    Array.from({length:8},(_,i)=>[Math.cos(-1+i*.086)*22,Math.sin(-1+i*.086)*22] as const),
  ],
  nekyia:[ [[-19,15],[-21,11],[-21.5,7],[-23,4]], [[-22,-8],[-23,-12],[-21.7,-16]], [[23,1],[24,-3],[23,-6]] ],
};
const walls=(id:'prologue'|'nekyia')=>LIMINAL_RIDGES[id].flatMap(line=>line.slice(1).map((p,i)=>[...line[i]!,...p,id==='prologue'?1.15:.75] as const));
export const LIMINAL_WALLS = {prologue:walls('prologue'),nekyia:walls('nekyia')} as const;

/** All authored surfaces use the exact live terrain sampler, in world coordinates. */
const ground=(id:'prologue'|'nekyia',x:number,z:number)=>terrainHeight(LIMINAL_TERRAINS[id],x,z);
function ribbon(id:'prologue'|'nekyia',line:readonly XZ[],width:number,lift:number,seed:number):THREE.BufferGeometry {
  const vertices:number[]=[],rng=createRng(seed);
  for(let k=1;k<line.length;k++) {
    const a=line[k-1]!,b=line[k]!,n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])*3);
    const angle=Math.atan2(b[1]-a[1],b[0]-a[0]),nx=-Math.sin(angle),nz=Math.cos(angle);
    for(let j=0;j<n;j++) {
      const points:number[][]=[];
      for(const t of [j/n,(j+1)/n]) for(const side of [-1,1]) {
        const w=width*(.86+rng()*.14)*side*.5,x=a[0]+(b[0]-a[0])*t+nx*w,z=a[1]+(b[1]-a[1])*t+nz*w;
        points.push([x,ground(id,x,z)+lift,z]);
      }
      for(const index of [0,1,2,1,3,2])vertices.push(...points[index]!);
    }
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.computeVertexNormals();return g;
}
function ridge(id:'prologue'|'nekyia',line:readonly XZ[],seed:number):THREE.BufferGeometry {
  const rng=createRng(seed),vertices:number[]=[],sections:number[][][]=[];
  for(let i=0;i<line.length;i++) {
    const p=line[i]!,before=line[Math.max(0,i-1)]!,after=line[Math.min(line.length-1,i+1)]!;
    const a=Math.atan2(after[1]-before[1],after[0]-before[0]),nx=-Math.sin(a),nz=Math.cos(a);
    const taper=Math.sin(Math.PI*(i+.4)/(line.length-.2));
    const h=(id==='prologue'?.42+.72*Math.max(0,taper):.18+.33*Math.max(0,taper))*(.83+rng()*.17);
    const width=(id==='prologue'?1.25:.85)*(.78+rng()*.22);
    sections.push([[-width/2,-.16],[-width*.34,h*.65],[width*.11,h*(.89+rng()*.1)],[width/2,h*.25],[width*.55,-.16]].map(([offset,y])=>{
      const x=p[0]+nx*offset!,z=p[1]+nz*offset!;return [x,ground(id,x,z)+y!,z];
    }));
  }
  for(let i=1;i<sections.length;i++)for(let j=0;j<4;j++)for(const [s,k] of [[i-1,j],[i-1,j+1],[i,j],[i-1,j+1],[i,j+1],[i,j]])vertices.push(...sections[s!]![k!]!);
  // Broken ends expose solid strata rather than an uncapped hollow ribbon.
  for(const end of [0,sections.length-1])for(let j=1;j<4;j++){
    const order=end===0?[0,j+1,j]:[0,j,j+1];
    for(const k of order)vertices.push(...sections[end]![k]!);
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.computeVertexNormals();return g;
}
function beam(a:THREE.Vector3,b:THREE.Vector3,width:number,depth=width):THREE.BufferGeometry {
  const delta=b.clone().sub(a);return new THREE.BoxGeometry(width,depth,delta.length()).applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),delta.normalize())).translate(...a.clone().add(b).multiplyScalar(.5).toArray());
}
const at=(id:'prologue'|'nekyia',x:number,z:number,lift=0)=>new THREE.Vector3(x,ground(id,x,z)+lift,z);

export function prologueTideland(seed=2601):NarrativePart[] {
  const rocks=LIMINAL_RIDGES.prologue.map((line,i)=>ridge('prologue',line,seed+i));
  const wet=TIDAL_RUNNELS.map((line,i)=>ribbon('prologue',line,.48,.012,seed+i));
  // Three ribs spring from the same buried keel. Their broken tops lean inland,
  // at different lengths; the assembly reads as one wreck, not standing columns.
  const timber:THREE.BufferGeometry[]=[];
  timber.push(beam(at('prologue',-16,-5,-.12),at('prologue',-17.5,-10,-.12),.28,.24));
  for(let i=0;i<3;i++){
    const z=-6-i*1.35,x=-16.25-i*.38,height=2.62-i*.31;
    const points=[at('prologue',x,z,-.1),at('prologue',x+.25,z+.1,height*.36),at('prologue',x+1.05,z+.15,height*.78),at('prologue',x+1.55,z+.2,height)];
    for(let j=1;j<points.length;j++)timber.push(beam(points[j-1]!,points[j]!,.15-j*.014,.19));
  }
  // Only two tide-sorted deposits, outside the raft / star negative space.
  for(const [x,z] of [[-15,14],[16,-15]])for(let i=0;i<4;i++){
    const length=1.15+i*.47,a=at('prologue',x!+i*.52,z!+i*.21,.04),b=at('prologue',x!+i*.52+length*.86,z!+i*.21+length*.5,.04);
    timber.push(beam(a,b,.1,.07));
  }
  return [{surface:'layeredBasalt',geometry:mergeSimple(rocks)},{surface:'darkRock',geometry:mergeSimple(wet)},{surface:'saltWood',geometry:mergeSimple(timber)}];
}

export function nekyiaRitual(seed=2701):NarrativePart[] {
  const stone=LIMINAL_RIDGES.nekyia.map((line,i)=>ridge('nekyia',line,seed+i));
  // Discontinuous contour traces remain on the far west; the large central void
  // remains untouched. These are thin mineral strata, not paved stepping stones.
  const silt=[ribbon('nekyia',[[-18,18],[-20,12],[-21,4]],.65,.012,seed),ribbon('nekyia',[[-20,-7],[-20.5,-12],[-19,-18]],.5,.012,seed+1),ribbon('nekyia',LIBATION_RILL,.3,.014,seed+2)];
  for(const side of [-1,1])stone.push(ribbon('nekyia',LIBATION_RILL.map(([x,z])=>[x+side*.3,z] as const),.14,.045,seed+side));
  // A rounded receiving hollow at the shoreward end, leaving the upstream rim
  // interrupted so the incision visibly exits, never a blue rectangular pool.
  const lip:Array<XZ>=Array.from({length:14},(_,i)=>[-8+Math.cos(.4+i*.38)*1.2,-35.8+Math.sin(.4+i*.38)*.7]);
  stone.push(ribbon('nekyia',lip,.16,.04,seed+6));
  // Low grounded supports flank the unlit pyre; no invented planted oar in the
  // narrative's empty oar-hole. A horizontal rest indicates the missing ritual.
  const wood:THREE.BufferGeometry[]=[];
  for(const z of [-.1,2.1])wood.push(beam(at('nekyia',-12.25,z,.13),at('nekyia',-9.75,z,.13),.24,.22));
  stone.push(new THREE.CylinderGeometry(.3,.42,.35,6).translate(7.15,ground('nekyia',7.15,-9)+.1,-9),new THREE.CylinderGeometry(.3,.42,.28,5).translate(8.85,ground('nekyia',8.85,-9)+.09,-9));
  wood.push(beam(at('nekyia',7.15,-9,.28),at('nekyia',8.85,-9,.28),.15,.12));
  return [{surface:'ash',geometry:mergeSimple(stone)},{surface:'darkRock',geometry:mergeSimple(silt)},{surface:'saltWood',geometry:mergeSimple(wood)}];
}

export const LIMINAL_ASSETS = {
  'game.nostos.environment.prologue_tideland':{name:'无名之海 · 断潮岩脊与埋沙船肋',make:prologueTideland},
  'game.nostos.environment.nekyia_ritual':{name:'亡者之岸 · 潮蚀层沿与祭酒浅槽',make:nekyiaRitual},
} as const;
