import * as THREE from 'three';
import { mergeSimple } from './props';
import { CALYPSO_CAVE, RILL_SAMPLES, calypsoGroundHeight, springWaterHeight, nearestRill } from './calypso-layout';
import type { NarrativePart } from './narrative-assets';
import type { SurfaceName } from '../game/scenes/dresser';

type P = [number, number, number];
const v=(p:P)=>new THREE.Vector3(...p);
const oval=(at:P,scale:P)=>new THREE.SphereGeometry(1,8,6).scale(...scale).translate(...at);
function bar(a:P,b:P,r:number,sides=6){
  const delta=v(b).sub(v(a));
  return new THREE.CylinderGeometry(r*.85,r,delta.length(),sides).applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize())).translate(...v(a).add(v(b)).multiplyScalar(.5).toArray() as P);
}
function cord(points:P[],r:number,segments=10){return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(v)),segments,r,4,false);}
function parts(groups:[SurfaceName,THREE.BufferGeometry[]][]):NarrativePart[]{return groups.filter(([,g])=>g.length).map(([surface,g])=>({surface,geometry:mergeSimple(g)}));}
function surface(positions:number[]){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.computeVertexNormals();return g;}
function quad(out:number[],a:P,b:P,c:P,d:P){out.push(...a,...b,...c,...a,...c,...d);}
function upward(p:number[]){
  for(let i=0;i<p.length;i+=9){
    const y=(p[i+5]!-p[i+2]!)*(p[i+6]!-p[i]!)-(p[i+3]!-p[i]!)*(p[i+8]!-p[i+2]!);
    if(y<0)for(let k=0;k<3;k++){const n=p[i+3+k]!;p[i+3+k]=p[i+6+k]!;p[i+6+k]=n;}
  }return surface(p);
}

/** Closed exterior shell and a recessed habitable vault. +Z is the open approach. */
export function calypsoCave(_seed:number):NarrativePart[]{
  const inner=[[-4.4,-.3],[-4.8,2.1],[-3.2,4.2],[.2,4.5],[3.6,3.5],[4.7,-.3]];
  const outer=[[-6.5,-.4],[-6.8,3],[-4.5,5.6],[.1,6.1],[5.2,4.7],[6.7,-.4]];
  const rock:number[]=[],lining:number[]=[];
  const p=(ring:number[][],i:number,z:number):P=>[ring[i]![0]!*(1+(2-z)*.012),ring[i]![1]!-(2-z)*.035,z];
  for(let i=0;i<5;i++){
    quad(rock,p(inner,i,2),p(inner,i+1,2),p(outer,i+1,2),p(outer,i,2));
    quad(rock,p(outer,i,2),p(outer,i+1,2),p(outer,i+1,-5),p(outer,i,-5));
    quad(lining,p(inner,i,-4.7),p(inner,i+1,-4.7),p(inner,i+1,2),p(inner,i,2));
    quad(rock,p(outer,i,-5),p(outer,i+1,-5),p(inner,i+1,-4.7),p(inner,i,-4.7));
  }
  // Fan has a real back wall, not a billboard or a second doorway.
  for(let i=0;i<5;i++)lining.push(...[0,1.7,-4.7],...p(inner,i,-4.7),...p(inner,i+1,-4.7));
  lining.push(0,1.7,-4.7,...p(inner,5,-4.7),...p(inner,0,-4.7));
  // Explicit opposite faces: camera and baked shadows both see physical thickness.
  const both=(a:number[])=>{const b=[...a];for(let i=0;i<a.length;i+=9)b.push(...a.slice(i,i+3),...a.slice(i+6,i+9),...a.slice(i+3,i+6));return surface(b);};
  const ledges=[new THREE.DodecahedronGeometry(1,0).scale(1.35,1.7,1.6).rotateY(.4).translate(-5.55,1.2,.7),
    new THREE.IcosahedronGeometry(1,0).scale(3.1,.65,1.3).rotateZ(.08).translate(-1.7,5.4,1.65),
    new THREE.DodecahedronGeometry(1,0).scale(1.05,1.4,1.7).rotateY(-.5).translate(5.6,.85,-.4)];
  // Recess uses a darker mineral pigment; a square soot decal read as a window in the first capture.
  return parts([['weatheredMarble',[both(rock),...ledges]],['darkRock',[both(lining)]]]);
}

