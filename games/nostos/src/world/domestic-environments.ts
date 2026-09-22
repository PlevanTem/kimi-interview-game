import * as THREE from 'three';
import { mergeSimple } from './props';
import type { NarrativePart } from './narrative-assets';
import type { SurfaceName } from '../game/scenes/dresser';
export type DomesticWall=readonly[number,number,number,number,number];
export const HOME_WALLS:DomesticWall[]=[[-6.6,-25,6.6,-25,.7],[-6.6,-25,-6.6,-15.6,.7],[6.6,-25,6.6,-21.4,.7],[6.6,-18.8,6.6,-15.6,.7],[-6.6,-15.6,-1.5,-15.6,.7],[1.5,-15.6,6.6,-15.6,.7],[6.6,-23,11,-23,.6],[11,-23,11,-17,.6],[6.6,-17,11,-17,.6]];
export const ORCHARD_BAYS=[{x:0,z:-7,y:3.2,yaw:-.3},{x:4,z:-16,y:3.2,yaw:-.65},{x:12,z:-23,y:3.2,yaw:-1.05}];
export const DOMESTIC_SHELTERS={ithaca:[{minX:-6,maxX:6,minZ:-24.5,maxZ:-16,roofY:8.6},{minX:7,maxX:10.6,minZ:-22.5,maxZ:-17.5,roofY:7.6}],lotus:ORCHARD_BAYS.map(p=>({minX:p.x-1.4,maxX:p.x+1.4,minZ:p.z-1.7,maxZ:p.z+1.7,roofY:p.y+2.6}))};
const box=(w:number,h:number,d:number,x:number,y:number,z:number)=>new THREE.BoxGeometry(w,h,d).translate(x,y+h/2,z);
const groups=(g:[SurfaceName,THREE.BufferGeometry[]][]):NarrativePart[]=>g.filter(([,a])=>a.length).map(([surface,a])=>({surface,geometry:mergeSimple(a)}));
function jar(x:number,y:number,z:number,size=.8){return new THREE.LatheGeometry([[0,.05],[.22,.05],[.34,.35],[.27,.65],[.13,.77],[.13,.85],[.10,.85],[.10,.77],[.22,.61],[.28,.35],[.16,.12]].map(([r,h])=>new THREE.Vector2(r!*size,h!*size)),10).translate(x,y,z);}
function slope(ax:number,ay:number,bx:number,by:number,z:number,depth:number){return new THREE.BoxGeometry(Math.hypot(bx-ax,by-ay),.16,depth).rotateZ(Math.atan2(by-ay,bx-ax)).translate((ax+bx)/2,(ay+by)/2,z);}
function wallGeometry(w:DomesticWall,h:number,bottom=0){const[ax,az,bx,bz,t]=w;return box(t,h,Math.hypot(bx-ax,bz-az),0,bottom,0).rotateY(Math.atan2(bx-ax,bz-az)).translate((ax+bx)/2,0,(az+bz)/2);}
export function orchardPoint(p:typeof ORCHARD_BAYS[number],x:number,z:number){return {x:p.x+x*Math.cos(p.yaw)+z*Math.sin(p.yaw),z:p.z-x*Math.sin(p.yaw)+z*Math.cos(p.yaw)};}
export function orchardWalls():DomesticWall[]{return ORCHARD_BAYS.flatMap(p=>[[-2.3,-3,-2.3,-.8,.45],[-2.3,1,-2.3,3,.45],[-1.7,-2.4,-1.7,-.8,.8]].map(w=>{const a=orchardPoint(p,w[0]!,w[1]!),b=orchardPoint(p,w[2]!,w[3]!);return[a.x,a.z,b.x,b.z,w[4]!] as DomesticWall;}));}
/** House origin is island XZ; local y=0 means the shared 4.6 m courtyard. */
export function ithacaHome(_seed=3101):NarrativePart[]{
 const plaster:THREE.BufferGeometry[]=[],stone:THREE.BufferGeometry[]=[],wood:THREE.BufferGeometry[]=[],roof:THREE.BufferGeometry[]=[],clay:THREE.BufferGeometry[]=[],dark:THREE.BufferGeometry[]=[];
 HOME_WALLS.forEach((w,i)=>{plaster.push(wallGeometry(w,i<6?4:2.9));stone.push(wallGeometry([w[0],w[1],w[2],w[3],w[4]+.2],.5,-.48));});
 stone.push(box(3.7,.65,.8,0,3.35,-15.6),box(.7,.8,2.6,6.6,3.2,-20.1));
 // Offset roof ridge; three broad interlocking slopes, no palace-sized portico.
 const ridge=-1.8;
 for(const [a,b]of[[-7,ridge],[ridge,7]])for(let c=0;c<3;c++){
  const x0=a!+(b!-a!)*c/3,x1=a!+(b!-a!)*(c+1)/3;
  const y=(x:number)=>4.16+(1-Math.abs(x-ridge)/Math.abs((a===ridge?b:a)!-ridge))*1.75;
  roof.push(slope(x0,y(x0),x1,y(x1),-20.3,10.8));
 }
 // A closed 35cm mineral prism seals each gable, including its sloped edge faces.
 for(const z of [-25,-15.6]){const outline=new THREE.Shape();outline.moveTo(-6.6,4);outline.lineTo(6.6,4);outline.lineTo(ridge,5.8);outline.closePath();plaster.push(new THREE.ExtrudeGeometry(outline,{depth:.35,bevelEnabled:false,steps:1}).translate(0,0,z-.175));}
 for(const z of [-23,-20,-17]){wood.push(box(13.2,.28,.25,0,3.95,z),slope(-6.6,4.08,ridge,5.7,z,.22),slope(ridge,5.7,6.6,4.08,z,.22));}
 wood.push(box(.25,.3,10,ridge,5.5,-20));
 // Lower kitchen roof, split around the real smoke flue at x8.8/z-20.
 roof.push(slope(6.6,3.5,11.3,2.96,-22,2),slope(6.6,3.5,11.3,2.96,-18,2));
 roof.push(slope(6.6,3.5,8.3,3.3,-20,2),slope(9.3,3.18,11.3,2.96,-20,2));
 for(const x of [8.35,9.25])stone.push(box(.14,1.5,1.05,x,3,-20));
 for(const z of [-20.45,-19.55])stone.push(box(.9,1.5,.14,8.8,3,z));
 // Hearth under the actual flue; working table and supported shelves flank it.
 stone.push(box(1.6,.42,1.5,8.8,0,-20));dark.push(box(1.1,.06,1.05,8.8,.43,-20));
 for(let i=0;i<4;i++)wood.push(box(.12,.14,1,7.6+i*.2,0,-22));
 for(const z of[-23.4,-21.8]){wood.push(box(2.7,.15,.65,-4.7,1.1,z));for(const x of[-5.8,-3.6])wood.push(box(.13,1.1,.5,x,0,z));clay.push(jar(-4.7,1.25,z),jar(-5.5,1.25,z,.6));}
 // Small porch roof physically reaches two plain timber uprights.
 for(const x of[-2.5,2.5])wood.push(box(.24,3.35,.24,x,0,-13.4));
 wood.push(box(5.3,.25,.25,0,3.22,-13.4));roof.push(box(5.8,.16,2.6,0,3.42,-14.3));
 // Gutter -> wall-side chute -> cistern. The channel descends monotonically.
 clay.push(box(.22,.15,8.5,6.98,3.95,-20.5),box(.16,2.4,.24,7.07,1.6,-16.5));
 stone.push(box(1.1,.5,1.1,7.4,0,-15.5));clay.push(jar(7.4,.5,-15.5,1.1));
 const spout=new THREE.CatmullRomCurve3([new THREE.Vector3(7.07,1.64,-16.5),new THREE.Vector3(7.2,1.58,-16),new THREE.Vector3(7.4,1.47,-15.5)]);
 clay.push(new THREE.TubeGeometry(spout,6,.105,6,false));
 // Visible overflow groove leaves the cistern plinth toward the open yard.
 for(const x of[7.2,7.6])stone.push(box(.1,.12,2.5,x,0,-13.7));
 dark.push(box(.3,.02,2.5,7.4,.015,-13.7));
 plaster.push(box(1.1,.8,.04,-4.3,.5,-15.18));
 return groups([['paintedPlaster',plaster],['limestone',stone],['oliveWood',wood],['paintedClay',roof.concat(clay)],['charredWood',dark]]);
}
/** Three low, turning agricultural bays; seed-independent authored layout. World Y. */
export function lotusOrchard(_seed=3201):NarrativePart[]{
 const all:[SurfaceName,THREE.BufferGeometry[]][]=[['paintedPlaster',[]],['oliveWood',[]],['paintedClay',[]],['terracotta',[]]];
 for(const p of ORCHARD_BAYS){const masonry:THREE.BufferGeometry[]=[],wood:THREE.BufferGeometry[]=[],roof:THREE.BufferGeometry[]=[],fruit:THREE.BufferGeometry[]=[];
  for(const x of[-2.3,2.3])for(const z of[-3,3]){masonry.push(box(.55,.35,.55,x,-.2,z));wood.push(box(.19,2.65,.19,x,0,z));}
  for(const x of[-2.3,2.3])wood.push(box(.2,.2,6.4,x,2.55,0));
  for(const z of[-3,0,3])wood.push(box(4.8,.2,.2,0,2.55,z),slope(-2.5,2.67,-.7,3.35,z,.16),slope(-.7,3.35,2.5,2.67,z,.16));
  roof.push(slope(-2.6,2.75,-.7,3.43,0,6.6),slope(-.7,3.43,2.6,2.75,0,6.6));
  masonry.push(box(.45,1.75,2.2,-2.3,0,-1.9),box(.45,1.75,2,-2.3,0,2));
  wood.push(box(1.2,.13,1.9,-1.35,.85,-1.7));for(const x of[-1.85,-.85])for(const z of[-2.4,-1])wood.push(box(.12,.85,.12,x,0,z));
  for(let i=0;i<7;i++)fruit.push(new THREE.IcosahedronGeometry(.14,0).translate(-1.7+(i%3)*.32,1.05,-2.3+Math.floor(i/3)*.42));
  roof.push(jar(-1.5,0,1.7),jar(-.65,0,2,.6));
  wood.push(box(1.6,.15,.48,.5,.45,2.3),box(.18,.45,.42,-.1,0,2.3),box(.18,.45,.42,1.1,0,2.3));
  [masonry,wood,roof,fruit].forEach((gs,i)=>gs.forEach(g=>all[i]![1].push(g.rotateY(p.yaw).translate(p.x,p.y,p.z))));
 }
 return groups(all);
}
export const DOMESTIC_ASSETS={'game.nostos.environment.ithaca_home':{name:'伊萨卡偏心树院 · 双坡家宅与灶间',make:ithacaHome},'game.nostos.environment.lotus_orchard':{name:'忘食岸半月果园 · 转折晾果棚廊',make:lotusOrchard}} as const;

