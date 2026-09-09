import {mkdirSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {test,expect} from '@playwright/test';
import {CALYPSO_VIEWS} from '../../src/world/calypso-layout';
import {ART_REVISION} from '../../src/content/revision';
import {NARRATIVE_ASSETS} from '../../src/world/narrative-assets';
import type {} from '../../src/probe';

// Local Windows review uses available graphics acceleration, not forced CI software rendering.
test.use({launchOptions:{args:['--no-sandbox']}});

test('Calypso R1 first-person, five clues, NPC, memory and pause @calypso-r1',async({page})=>{
  test.setTimeout(480000);
  const dir=fileURLToPath(new URL('../../runs/run-20260909-calypso-build-r1/after/',import.meta.url));mkdirSync(dir,{recursive:true});
  const errors:string[]=[],states:unknown[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:1280,height:720});
  await page.goto('/?preview=calypso');
  await page.waitForFunction(()=>window.__nostos?.state().phase==='roaming');
  const frames=async()=>{const n=await page.evaluate(()=>window.__nostos!.state().frames);await page.waitForFunction(n=>window.__nostos!.state().frames>n+4,n);};
  const shot=async(name:string)=>{await frames();await page.screenshot({path:dir+name+'.jpg',type:'jpeg',quality:92});};
  for(const pose of [...CALYPSO_VIEWS,{name:'four-rills',x:-10,z:10,yaw:.3,pitch:-.29},{name:'domestic',x:-11,z:-9,yaw:.12,pitch:-.12},{name:'stumps',x:15,z:1,yaw:.05,pitch:-.15}]){
    await page.evaluate(p=>window.__nostos!.view(p),pose);await shot(pose.name);states.push(await page.evaluate(()=>window.__nostos!.state()));
  }
  // Real key input advances across the shallow ford; not just probe teleportation.
  await page.evaluate(()=>window.__nostos!.view({x:0,z:12,yaw:0,pitch:-.1}));
  await page.keyboard.down('w');await page.waitForTimeout(2500);await page.keyboard.up('w');
  expect((await page.evaluate(()=>window.__nostos!.state())).player.z).toBeLessThan(10);
  for(const id of ['calypso.hollow','calypso.spring','calypso.stumps','calypso.loom','calypso.robe','calypso.host']){
    await page.evaluate(()=>window.__nostos!.view({x:0,z:4,yaw:0,pitch:0}));
    expect(await page.evaluate(id=>window.__nostos!.teleport(id),id)).toBe(true);
    await page.waitForFunction(id=>window.__nostos!.state().focus===id,id);
    await page.keyboard.press('e');await frames();expect((await page.evaluate(()=>window.__nostos!.state())).narrating).toBe(true);
    if(id==='calypso.host')await shot('dialogue');
    await page.evaluate(()=>window.__nostos!.skipNarration());await frames();
  }
  await page.keyboard.press('Escape');await expect(page.locator('.pausepanel')).toBeVisible();
  await expect(page.locator('.review-build')).toHaveAttribute('data-revision',ART_REVISION);
  await shot('esc-revision');await page.keyboard.press('Escape');
  await page.evaluate(()=>window.__nostos!.teleport('calypso.axe'));
  await page.waitForFunction(()=>window.__nostos!.state().focus==='calypso.axe');await page.keyboard.press('e');
  await page.evaluate(()=>window.__nostos!.skipNarration());await page.waitForFunction(()=>window.__nostos!.state().visionTime>3);
  await shot('memory-wide');await page.keyboard.press('Escape');
  const time=await page.evaluate(()=>window.__nostos!.state().visionTime);await page.waitForTimeout(500);expect(await page.evaluate(()=>window.__nostos!.state().visionTime)).toBe(time);
  await page.keyboard.press('Escape');await page.keyboard.press('Space');await page.waitForFunction(()=>window.__nostos!.state().phase==='roaming');
  await page.evaluate(()=>window.__nostos!.teleport('calypso.depart'));await page.waitForFunction(()=>window.__nostos!.state().focus==='calypso.depart');
  await page.keyboard.press('e');await page.waitForFunction(()=>window.__nostos!.state().actId==='ithaca'&&window.__nostos!.state().phase==='roaming');
  await shot('ithaca-regression');
  expect(errors).toEqual([]);
  writeFileSync(dir+'browser.json',JSON.stringify({revision:ART_REVISION,viewport:[1280,720],states,errors,checks:['five clues','named NPC','keyboard traversal','memory aperture sample','pause frozen','departure unlocked']},null,2));
});

test('Calypso R1 workbench and 1080p review @calypso-review',async({page})=>{
  test.setTimeout(360000);
  const dir=fileURLToPath(new URL('../../runs/run-20260909-calypso-build-r1/after/',import.meta.url));mkdirSync(dir,{recursive:true});
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/docs/asset-library.html',{waitUntil:'domcontentloaded'});
  await expect(page.locator('html')).toHaveAttribute('data-revision',ART_REVISION);
  await expect(page.locator('#act12-hero-assets canvas')).toHaveCount(Object.keys(NARRATIVE_ASSETS).length);
  await page.locator('[data-asset-id="game.nostos.character.calypso"]').screenshot({path:dir+'workbench-character.jpg',type:'jpeg',quality:92});
  await page.locator('#act12-hero-assets').screenshot({path:dir+'workbench-assets.jpg',type:'jpeg',quality:90});
  // Finish arrival at the normal test viewport before paying the software-rendered 1080p cost.
  await page.setViewportSize({width:1280,height:720});await page.goto('/?preview=calypso');await page.waitForFunction(()=>window.__nostos?.state().phase==='roaming');
  await page.evaluate(p=>window.__nostos!.view(p),CALYPSO_VIEWS[1]);await page.setViewportSize({width:1920,height:1080});
  const resizedFrame=await page.evaluate(()=>window.__nostos!.state().frames);
  await page.waitForFunction(n=>window.__nostos!.state().frames>n+2,resizedFrame);
  await page.screenshot({path:dir+'clearing-1080.jpg',type:'jpeg',quality:90});
  const state=await page.evaluate(()=>window.__nostos!.state());expect(state.vertexCount).toBeLessThan(300000);expect(state.renderStats.calls).toBeLessThan(250);
  expect(errors).toEqual([]);writeFileSync(dir+'workbench.json',JSON.stringify({revision:ART_REVISION,cards:Object.keys(NARRATIVE_ASSETS).length,state,errors},null,2));
});