/** Collision proxies follow side/back walls, leaving the mouth and interior genuinely open. */
export const CALYPSO_CAVE_BLOCKERS = [
  ...[-3,-1,1].flatMap(z=>[{x:CALYPSO_CAVE.x-5.25,z:CALYPSO_CAVE.z+z,radius:.85},{x:CALYPSO_CAVE.x+5.4,z:CALYPSO_CAVE.z+z,radius:.85}]),
  ...[-4,-2,0,2,4].map(x=>({x:CALYPSO_CAVE.x+x,z:CALYPSO_CAVE.z-4.9,radius:1.05})),
];

/** Same mesh in the game and the asset workbench; world-space network, pivot at island origin. */
export function calypsoFourRills(_seed:number):NarrativePart[]{
  const water:number[]=[],banks:number[]=[];
  for(const line of RILL_SAMPLES){
    const edge=(i:number,side:number,offset:number):P=>{
      const p=line[i]!,a=line[Math.max(0,i-1)]!,b=line[Math.min(line.length-1,i+1)]!;
      const dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz),x=p.x-dz/l*offset*side,z=p.z+dx/l*offset*side;
      return [x,offset<.5?springWaterHeight(p.t):calypsoGroundHeight(x,z)+.015,z];
    };
    for(let i=0;i<line.length-1;i++){
      quad(water,edge(i,-1,.42),edge(i+1,-1,.42),edge(i+1,1,.42),edge(i,1,.42));
      for(const side of [-1,1])quad(banks,edge(i,side,.44),edge(i+1,side,.44),edge(i+1,side,.62),edge(i,side,.62));
    }
  }
  return parts([['calypsoWater',[upward(water)]],['calypsoEarth',[upward(banks)]]]);
}

/** Authored worn footpaths; no paint over flowing water. */
export function calypsoPaths(_seed:number):NarrativePart[]{
  const routes:P[][]=[[[4,0,33],[0,0,16],[-4,0,2],[-12,0,-8]],[[1,0,16],[8,0,16],[16,0,15],[23,0,14]],[[0,0,10],[7,0,1],[11,0,-8],[10,0,-17]]];
  const pos:number[]=[];
  for(const points of routes){
    const c=new THREE.CatmullRomCurve3(points.map(v)),steps=Math.ceil(c.getLength()/.45);
    const edge=(t:number,side:number):P=>{const p=c.getPoint(t),d=c.getTangent(t),w=1.05+.14*Math.sin(t*14);const x=p.x-d.z*w*side,z=p.z+d.x*w*side;return[x,calypsoGroundHeight(x,z)+.018,z];};
    for(let i=0;i<steps;i++){const a=i/steps,b=(i+1)/steps,m=c.getPoint((a+b)/2);if(nearestRill(m.x,m.z).distance<1.55)continue;quad(pos,edge(a,-1),edge(b,-1),edge(b,1),edge(a,1));}
  }
  return parts([['calypsoEarth',[upward(pos)]]]);
}

/** Layered, open cedar crown. No spherical orchard canopy or cypress stand-in. */
export function calypsoCedar(seed:number):NarrativePart[]{
  const wood=[bar([0,-.2,0],[.13,5.8,.05],.22,7)],leaves:THREE.BufferGeometry[]=[];
  for(let level=0;level<3;level++)for(let i=0;i<3;i++){
    const a=i*Math.PI*2/3+level*.8+(seed%2)*.4,r=1.1-level*.24,y=3.15+level*1.12;
    const x=Math.cos(a)*r,z=Math.sin(a)*r;
    wood.push(bar([.08,y-.4,0],[x,y,z],.065,5));
    leaves.push(new THREE.IcosahedronGeometry(1,0).scale(1.4-level*.23,.54,1.04-level*.15).rotateY(a).translate(x,y+.28,z));
  }
  return parts([['oliveWood',wood],['olive',leaves]]);
}

