import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const commands=['npm run validate:library','npm run validate:context','npm run audit:assets','npm run typecheck:nostos','npm run test:nostos -- --maxWorkers=1','npm run build:nostos','npm run assets:nostos'];
const dir=new URL('./logs/',import.meta.url);mkdirSync(dir,{recursive:true});const checks=[];
for(let i=0;i<commands.length;i++){
 const command=commands[i],result=spawnSync(command,{shell:true,encoding:'utf8',maxBuffer:8*1024*1024});
 writeFileSync(new URL(`${i}.log`,dir),result.stdout+result.stderr);
 checks.push({command,exitCode:result.status,log:`logs/${i}.log`});console.log(command+' => '+result.status);
 writeFileSync(new URL('./checks.json',import.meta.url),JSON.stringify(checks,null,2));
 if(result.status!==0){console.log((result.stdout+result.stderr).slice(-5000));process.exit(1);}
}
const html=new URL('../../docs/asset-library.html',import.meta.url);writeFileSync(html,readFileSync(html,'utf8').replace(/\r/g,''));
