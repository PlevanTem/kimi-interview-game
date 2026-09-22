import {chromium} from 'playwright';
import {writeFileSync} from 'node:fs';
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:844,height:390},hasTouch:true,deviceScaleFactor:1});
const report={scope:'Desktop short baseline: all eight islands, 15 seconds each with slowly rotating view. Not physical-phone acceptance or a 15-minute thermal test.',capturedAt:new Date().toISOString(),runs:[]};
try{
 await page.goto('http://127.0.0.1:4188/?quality=low');await page.waitForFunction(()=>window.__nostos);
 for(let act=0;act<8;act++){
  const start=Date.now();await page.evaluate(a=>window.__nostos.gotoAct(a),act);await page.waitForFunction(()=>window.__nostos.state().phase==='roaming',null,{timeout:120000});
  const transitionWallMs=Date.now()-start;
  const sample=await page.evaluate(async()=>{
   const state=window.__nostos.state(),pose=state.player,canvas=document.querySelector('#nostos-canvas'),gl=canvas.getContext('webgl2'),ext=gl.getExtension('WEBGL_debug_renderer_info');
   const renderer=ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);
   let last=performance.now(),start=last;const raw=[];
   await new Promise(resolve=>{function tick(now){window.__nostos.view({...pose,yaw:pose.yaw+(now-start)*.00008});const s=window.__nostos.state();raw.push({ms:now-last,...s.renderStats,scale:s.quality.resolutionScale});last=now;if(now-start>=15000)resolve();else requestAnimationFrame(tick);}requestAnimationFrame(tick);});
   return{id:state.actId,renderer,userAgent:navigator.userAgent,raw};
  });
  const times=sample.raw.slice(1).map(r=>r.ms).sort((a,b)=>a-b);let run=0,maxSlowRunMs=0;for(const r of sample.raw){run=r.ms>1000/24?run+r.ms:0;maxSlowRunMs=Math.max(run,maxSlowRunMs);}
  report.runs.push({...sample,transitionWallMs,transitionNote:'Includes authored arrival and control latency, outside frame sample',medianFps:1000/times[Math.floor(times.length*.5)],p95Ms:times[Math.floor(times.length*.95)],maxSlowRunMs,maxCalls:Math.max(...sample.raw.map(r=>r.calls))});
  console.log(JSON.stringify({...report.runs.at(-1),raw:undefined}));
 }
 await page.goto('http://127.0.0.1:4188/docs/EIGHT_ISLANDS_REVIEW.html');const imgs=page.locator('img');for(let i=0;i<await imgs.count();i++)await imgs.nth(i).scrollIntoViewIfNeeded();
 await page.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth>0));report.review={sections:await page.locator('section.island').count(),images:await imgs.count(),loaded:true};
}finally{await browser.close();writeFileSync(new URL('./performance.json',import.meta.url),JSON.stringify(report,null,2));}
