import { Terrain } from '../src/world/terrain';
import { ENV } from '../src/content/palette';
import { describe, expect, it } from 'vitest';
import { ACTS } from '../src/game/scenes';
import { CEDAR_STUMPS } from '../src/world/late-assets';
import { springPath } from '../src/world/late-effects';
import { CALYPSO_SPRING, CALYPSO_CAVE } from '../src/world/calypso-layout';
import { frameLateMemory, homecomingPose, HOMECOMING_SECONDS } from '../src/game/late-cinema';

describe('later-act narrative/art contracts',()=>{
  it('all later acts use the same sculpted material mode',()=>{for(const act of ACTS.slice(3))expect(ENV[act.def.env].sculptedStyle).toBe(1);});
  it('twenty distinct felled trees include the axe support, not a 21st stump',()=>{
    expect(CEDAR_STUMPS).toHaveLength(20);
    expect(new Set(CEDAR_STUMPS.map(p=>p.x+','+p.z)).size).toBe(20);
    const axe=ACTS[6]!.def.interactables.find(p=>p.id==='calypso.axe')!;
    expect(CEDAR_STUMPS.filter(p=>p.x===axe.x&&p.z===axe.z)).toHaveLength(1);
  });
  it('later present-day speakers are model assets, never billboards',()=>{
    const speakers=ACTS.slice(3).flatMap(a=>a.def.interactables.filter(i=>i.kind==='talk'));
    expect(speakers).toHaveLength(3);
    for(const p of speakers){expect(p.modelAsset).toMatch(/character/);expect(p.motif).toBeUndefined();}
    const host=speakers.find(p=>p.id==='calypso.host')!;
    expect(host.z).toBeGreaterThan(-22);expect(host.prompt).toContain('卡吕普索');
  });
  it('the new cave terrace supports the loom and the wall-hung garment',()=>{
    const act=ACTS[6]!;
    const terrain=Object.assign(Object.create(Terrain.prototype) as Terrain,{params:{frequency:.045,dome:3,ridge:0,waterLevel:0,...act.terrain}});
    for(const [x,z] of [[-15.1,-9],[-12.9,-9],[-15.8,-14.2],[-7,-9]]) expect(Math.abs(terrain.heightAt(x!,z!)-CALYPSO_CAVE.floor)).toBeLessThan(.06);
  });
  it('four separate rills share a spring and remain continuous',()=>{
    const ends=new Set<string>();
    for(let arm=0;arm<4;arm++){
      expect(springPath(arm,0)).toEqual(CALYPSO_SPRING);
      let prev=springPath(arm,0);
      for(let i=1;i<=1024;i++){const p=springPath(arm,i/1024);expect(Math.hypot(p.x-prev.x,p.z-prev.z)).toBeLessThan(.1);prev=p;}
      ends.add(JSON.stringify(prev));
    } expect(ends.size).toBe(4);
  });
  it('memory paintings fit inside conservative film aperture and retire before new subjects',()=>{
    for(const act of ACTS.slice(3)){
      expect(act.def.vision.viewerAnchored).toBe(true);
      for(const b of frameLateMemory(act.def.vision).beats){
        if(!b.motif)continue;
        const m=b.motif,d=-m.z;
        expect(d).toBeGreaterThanOrEqual(26);
        expect((Math.abs(m.y)+m.size/2)/d).toBeLessThan(.29);
        expect((Math.abs(m.x)+m.size/2)/d).toBeLessThan(.42);
        expect(m.crumbleAt).toBeGreaterThan(b.at);
      }
    }
  });
  it('homecoming stays on the door axis, does not cross walls, ends and supports reduced motion',()=>{
    expect(homecomingPose(-1)).toEqual(homecomingPose(0));
    let z=4;
    for(let t=0;t<=HOMECOMING_SECONDS;t+=.25){const p=homecomingPose(t);expect(p.x).toBe(0);expect(p.z).toBeLessThanOrEqual(z);expect(p.z).toBeGreaterThanOrEqual(-14);z=p.z;}
    expect(homecomingPose(HOMECOMING_SECONDS)).toMatchObject({done:true,fade:1});
    expect(homecomingPose(0,true).z).toBe(homecomingPose(12,true).z);
  });
});
