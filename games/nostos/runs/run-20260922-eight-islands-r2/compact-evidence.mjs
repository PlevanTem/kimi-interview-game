import {readFileSync,writeFileSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
// Keep all raw timing samples, but make the human-readable PR evidence concise.
for(const run of ['run-20260922-eight-islands-r1','run-20260922-eight-islands-r2']){
 const path=new URL(`../${run}/performance.json`,import.meta.url),report=JSON.parse(readFileSync(path,'utf8'));
 if(!report.runs.some(r=>r.raw))continue;
 const raw=JSON.stringify(report.runs.map(({id,revision,raw})=>({id,revision,raw})));
 const zipped=gzipSync(raw);if(gunzipSync(zipped).toString()!==raw)throw new Error('Trace round-trip mismatch');
 writeFileSync(new URL(`../${run}/performance-traces.json.gz`,import.meta.url),zipped);
 report.runs=report.runs.map(({raw,...summary},i)=>({...summary,rawTrace:{file:'performance-traces.json.gz',entry:i,samples:raw.length}}));
 writeFileSync(path,JSON.stringify(report,null,2)+'\n');
 console.log(run+': raw samples preserved losslessly; '+Buffer.byteLength(raw)+' -> '+zipped.length+' bytes');
}