/** Concave worn seat is actual geometry. The surrounding rock retains its angular rim. */
export function calypsoSeatRock(_seed:number):NarrativePart[]{
  const top:number[]=[],body:number[]=[],n=14;
  const at=(i:number,r:number,y:number):P=>{const a=i/n*Math.PI*2;return[Math.cos(a)*r*1.45,y+Math.sin(a*3)*.025,Math.sin(a)*r];};
  for(let i=0;i<n;i++){
    top.push(0,.4,0,...at(i,.48,.45),...at(i+1,.48,.45));
    quad(top,at(i,.48,.45),at(i,.8,.7),at(i+1,.8,.7),at(i+1,.48,.45));
    quad(body,at(i,.8,.7),at(i,1.1,.48),at(i+1,1.1,.48),at(i+1,.8,.7));
    quad(body,at(i,1.1,.48),at(i,1.15,-.08),at(i+1,1.15,-.08),at(i+1,1.1,.48));
  }
  // Faces wind upward from an increasing angle in X/Z only when reversed.
  const flip=(a:number[])=>{for(let i=0;i<a.length;i+=9){const b=a.slice(i+3,i+6);a.splice(i+3,3,...a.slice(i+6,i+9));a.splice(i+6,3,...b);}return surface(a);};
  return parts([['weatheredMarble',[flip(top)]],['limestone',[flip(body)]]]);
}

export function calypsoStump(seed:number):NarrativePart[]{
  const variant=seed%3,h=[.42,.53,.61][variant]!,r=[.33,.39,.43][variant]!;
  const body=new THREE.CylinderGeometry(r*.8,r,h,8,1).translate(0,h/2-.035,0);
  const cap=new THREE.CircleGeometry(r*.78,12).rotateX(-Math.PI/2).translate(0,h-.03,0);
  const cuts:THREE.BufferGeometry[]=[];
  for(const radius of [r*.27,r*.55])cuts.push(new THREE.TorusGeometry(radius,.006,3,8).rotateX(-Math.PI/2).translate(0,h-.025,0));
  cuts.push(bar([0,h-.022,0],[r*.69,h-.022,-r*.22],.008,3));
  return parts([['oliveWood',[body]],['saltWood',[cap]],['burntWood',cuts]]);
}

export function calypsoAxe(_seed:number):NarrativePart[]{
  const shape=new THREE.Shape();shape.moveTo(-.1,-.04);shape.lineTo(.24,-.16);shape.lineTo(.3,-.08);shape.lineTo(.26,.02);shape.lineTo(.3,.10);shape.lineTo(.22,.15);shape.lineTo(-.1,.055);shape.closePath();
  const blade=new THREE.ExtrudeGeometry(shape,{depth:.05,bevelEnabled:true,bevelThickness:.008,bevelSize:.012,bevelSegments:1,steps:1}).rotateX(-Math.PI/2).translate(-.13,.085,0);
  return parts([['saltWood',[bar([-.28,.07,0],[.5,.035,.05],.036,7)]],['bronze',[blade]],['rope',[bar([-.16,.11,-.06],[-.16,.11,.06],.026,5)]]]);
}

