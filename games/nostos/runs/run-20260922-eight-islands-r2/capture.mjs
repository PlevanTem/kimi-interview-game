import {chromium} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const before=process.argv.includes('--before');
const url=before?'https://plevantem.github.io/kimi-interview-game/':'http://127.0.0.1:4188/';
const dir=fileURLToPath(new URL(before?'./before/':'./after/',import.meta.url));mkdirSync(dir,{recursive:true});
const shots=[
 ['prologue',0,[[-3.8,9.8,.3,-.04],[0,4,0,-.04],[2,-3,0,-.4]]],
 ['lotus',1,[[0,30,0,-.04],[-4,8,-.38,-.04],[-6,-15,0,-.3]]],
 ['cyclops',2,[[6,30,.13,.02],[0,-12,0,.05],[1,-23,.25,-.1]]],
 ['circe',3,[[0,21,0,.02],[2,3,.28,.08],[-6,-6,.68,-.02]]],
 ['nekyia',4,[[0,26,0,-.04],[0,8,.2,-.04],[0,-7,0,-.3]]],
 ['sirens',5,[[0,32,0,-.04],[0,8,0,-.04],[0,-15,0,-.2]]],
 ['calypso',6,[[0,26,0,-.04],[0,8,.35,-.04],[-10,-8,.1,-.15]]],
 ['ithaca',7,[[0,26,0,-.04],[0,5,0,-.04],[0,-11,0,-.08]]],
];
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});
const errors=[],states=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try {
 await page.goto(url+'?quality=high');await page.waitForFunction(()=>window.__nostos);
 for(const [id,index,views] of shots){
  await page.evaluate(i=>window.__nostos.gotoAct(i),index);await page.waitForFunction(()=>window.__nostos.state().phase==='roaming',null,{timeout:120000});
  // Let the authored arrival title clear, so evidence shows the scene itself.
  await page.waitForTimeout(1800);
  for(let j=0;j<views.length;j++){
   const [x,z,yaw,pitch]=views[j],name=['arrival','middle','detail'][j];
   await page.evaluate(p=>window.__nostos.view(p),{x,z,yaw,pitch});
   const f=await page.evaluate(()=>window.__nostos.state().frames);await page.waitForFunction(n=>window.__nostos.state().frames>n+5,f);
   await page.screenshot({path:dir+id+'-'+name+'.jpg',type:'jpeg',quality:90});states.push({view:id+'-'+name,pose:{x,z,yaw,pitch},...await page.evaluate(()=>window.__nostos.state())});
  }
  console.log(id+' captured');
 }
 writeFileSync(dir+'capture.json',JSON.stringify({url,viewport:[1280,720],states,errors},null,2));
 if(errors.length)throw new Error(JSON.stringify(errors));
}finally{await browser.close();}
