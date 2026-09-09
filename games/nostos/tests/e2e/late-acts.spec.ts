import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import type {} from '../../src/probe';
import { ART_REVISION } from '../../src/content/revision';

test('later acts: authored assets, memory aperture, NPC interaction and homecoming @late-acts',async({page})=>{
  test.setTimeout(900000);
  const dir=fileURLToPath(new URL('../../runs/run-20260909-late-acts-r1/after/',import.meta.url));mkdirSync(dir,{recursive:true});
  const errors:string[]=[],reports:unknown[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:1280,height:720});
  await page.goto('/?preview=circe');
  await page.waitForFunction(()=>window.__nostos?.state().phase==='roaming');
  const frames=async()=>{const f=await page.evaluate(()=>window.__nostos!.state().frames);await page.waitForFunction(n=>window.__nostos!.state().frames>n+3,f);};
  const shot=async(name:string)=>{await frames();await page.screenshot({path:dir+name+'.jpg',type:'jpeg',quality:90});};
  const view=async(p:{x:number;z:number;yaw:number;pitch:number})=>{await page.evaluate(p=>window.__nostos!.view(p),p);await frames();};
  const use=async(id:string)=>{expect(await page.evaluate(id=>window.__nostos!.teleport(id),id)).toBe(true);await page.waitForFunction(id=>window.__nostos!.state().focus===id,id);await page.keyboard.press('e');await frames();};
  const cases=[
    {act:3,views:[['circe-portal',-9.5,19.8,0,.06],['circe-loom-and-host',-11,-6,0,-.10],['circe-face',-12,-10.8,0,-.2]],talk:'circe.host'},
    {act:4,views:[['nekyia-boundary',12.6,13.8,0,-.2],['nekyia-young-sailor',12,-10.8,0,-.2]],talk:'nekyia.shade'},
    {act:5,views:[['sirens-rope',1,-24.4,0,-.45]],talk:null},
    {act:6,views:[['calypso-four-springs',-14,14.5,0,-.33],['calypso-twenty-stumps',8,7,0,-.2],['calypso-loom-robe-host',-9,-12,0,-.12],['calypso-face',-5,-15.8,0,-.2]],talk:'calypso.host'},
    {act:7,views:[['ithaca-home-smoke',0,4,0,.2],['ithaca-doorway',0,-8,0,.13]],talk:null},
  ] as const;
  for(const item of cases){
    if(item.act!==3){await page.evaluate(i=>window.__nostos!.gotoAct(i),item.act);await page.waitForFunction(()=>window.__nostos!.state().phase==='roaming');}
    for(const [name,x,z,yaw,pitch]of item.views){await view({x,z,yaw,pitch});await shot(name);}
    if(item.talk){await use(item.talk);expect((await page.evaluate(()=>window.__nostos!.state())).narrating).toBe(true);await shot('talk-'+item.act);await page.evaluate(()=>window.__nostos!.skipNarration());await frames();}
    reports.push(await page.evaluate(()=>window.__nostos!.state()));
    if(item.act===3){
      await use('circe.cup');await page.evaluate(()=>window.__nostos!.skipNarration());
      await page.waitForFunction(()=>window.__nostos!.state().phase==='vision');
      await page.waitForFunction(()=>window.__nostos!.state().visionTime>3);
      await shot('circe-memory-wide');
      await page.keyboard.press('Space');await page.waitForFunction(()=>window.__nostos!.state().phase==='roaming');
    }
  }
  await use('ithaca.threshold');await page.evaluate(()=>window.__nostos!.skipNarration());
  await page.waitForFunction(()=>window.__nostos!.state().phase==='vision');
  await page.keyboard.press('Space');
  await page.waitForFunction(()=>window.__nostos!.state().phase==='epilogue');
  await shot('homecoming-start');
  await page.keyboard.press('Escape');await expect(page.locator('.pausepanel')).toBeVisible();
  const frozen=await page.evaluate(()=>window.__nostos!.state().homecomingTime);
  await page.waitForTimeout(600);
  expect(await page.evaluate(()=>window.__nostos!.state().homecomingTime)).toBe(frozen);
  await expect(page.locator('.review-build')).toHaveAttribute('data-revision',ART_REVISION);
  await shot('late-esc');
  await page.keyboard.press('Escape');
  await page.waitForFunction(()=>window.__nostos!.state().homecomingTime>8);
  await shot('homecoming-mid');
  await page.waitForFunction(()=>window.__nostos!.state().phase==='ended',null,{timeout:180000});
  await shot('homecoming-end');
  expect(errors).toEqual([]);
  writeFileSync(dir+'browser-verification.json',JSON.stringify({revision:ART_REVISION,reports,errors,ending:'natural completion; paused timer verified',viewport:'1280x720'},null,2));
});