/** Ground-following irrigation spillway from the high orchard terrace to lower soil.
 * The shallow mineral bed is not a raised blue water ribbon. Banks end in a flared outlet. */
export function lotusRillSamples(heightAt:(x:number,z:number)=>number){
 return Array.from({length:37},(_,i)=>{const x=16.4+i*.24,z=-22.4;return{x,z,y:heightAt(x,z)+.008,halfWidth:i<29?.22:.22+(i-29)*.035};});
}
export function lotusRill(heightAt:(x:number,z:number)=>number):NarrativePart[]{
 const samples=lotusRillSamples(heightAt),bed:number[]=[],bank:number[]=[];
 const quad=(out:number[],a:number[],b:number[],c:number[],d:number[])=>out.push(...a,...b,...c,...a,...c,...d);
 for(let i=0;i<samples.length-1;i++){
  const a=samples[i]!,b=samples[i+1]!;
  const edge=(p:typeof a,side:number,extra=0,raise=.008)=>{const z=p.z+side*(p.halfWidth+extra);return[p.x,heightAt(p.x,z)+raise,z];};
  quad(bed,edge(a,-1),edge(a,1),edge(b,1),edge(b,-1));
  for(const side of[-1,1]){
   const innerA=edge(a,side,0,.14),innerB=edge(b,side,0,.14),outerA=edge(a,side,.14,.14),outerB=edge(b,side,.14,.14);
   if(side<0)quad(bank,innerA,innerB,outerB,outerA);else quad(bank,outerA,outerB,innerB,innerA);
   quad(bank,edge(a,side,0,-.025),edge(b,side,0,-.025),innerB,innerA);
   quad(bank,outerA,outerB,edge(b,side,.14,-.025),edge(a,side,.14,-.025));
  }
 }
 const mesh=(a:number[])=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(a,3));g.computeVertexNormals();return g;};
 return[{surface:'darkRock',geometry:mesh(bed)},{surface:'limestone',geometry:mesh(bank)}];
}
