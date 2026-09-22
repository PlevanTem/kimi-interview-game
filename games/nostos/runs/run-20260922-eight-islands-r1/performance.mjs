import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

// Short, reproducible desktop baseline. This cannot certify physical phones.
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--no-sandbox']});
const report={scope:'Desktop Edge, 15 seconds per pilot per revision, rotating camera; NOT physical-phone acceptance',runs:[]};
try {
  for(const [revision,url] of [['before','https://plevantem.github.io/kimi-interview-game/'],['after','http://127.0.0.1:4188/']]) {
    const page=await browser.newPage({viewport:{width:844,height:390},hasTouch:true,deviceScaleFactor:1});
    await page.goto(url+'?quality=low');await page.waitForFunction(()=>window.__nostos);
    for(const [act,id,x,z] of [[3,'circe',2,3],[2,'cyclops',0,-12]]) {
      const start=Date.now();await page.evaluate(a=>window.__nostos.gotoAct(a),act);
      await page.waitForFunction(()=>window.__nostos.state().phase==='roaming',null,{timeout:120000});
      const transitionWallMs=Date.now()-start;
      const sample=await page.evaluate(async ({x,z})=>{
        const canvas=document.querySelector('#nostos-canvas');
        const gl=canvas.getContext('webgl2');const ext=gl.getExtension('WEBGL_debug_renderer_info');
        const renderer=ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);
        const raw=[];const start=performance.now();let prev=start;
        await new Promise(resolve=>{function tick(now){
          window.__nostos.view({x,z,yaw:(now-start)*.00015,pitch:0});
          const state=window.__nostos.state();raw.push({ms:now-prev,...state.renderStats,scale:state.quality?.resolutionScale});prev=now;
          if(now-start>=15000)resolve();else requestAnimationFrame(tick);
        }requestAnimationFrame(tick);});
        return {renderer,userAgent:navigator.userAgent,raw};
      },{x,z});
      const times=sample.raw.slice(1).map(r=>r.ms).sort((a,b)=>a-b);
      report.runs.push({revision,id,transitionWallMs,note:'Transition wall time includes authored fade and browser-control latency; kept outside frame sample',renderer:sample.renderer,userAgent:sample.userAgent,frames:times.length,medianFps:1000/times[Math.floor(times.length*.5)],p95FrameMs:times[Math.floor(times.length*.95)],maxCalls:Math.max(...sample.raw.map(r=>r.calls)),raw:sample.raw});
      console.log(JSON.stringify({...report.runs.at(-1),raw:undefined}));
    }
    await page.close();
  }
  const page=await browser.newPage();await page.goto('http://127.0.0.1:4188/docs/EIGHT_ISLANDS_REVIEW.html');
  const images=page.locator('img');for(let i=0;i<await images.count();i++)await images.nth(i).scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth>0));
  report.review={title:await page.title(),images:await images.count(),sections:await page.locator('section.island').count(),valid:true};
} finally {await browser.close();writeFileSync(new URL('./performance.json',import.meta.url),JSON.stringify(report,null,2));}
