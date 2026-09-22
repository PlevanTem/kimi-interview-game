import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const baseline=process.argv.includes('--baseline');
const url=baseline?'https://plevantem.github.io/kimi-interview-game/':'http://127.0.0.1:4188/';
const dir=fileURLToPath(new URL(baseline?'./before/':'./after/',import.meta.url));mkdirSync(dir,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const states=[];
try{
await page.goto(url+'?quality=high');await page.waitForFunction(()=>window.__nostos);
for(const [index,id,views] of [[3,'circe',[{name:'arrival',x:0,z:21,yaw:0,pitch:.02},{name:'middle',x:2,z:3,yaw:.28,pitch:.08},{name:'detail',x:-6,z:-6,yaw:.68,pitch:-.02}]],[2,'cyclops',[{name:'arrival',x:6,z:30,yaw:.13,pitch:.02},{name:'middle',x:0,z:-12,yaw:0,pitch:.05},{name:'detail',x:1,z:-23,yaw:.25,pitch:-.1}]]]){
 await page.evaluate(i=>window.__nostos.gotoAct(i),index);
 await page.waitForFunction(()=>window.__nostos.state().phase==='roaming',null,{timeout:120000});
 for(const pose of views){await page.evaluate(p=>window.__nostos.view(p),pose);const frame=await page.evaluate(()=>window.__nostos.state().frames);await page.waitForFunction(n=>window.__nostos.state().frames>n+3,frame);await page.screenshot({path:dir+id+'-'+pose.name+'.jpg',type:'jpeg',quality:90});states.push({view:id+'-'+pose.name,...await page.evaluate(()=>window.__nostos.state())});}
}
writeFileSync(dir+'capture.json',JSON.stringify({url,viewport:[1280,720],states,errors},null,2));console.log(JSON.stringify({mode:baseline?'before':'after',frames:states.length,errors}));if(errors.length)process.exitCode=1;
}finally{await browser.close();}
