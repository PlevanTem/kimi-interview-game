import {mkdirSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {test,expect} from '@playwright/test';
import type {} from '../../src/probe';

// Profile the available native renderer, without forcing the regression suite's SwiftShader flag.
test.use({launchOptions:{args:['--no-sandbox']}});
test('Calypso 60-second native-renderer path @calypso-perf',async({page})=>{
  test.setTimeout(240000);
  await page.setViewportSize({width:1280,height:720});await page.goto('/?preview=calypso');
  await page.waitForFunction(()=>window.__nostos?.state().phase==='roaming');
  const result=await page.evaluate(async()=>{
    const gl=document.querySelector('canvas')!.getContext('webgl2')!;
    const ext=gl.getExtension('WEBGL_debug_renderer_info');
    const renderer=ext?String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)):'unavailable';
    const durations:number[]=[],samples:ReturnType<NonNullable<typeof window.__nostos>['state']>[]=[];
    const points=[[4,33],[0,4],[-5,-6.5],[0,4],[21,14],[4,33]];
    const start=performance.now();let previous=start,lastSample=-1;
    await new Promise<void>((resolve,reject)=>{
      const tick=(now:number)=>{
        try {
        // rAF's frame timestamp can precede performance.now() sampled during the same frame.
        const t=Math.max(0,(now-start)/1000);durations.push(now-previous);previous=now;
        const phase=t/12,i=Math.min(points.length-2,Math.floor(phase)),f=Math.min(1,phase-i),a=points[i]!,b=points[i+1]!;
        window.__nostos!.view({x:a[0]!+(b[0]!-a[0]!)*f,z:a[1]!+(b[1]!-a[1]!)*f,yaw:.25,pitch:-.04});
        if(Math.floor(t)>lastSample){samples.push(window.__nostos!.state());lastSample=Math.floor(t);}
        if(t>=60)resolve();else requestAnimationFrame(tick);
        } catch(error) { reject(error); }
      };requestAnimationFrame(tick);
    });
    const sorted=durations.filter(n=>n>0).sort((a,b)=>a-b),medianMs=sorted[Math.floor(sorted.length/2)]!;
    const medianFps=1000/medianMs;
    return{renderer,seconds:(performance.now()-start)/1000,frames:durations.length,medianMs,medianFps,p95Ms:sorted[Math.floor(sorted.length*.95)],maxCalls:Math.max(...samples.map(s=>s.renderStats.calls)),geometryRange:[Math.min(...samples.map(s=>s.renderStats.geometries)),Math.max(...samples.map(s=>s.renderStats.geometries))],textureRange:[Math.min(...samples.map(s=>s.renderStats.textures)),Math.max(...samples.map(s=>s.renderStats.textures))],median55fpsMet:medianFps>=55,samples};
  });
  const dir=fileURLToPath(new URL('../../runs/run-20260909-calypso-build-r1/after/',import.meta.url));mkdirSync(dir,{recursive:true});
  writeFileSync(dir+'performance.json',JSON.stringify(result,null,2));
  console.log(JSON.stringify({...result,samples:undefined}));
  expect(result.maxCalls).toBeLessThan(250);
  expect(result.maxCalls).toBeGreaterThan(4); // scene plus all post passes, not the old last-pass-only counter
  expect(result.geometryRange[1]).toBe(result.geometryRange[0]);expect(result.textureRange[1]).toBe(result.textureRange[0]);
  // Keep low FPS visible in the report; functional completion is not Gate 4 performance approval.
});
