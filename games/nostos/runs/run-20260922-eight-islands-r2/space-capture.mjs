import {chromium} from 'playwright';
import {writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const dir=fileURLToPath(new URL('./after/',import.meta.url));
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1280,height:720}}),states=[];
try{
 await page.goto('http://127.0.0.1:4188/?quality=high');await page.waitForFunction(()=>window.__nostos);
 for(const [act,id,x,z,yaw,pitch] of [[0,'prologue',-12,-1,.55,-.05],[1,'lotus',20,-18,0,-.5],[4,'nekyia',-1,-21,.65,-.55],[5,'sirens',-8,21,1.55,-.25],[6,'calypso',13,-15,-.6,-.08],[7,'ithaca',0,-19,-1.45,-.06]]){
  await page.evaluate(a=>window.__nostos.gotoAct(a),act);await page.waitForFunction(()=>window.__nostos.state().phase==='roaming');
  await page.evaluate(p=>window.__nostos.view(p),{x,z,yaw,pitch});await page.waitForTimeout(500);
  await page.screenshot({path:dir+id+'-space.jpg',type:'jpeg',quality:90});states.push({id,pose:{x,z,yaw,pitch},...await page.evaluate(()=>window.__nostos.state())});
 }
 writeFileSync(dir+'spaces.json',JSON.stringify({note:'Supplemental first-person views of new spatial details; not baseline comparison',states},null,2));
}finally{await browser.close();}
