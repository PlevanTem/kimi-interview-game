import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
const base='0b89ed08d81ffd610a82883293618fd70dbfc9ad',results=[];
for(const id of ['prologue','lotus','cyclops','circe','nekyia','sirens','calypso','ithaca']){
 const path=`games/nostos/src/game/scenes/${id}.ts`;
 const before=execFileSync('git',['show',`${base}:${path}`],{encoding:'utf8'}).replace(/\r/g,''),after=readFileSync(path,'utf8').replace(/\r/g,'');
 const def=s=>s.slice(s.indexOf('  def: {'),s.indexOf('\n  terrain:')).trim();
 const unchanged=def(before)===def(after);results.push({id,definitionUnchanged:unchanged});
}
const script='games/nostos/src/content/script.ts';
const proseUnchanged=execFileSync('git',['show',`${base}:${script}`],{encoding:'utf8'}).replace(/\r/g,'')===readFileSync(script,'utf8').replace(/\r/g,'');
const passed=proseUnchanged&&results.every(r=>r.definitionUnchanged);
writeFileSync(new URL('./story-contract.json',import.meta.url),JSON.stringify({base,proseUnchanged,results,passed,note:'Exact scene def comparison covers IDs, coordinates, NPC references, arrival and memory timelines; content script also identical.'},null,2));
console.log(JSON.stringify({passed,proseUnchanged,results}));if(!passed)process.exitCode=1;