function gown():THREE.BufferGeometry{
  const rings=[[.075,.36,.21],[.4,.34,.20],[.8,.27,.17],[1.04,.19,.13],[1.21,.25,.17],[1.39,.265,.135]];
  const p:number[]=[],uv:number[]=[],idx:number[]=[],sides=32;
  rings.forEach(([y,rx,rz],row)=>{for(let i=0;i<=sides;i++){
    const a=i/sides*Math.PI*2,fold=Math.cos(a*8+row*.12)*.014;
    p.push(Math.sin(a)*(rx!+fold),y!-(row===5?Math.max(0,Math.cos(a))**2*.135:0),Math.cos(a)*(rz!+fold));uv.push(i/sides,y!);
    if(row&&i<sides){const q=row*(sides+1)+i,b=q-sides-1;idx.push(b,b+1,q,q,b+1,q+1);}
  }});
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;
}

/** Named adult figure: shoulder-front braid, bare arms, low neckline and ochre-gold girdle. */
export function calypsoCharacter(_seed:number):NarrativePart[]{
  const skin:THREE.BufferGeometry[]=[oval([0,1.36,0],[.24,.15,.124]),bar([0,1.42,0],[0,1.6,0],.074,8),oval([0,1.725,.015],[.125,.172,.128]),oval([0,1.647,.055],[.09,.07,.08]),oval([0,1.72,.137],[.023,.041,.034])];
  const cloth=[gown()],hair:THREE.BufferGeometry[]=[],face:THREE.BufferGeometry[]=[],gold:THREE.BufferGeometry[]=[];
  for(const s of [-1,1]){
    skin.push(oval([s*.126,1.725,0],[.019,.033,.023]),oval([s*.13,.055,.105],[.065,.048,.13]));
    const a:P=[s*.255,1.395,0],b:P=[s*.365,1.135,.02],c:P=s<0?[-.28,.975,.18]:[.24,1.075,.24];
    skin.push(oval(a,[.078,.082,.081]),bar(a,b,.069,8),oval(b,[.057,.058,.057]),bar(b,c,.046,8),oval(c,[.05,.033,.064]));
    for(let i=0;i<4;i++)skin.push(bar([c[0]-.03+i*.019,c[1],c[2]+.035],[c[0]-.028+i*.019,c[1]-.035,c[2]+.085-Math.abs(i-1.5)*.006],.009,5));
    skin.push(bar([c[0]-.045,c[1],c[2]],[c[0]-.068,c[1]-.018,c[2]+.043],.014,5));
    cloth.push(cord([[s*.2,1.355,.13],[s*.218,1.451,.015],[s*.2,1.395,-.125]],.037,8));
    face.push(cord([[s*.026,1.744,.137],[s*.055,1.739,.13],[s*.08,1.745,.112]],.0037,5));
    hair.push(cord([[s*.027,1.765,.13],[s*.057,1.773,.123],[s*.09,1.757,.099]],.0045,5));
    gold.push(oval([s*.212,1.449,.035],[.027,.014,.023]));
  }
  face.push(cord([[-.029,1.654,.139],[0,1.65,.146],[.029,1.654,.139]],.0035,5));
  const scalp=new THREE.SphereGeometry(1,14,7,0,Math.PI*2,0,Math.PI/2),sp=scalp.getAttribute('position');
  for(let i=0;i<sp.count;i++){
    const a=Math.atan2(sp.getX(i),sp.getZ(i)),t=Math.acos(Math.max(-1,Math.min(1,sp.getY(i))))/(Math.PI/2),theta=t*(1.8-Math.cos(a)*.53);
    sp.setXYZ(i,Math.sin(a)*Math.sin(theta)*.136,1.733+Math.cos(theta)*.181,Math.cos(a)*Math.sin(theta)*.14-.012);
  }scalp.computeVertexNormals();hair.push(scalp,oval([.03,1.72,-.13],[.096,.1,.071]));
  // One continuous shoulder drape feeds seven visibly interwoven braid lobes.
  hair.push(cord([[.035,1.73,-.15],[.12,1.58,-.12],[.205,1.48,.025],[.205,1.39,.15]],.045,12));
  for(let i=0;i<7;i++)for(const s of [-1,1]){
    const lobe=new THREE.SphereGeometry(1,6,4).scale(.033-i*.002,.05,.027).rotateZ(s*.48);
    lobe.translate(.202+s*.016,1.39-i*.068,.164+i*.003);hair.push(lobe);
  }
  gold.push(new THREE.TorusGeometry(.029,.008,4,10).translate(.202,.928,.181));
  const band=new THREE.CylinderGeometry(.203,.203,.055,32,1,true).scale(1,1,.72).translate(0,1.046,0);
  gold.push(band,oval([0,1.046,.154],[.038,.031,.012]));
  return parts([['figureSkin',skin],['calypsoLinen',cloth],['calypsoCaramel',hair],['burntWood',face],['calypsoGold',gold]]);
}

