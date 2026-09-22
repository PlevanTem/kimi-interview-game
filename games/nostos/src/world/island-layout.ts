import { DOMESTIC_SHELTERS } from './domestic-environments';
/** Metres, +Y up. Review cameras and climate shelters share authored layout. */
export interface Shelter { minX: number; maxX: number; minZ: number; maxZ: number; roof: number }
export interface ReviewView { name: string; x: number; z: number; yaw: number; pitch: number }
export interface IslandLayout {
  name: string;
  status: 'pilot' | 'designed' | 'candidate';
  route: ReadonlyArray<readonly [number, number]>;
  shelters: Shelter[];
  views: ReviewView[];
}
const view = (name: string, x: number, z: number, yaw=0, pitch=-.04): ReviewView => ({name,x,z,yaw,pitch});
export const ISLAND_LAYOUTS: Record<string, IslandLayout> = {
  prologue: {name:'无名之海',status:'designed',route:[[-3.8,9.8],[0,4],[2,-5]],shelters:[],views:[view('arrival',-3.8,9.8,.3),view('middle',0,4),view('detail',2,-3,0,-.4)]},
  lotus: {name:'忘食岸',status:'designed',route:[[0,30],[0,15],[-4,3],[0,-16]],shelters:[],views:[view('arrival',0,30),view('middle',-4,8),view('detail',0,-12,0,-.3)]},
  cyclops: {name:'独眼岬',status:'pilot',route:[[6,36],[0,25],[0,12],[0,-5],[0,-18],[0,-25]],shelters:[{minX:-3.5,maxX:3.5,minZ:-32,maxZ:-26,roof:10}],views:[view('arrival',6,30,.13,.02),view('middle',0,-12,0,.05),view('detail',1,-23,.25,-.1)]},
  circe: {name:'喀耳刻的柱廊',status:'pilot',route:[[0,33],[0,16],[0,7],[-4,-3],[-8,-12],[0,-18]],shelters:[{minX:-15.5,maxX:-7.5,minZ:-21.5,maxZ:1.5,roof:8.4},{minX:7.5,maxX:15.5,minZ:-9.5,maxZ:-1,roof:8.4}],views:[view('arrival',0,21,0,.02),view('middle',2,3,.28,.08),view('detail',-6,-6,.68,-.02)]},
  nekyia: {name:'亡者之岸',status:'designed',route:[[0,26],[0,10],[0,-10]],shelters:[],views:[view('arrival',0,26),view('middle',0,8),view('detail',0,-7,0,-.3)]},
  sirens: {name:'塞壬水道',status:'designed',route:[[0,32],[0,12],[0,-18]],shelters:[],views:[view('arrival',0,32),view('middle',0,8),view('detail',0,-15,0,-.2)]},
  calypso: {name:'卡吕普索之岛',status:'designed',route:[[0,30],[0,10],[-10,-8],[14,0]],shelters:[],views:[view('arrival',0,26),view('middle',0,8,.35),view('detail',-10,-8,.1,-.15)]},
  ithaca: {name:'伊萨卡',status:'designed',route:[[0,30],[0,12],[0,-10]],shelters:[],views:[view('arrival',0,26),view('middle',0,5),view('detail',0,-11,0,-.08)]},
};

// R2 candidates are implemented, but neither visual lock nor device acceptance is implied.
for(const id of ['prologue','lotus','nekyia','sirens','calypso','ithaca'])ISLAND_LAYOUTS[id]!.status='candidate';
for(const id of ['ithaca','lotus'] as const)ISLAND_LAYOUTS[id]!.shelters=DOMESTIC_SHELTERS[id].map(({roofY,...bounds})=>({...bounds,roof:roofY}));
ISLAND_LAYOUTS.calypso!.shelters=[{minX:-15.5,maxX:-8.8,minZ:-17.3,maxZ:-12.5,roof:5.2}];

export function underRoof(x: number, y: number, z: number, zones: readonly Shelter[]): boolean {
  return zones.some(s => x >= s.minX && x <= s.maxX && z >= s.minZ && z <= s.maxZ && y < s.roof);
}
