import {readFileSync,writeFileSync} from 'node:fs';
const here=new URL('./',import.meta.url),game=new URL('../../',import.meta.url);
const read=p=>JSON.parse(readFileSync(new URL(p,here),'utf8'));
const write=(p,v)=>writeFileSync(new URL(p,here),JSON.stringify(v,null,2)+'\n');
const checks=read('checks.json'),before=read('before/capture.json'),after=read('after/capture.json'),perf=read('performance.json'),resources=read('after/resources.json');
const story=read('story-contract.json');if(!story.passed)throw new Error('Story contract changed');
if(checks.length!==7||checks.some(c=>c.exitCode!==0))throw new Error('Required checks incomplete');
if(Number(readFileSync(new URL('logs/browser-exit.txt',here),'utf8').trim())!==0)throw new Error('Browser run did not pass');
if(before.states.length!==24||after.states.length!==24||after.errors.length||before.errors.length)throw new Error('Missing capture evidence');
if(after.states.some((s,i)=>JSON.stringify(s.pose)!==JSON.stringify(before.states[i].pose)||s.vertexCount>=300000||s.renderStats.calls>250))throw new Error('Camera comparison or scene budget mismatch');
if(perf.runs.length!==8||!perf.review.loaded||perf.review.images!==54)throw new Error('Missing performance or review evidence');
for(let i=0;i<8;i++)if(JSON.stringify(resources[`1:${i}`])!==JSON.stringify(resources[`2:${i}`]))throw new Error('Warm resources grow');
const runId='run-20260922-eight-islands-r2',time=new Date().toISOString();
const mutations=[
 ['orphan-distance','复合资产原点被旧测试误当成模型中心','dressing.test.ts 原点半径法导致sirens.wrecks误报11.1m','真实世界变换后的三角面XZ距离，退化面按边段求距','10项dressing检查及真实船肋顶点距锚点<2m','错误的11.1m判定','3m要求保持，全部剧情实物检查通过'],
 ['threshold-height','新开放家宅入口经过46cm高的旧实体门槛','独立三点射线约5.06m，地形4.6m','薄石槛8cm，取消叠石，并补35cm厚山墙','domestic-environments.test.ts 实际场景射线','约46cm穿入实体风险','门槛表面相对地形4–12cm，门洞与室内净空通过'],
 ['mooring-contact','系泊绳末端悬空','独立审查0.244/0.287/0.291m至木表面，绳半径0.06m','端点直接复用实际船肋/系泊石表面顶点','coastal-environments.test.ts 六个端点三角面距离','至少约18cm净空隙','六个端点距目标表面<0.001m'],
 ['rock-continuity','首轮岩体叠板、洞内悬浮白石','首轮实机截图和几何检查','连续封闭不规则岩楔；贴旧岩壳的落地暗石肋','岩壳拓扑测试与after/sirens-arrival.jpg、after/calypso-detail.jpg','独立叠板/悬浮三石','连续承重及洞壳关系，实机复拍'],
 ['orchard-drain','浅渠初稿只是平直暗色标记','L03对照实现缺少下降和出口证明','依实际地形37点建立槽底、低岸与扩口','domestic-environments.test.ts 地高/出口/贴合','无可验证排水方向','37点严格下坡，总落差>1.5m，见after/lotus-space.jpg'],
];
write('iterations.json',mutations.map(([id,issue,evidence,change,verification,before,after])=>({id,issue,evidence:[evidence],rootCause:id==='orphan-distance'?'Test ignored geometry internal coordinates':id==='threshold-height'?'Inherited prop height mismatched newly walkable interior floor':id==='mooring-contact'?'Independent endpoint approximation':id==='rock-continuity'?'Disconnected simplified geometric primitives':'Decorative marks had no sampled flow path',change,verification,before,after,status:'verified',commit:null})));
write('verification.json',{
 runId,recordedAt:time,status:'功能与视觉候选完成，移动端性能未验收',scope:'Eight-island candidate upgrade: R1 two pilots and R2 remaining six. Spec first, implementation, regression, evidence; GitHub implementation branch delivery follows this local verification.',
 requirements:{spec:'games/nostos/docs/EIGHT_ISLANDS_R2_SPEC.md',itemCount:34,sharedContracts:8,implementationMatrix:'games/nostos/docs/EIGHT_ISLANDS_R2_IMPLEMENTATION.md'},
 storyContract:{command:'node games/nostos/runs/run-20260922-eight-islands-r2/story-contract.mjs',exitCode:0,evidence:'story-contract.json',result:story},
 checks:[...checks,{command:"NOSTOS_E2E_PORT=4189 npm run test:e2e:nostos -- eight-islands-r2.spec.ts mobile-input.spec.ts quality-tiers.spec.ts",exitCode:0,passed:5,log:'logs/browser.log'},{command:'node games/nostos/runs/run-20260922-eight-islands-r2/capture.mjs --before',exitCode:0,frames:24},{command:'node games/nostos/runs/run-20260922-eight-islands-r2/capture.mjs',exitCode:0,frames:24},{command:'node games/nostos/runs/run-20260922-eight-islands-r2/space-capture.mjs',exitCode:0,frames:6},{command:'node games/nostos/runs/run-20260922-eight-islands-r2/performance.mjs',exitCode:0,islands:8,secondsPerIsland:15},{command:'git diff --check',exitCode:0}],
 unitTests:{files:23,passed:181,log:'logs/4.log'},browserCoverage:['all 8 acts touch dialogue and memory','pause/resume/skip/departure','ending and restart','multi-touch cancellation/orientation','low/medium/high rendering and defaults','three cycles of all 8 acts with stable warm geometry/texture counts'],
 accessibility:'All eight scene terrain/collider BFS covers every story interaction. Browser journey uses accelerated positioning, so it is not manual full-route walking evidence.',
 resources,comparison:after.states.map((s,i)=>({view:s.view,beforeVertices:before.states[i].vertexCount,afterVertices:s.vertexCount,beforeCalls:before.states[i].renderStats.calls,afterCalls:s.renderStats.calls})),
 performance:{scope:perf.scope,results:perf.runs.map(({raw,...rest})=>rest),physicalPhonesVerified:false},review:perf.review,
 independentAudit:{role:'quality-auditor',scope:'Source and selected screenshots plus numeric geometry checks',confirmedP2:['mooring-contact','threshold-height'],resolvedBy:'Owned implementation corrections and targeted regression tests; final screenshots reviewed by root',releaseScore:null},
 delivery:{branch:'codex/nostos-eight-islands',repository:'https://github.com/PlevanTem/kimi-interview-game',mainMerge:false,productionDeployment:false},
 limitations:['Human visual acceptance pending; no studio-quality certification','iPhone 13 Safari / Pixel 6 Chrome 15-minute runs not performed','Desktop rotating-view samples are not thermal or mobile acceptance','Geometry/texture counts are renderer allocations, not total OS/GPU memory','No new gameplay, indoor life simulation, or day/night cycle'],humanVisualAcceptance:false,releaseGatePassed:false
});
const run=read('run.json');Object.assign(run,{status:'candidate_verified_ready_for_github',verifiedAt:time,implementedIslands:['prologue','lotus','cyclops','circe','nekyia','sirens','calypso','ithaca'],humanVisualAcceptance:false,physicalPhoneAcceptance:false});write('run.json',run);
const indexPath=new URL('context/index.json',game),index=JSON.parse(readFileSync(indexPath,'utf8'));index.updatedAt=time;index.productionState='eight_islands_candidate_verified_mobile_unaccepted';Object.assign(index.sources,{eightIslandsR2Verification:`games/nostos/runs/${runId}/verification.json`,eightIslandsR2Implementation:'games/nostos/docs/EIGHT_ISLANDS_R2_IMPLEMENTATION.md'});writeFileSync(indexPath,JSON.stringify(index,null,2)+'\n');
const stylePath=new URL('context/style-bible.json',game);writeFileSync(stylePath,readFileSync(stylePath,'utf8').replace('"verification":"in_progress"','"verification":"candidate_checks_passed_physical_phone_unverified"'));
const manifestPath=new URL('manifest.json',game),manifest=JSON.parse(readFileSync(manifestPath,'utf8'));manifest.updatedAt=time;writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');
console.log('R2 evidence finalized without changing human visual or phone acceptance gates.');