/** Completed, unworn tunic hung from two pegs. No free-standing shop display. */
export function calypsoRobe(_seed:number):NarrativePart[]{
  const profile=[[.42,.5],[.4,1],[.32,1.65],[.46,1.92],[.14,2.06]].map(([r,y])=>new THREE.Vector2(r,y));
  const cloth=new THREE.LatheGeometry(profile,24).scale(1,1,.3),p=cloth.getAttribute('position');
  for(let i=0;i<p.count;i++)p.setZ(i,p.getZ(i)+Math.cos(p.getX(i)*32)*.011);cloth.computeVertexNormals();
  const hems=[cord([[-.42,.51,0],[0,.5,.12],[.42,.51,0]],.015,12)];
  const pegs=[bar([-.36,2.1,-.65],[-.36,2.1,.08],.037),bar([.36,2.1,-.65],[.36,2.1,.08],.037)];
  const ties=[cord([[-.36,1.97,0],[-.36,2.13,.06],[-.3,1.98,0]],.012,6),cord([[.36,1.97,0],[.36,2.13,.06],[.3,1.98,0]],.012,6)];
  return parts([['figureLinen',[cloth]],['calypsoGold',hems],['saltWood',pegs],['rope',ties]]);
}

export function calypsoDomesticSet(seed:number):NarrativePart[]{
  const stone:THREE.BufferGeometry[]=[],wood:THREE.BufferGeometry[]=[],clay:THREE.BufferGeometry[]=[],cloth:THREE.BufferGeometry[]=[];
  // Local hearth at +X/back, mat at -X. These offsets are also used by placement tests.
  for(let i=0;i<7;i++){const a=i/7*Math.PI*2;stone.push(new THREE.IcosahedronGeometry(.17,0).scale(1.3,.65,1).translate(1.2+Math.cos(a)*.55,.09,-1.3+Math.sin(a)*.55));}
  wood.push(bar([.8,.07,-1.5],[1.55,.12,-1.05],.055),bar([.85,.1,-1],[1.5,.075,-1.6],.05));
  cloth.push(new THREE.BoxGeometry(1.25,.08,.8).translate(-1.1,.06,-1.6),new THREE.BoxGeometry(1.18,.05,.35).translate(-1.1,.12,-1.78));
  for(const [x,z,h] of [[1.35,.6,.68],[2.2,.4,.43]]){
    const profile=[[.10,0],[.26,.12],[.3,.45],[.17,.8],[.18,1],[.13,1],[.12,.79],[.24,.42],[.08,.08]].map(([r,y])=>new THREE.Vector2(r!,y!*h!));
    const pot=new THREE.LatheGeometry(profile,10),pos=pot.getAttribute('position'),uv=pot.getAttribute('uv');
    for(let i=0;i<pos.count;i++)uv.setY(i,i%profile.length<5?pos.getY(i)/h!:0);
    pot.translate(x!,0,z!);clay.push(pot);
  }
  wood.push(bar([-.5,.16,.5],[.25,.16,.5],.016),bar([-.4,.16,.6],[.15,.16,.6],.018));
  cloth.push(oval([-.5,.17,.5],[.09,.08,.09]));
  void seed;
  return parts([['limestone',stone],['burntWood',wood],['paintedClay',clay],['weatheredLinen',cloth]]);
}
