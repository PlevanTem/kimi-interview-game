import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type {} from '../../src/probe';

test.use({ hasTouch:true,viewport:{width:844,height:390},launchOptions:{channel:'msedge',args:['--no-sandbox']} });
const dir=fileURLToPath(new URL('../../runs/run-20260922-eight-islands-r1/after/',import.meta.url));
async function frames(page:Page) {
  const n=await page.evaluate(()=>window.__nostos!.state().frames);
  await page.waitForFunction(n=>window.__nostos!.state().frames>n+2,n);
}
async function finishNarration(page:Page) {
  for(let i=0;i<30;i++) {
    if(!(await page.evaluate(()=>window.__nostos!.state().narrating)))return;
    await page.locator('[data-touch="skip"]').tap();await frames(page);
  }
  expect(await page.evaluate(()=>window.__nostos!.state().narrating)).toBe(false);
}

test('eight acts retain touch interaction, memory, pause, departure and ending @eight-islands',async({page})=>{
  test.setTimeout(600000);mkdirSync(dir,{recursive:true});
  const errors:string[]=[],states:unknown[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto('/?preview=prologue&quality=low');
  for(let act=0;act<8;act++) {
    await page.waitForFunction(act=>window.__nostos?.state().act===act && window.__nostos.state().phase==='roaming',act);
    const state=await page.evaluate(()=>window.__nostos!.state());
    for(const id of state.interactableIds.filter(id=>id!==state.memoryId && id!==state.departId)) {
      // Positioning only is accelerated. Actions use the visible touch controls.
      await page.evaluate(()=>window.__nostos!.view({x:0,z:8,yaw:0,pitch:0}));
      expect(await page.evaluate(id=>window.__nostos!.teleport(id),id)).toBe(true);
      await page.waitForFunction(id=>window.__nostos!.state().focus===id,id);
      await page.locator('[data-touch="interact"]').tap();await frames(page);
      expect(await page.evaluate(()=>window.__nostos!.state().narrating)).toBe(true);
      await finishNarration(page);
    }
    await page.evaluate(id=>window.__nostos!.teleport(id),state.memoryId);
    await page.waitForFunction(id=>window.__nostos!.state().focus===id,state.memoryId);
    await page.locator('[data-touch="interact"]').tap();await frames(page);await finishNarration(page);
    await page.waitForFunction(()=>window.__nostos!.state().phase==='vision');
    await page.locator('[data-touch="pause"]').tap();
    await expect(page.locator('.pausepanel')).toHaveCSS('opacity','1');
    const time=await page.evaluate(()=>window.__nostos!.state().visionTime);
    await page.waitForTimeout(250);expect(await page.evaluate(()=>window.__nostos!.state().visionTime)).toBe(time);
    await page.locator('[data-role="resume"]').tap();
    await page.locator('[data-touch="skip"]').tap();
    if(act===7){
      await page.waitForFunction(()=>window.__nostos!.state().phase==='epilogue');
      await page.locator('[data-touch="skip"]').tap();
      await page.waitForFunction(()=>window.__nostos!.state().phase==='ended');
    }else{
      await page.waitForFunction(()=>window.__nostos!.state().phase==='roaming');
      states.push(await page.evaluate(()=>window.__nostos!.state()));
      await page.evaluate(id=>window.__nostos!.teleport(id!),state.departId);
      await page.waitForFunction(id=>window.__nostos!.state().focus===id,state.departId);
      await page.locator('[data-touch="interact"]').tap();
    }
  }
  await page.screenshot({path:dir+'touch-ending.jpg',type:'jpeg'});
  expect(errors).toEqual([]);
  writeFileSync(dir+'touch-journey.json',JSON.stringify({states,errors,note:'Desktop Edge touch emulation; positioning accelerated; not physical-phone performance evidence'},null,2));
});

test('repeated pilot switching releases geometry and texture resources @eight-islands-resources',async({page})=>{
  test.setTimeout(180000);mkdirSync(dir,{recursive:true});
  const samples:Record<string,unknown>={};
  await page.goto('/?preview=circe&quality=low');
  // The first visit uploads each NPC's shared motif texture (silhouette.ts cache).
  // Compare two complete warm cycles, retaining the cold samples as evidence.
  for(const [key,act] of [['circe1',3],['cyclops1',2],['circe2',3],['cyclops2',2],['circe3',3],['cyclops3',2]] as const){
    await page.evaluate(i=>window.__nostos!.gotoAct(i),act);
    await page.waitForFunction(()=>window.__nostos!.state().phase==='roaming');await frames(page);
    const s=await page.evaluate(()=>window.__nostos!.state());
    samples[key]={geometries:s.renderStats.geometries,textures:s.renderStats.textures};
  }
  writeFileSync(dir+'resources.json',JSON.stringify(samples,null,2));
  expect(samples.circe3).toEqual(samples.circe2);expect(samples.cyclops3).toEqual(samples.cyclops2);
});
