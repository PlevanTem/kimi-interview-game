import { json, fail, finish } from './lib/project.mjs';
const errors=[]; const evaluation=await json('game-context/evaluations/current.json');
if(evaluation.status!=='complete'){ console.log('QUALITY NOT EVALUATED: 尚无完整构建与证据。'); process.exitCode=1; }
else { const scores=Object.values(evaluation.categoryScores); if(scores.some(v=>typeof v!=='number'||v<75)) fail(errors,'任一质量类别必须至少 75'); if(evaluation.weightedTotal<85) fail(errors,'总分必须至少 85'); if(evaluation.defects.some(d=>['P0','P1'].includes(d.severity)&&d.status!=='closed')) fail(errors,'存在未关闭 P0/P1'); if(!evaluation.evidence.length) fail(errors,'质量报告必须附证据'); finish(errors,'quality-report'); }
