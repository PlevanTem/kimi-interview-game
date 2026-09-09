/** Authored metre-space shared by terrain, water, dressing and the sea chart. No renderer dependency. */
export const CALYPSO_CAVE = { x: -12, z: -13, floor: 1.75 };
export const CALYPSO_SPRING = { x: -12, z: 3 };
type XZ = { x: number; z: number };
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const ease = (n: number) => { const t = clamp01(n); return t * t * (3 - 2 * t); };

// Each final point is beyond the actual zero-height shore; not four decorative dead ends.
const RILL_CONTROLS: readonly (readonly [number, number])[][] = [
  [[-12, 3], [-21, 9], [-31, 7], [-40, 6]],
  [[-12, 3], [-29, -1], [-30, -22], [-20, -35]],
  [[-12, 3], [-18, 14], [-7, 26], [-10, 39]],
  [[-12, 3], [-1, 9], [22, 10], [40, 6]],
];
export const RILL_SEGMENTS = 64;
export function springPath(arm: number, progress: number): XZ {
  const c = RILL_CONTROLS[arm];
  if (!c) throw new RangeError('Calypso has exactly four rills');
  const t = clamp01(progress), u = 1 - t;
  const weights = [u*u*u, 3*u*u*t, 3*u*t*t, t*t*t];
  return { x: c.reduce((n,p,i)=>n+p[0]*weights[i]!,0), z: c.reduce((n,p,i)=>n+p[1]*weights[i]!,0) };
}
export function springWaterHeight(progress: number): number { return 1.7 * (1 - clamp01(progress)); }
export const RILL_SAMPLES = RILL_CONTROLS.map((_, arm) => Array.from({length:RILL_SEGMENTS+1},(_,i)=>({...springPath(arm,i/RILL_SEGMENTS),t:i/RILL_SEGMENTS})));

/** Nearest point on the same polylines used by rendered ribbons, not a second approximation. */
export function nearestRill(x: number, z: number): { distance: number; t: number; arm: number } {
  let distance2=Infinity, t=0, arm=0;
  RILL_SAMPLES.forEach((line,a)=>{
    for(let i=0;i<line.length-1;i++){
      const p=line[i]!,q=line[i+1]!,dx=q.x-p.x,dz=q.z-p.z;
      const s=clamp01(((x-p.x)*dx+(z-p.z)*dz)/(dx*dx+dz*dz));
      const d=(x-p.x-s*dx)**2+(z-p.z-s*dz)**2;
      if(d<distance2){distance2=d;t=(i+s)/RILL_SEGMENTS;arm=a;}
    }
  });
  return {distance:Math.sqrt(distance2),t,arm};
}

/** Broad grassy swales, shallow ford, continuous shore. The cave floor stays genuinely level. */
export function calypsoGroundHeight(x: number, z: number): number {
  const r=Math.hypot(x,z);
  if(r>=40) return -(r-40)*.18;
  let base=1.75*(1-ease((r-18)/22));
  const terrace=1-ease(Math.max(0,Math.abs(x+12)-7,Math.abs(z+13)-5)/4);
  base+=(1.75-base)*terrace;
  const near=nearestRill(x,z);
  const bed=springWaterHeight(near.t)-.11;
  // A wide transition keeps the banks walkable; only the central 0.9m is wet.
  const weight=1-ease((near.distance-.5)/8);
  return base+(Math.min(base,bed)-base)*weight;
}

export const CEDAR_STUMPS = [
  [7,-3],[10,-2],[12.8,-4.5],[8.6,-6.2],[12,-8],[6.4,-7.8],
  [16,-8.5],[20,-8],[22,-11],[18.5,-11.5],[15.4,-12.5],[21,-14.5],[17.5,-15.6],
  [5,-14],[8,-13],[11.5,-14.3],[4.3,-17.4],[6.5,-20],[8.2,-17],[10,-19],
].map(([x,z])=>({x:x!,z:z!}));

export const CALYPSO_TREES = [
  {x:-21,z:-11,scale:1}, {x:-18,z:-24,scale:.9}, {x:-3,z:-24,scale:1.08},
  {x:25,z:-6,scale:.9}, {x:29,z:5,scale:.8},
];
export const CALYPSO_VIEWS = [
  {name:'arrival',x:4,z:33,yaw:.32,pitch:.02},
  {name:'clearing',x:0,z:4,yaw:.58,pitch:.02},
  {name:'host',x:-5,z:-6.5,yaw:.675,pitch:-.04},
  {name:'seaward',x:21,z:14,yaw:-Math.PI/2,pitch:-.14},
] as const;
