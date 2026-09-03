import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const origin = process.argv[2] || 'http://localhost:5184/';
const port = Number(process.argv[3] || 9224);
const evidence = resolve('runs/run-20260903-opus51-mechanic-r1/evidence');
await mkdir(evidence, { recursive: true });

const pages = await fetch(`http://127.0.0.1:${port}/json/list`).then(r => r.json());
const page = pages.find(p => p.type === 'page' && p.url.startsWith(origin)) || pages.find(p => p.type === 'page');
if (!page) throw new Error('No debuggable Edge page');

const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((ok, fail) => { ws.addEventListener('open', ok, { once: true }); ws.addEventListener('error', fail, { once: true }); });
let serial = 0;
const pending = new Map();
const browserErrors = [];
ws.addEventListener('message', event => {
  const message = JSON.parse(event.data);
  if (message.id) {
    const slot = pending.get(message.id);
    if (!slot) return;
    pending.delete(message.id);
    message.error ? slot.reject(new Error(message.error.message)) : slot.resolve(message.result);
    return;
  }
  if (message.method === 'Runtime.exceptionThrown') browserErrors.push(message.params.exceptionDetails.text);
  if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') browserErrors.push(message.params.entry.text);
});
function send(method, params = {}) {
  const id = ++serial;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}
async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
}
const wait = ms => new Promise(r => setTimeout(r, ms));
async function shot(name) {
  const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  await writeFile(resolve(evidence, name + '.png'), Buffer.from(data, 'base64'));
}
async function drag(designPoints) {
  const v = await evaluate('(()=>{const r=game.getBoundingClientRect(),s=Math.min(r.width/1280,r.height/720);return{s,ox:r.left+(r.width-1280*s)/2,oy:r.top+(r.height-720*s)/2}})()');
  const points = designPoints.map(p => ({ x: v.ox + p.x * v.s, y: v.oy + p.y * v.s }));
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...points[0] });
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...points[0], button: 'left', buttons: 1, clickCount: 1 });
  for (const p of points.slice(1)) await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...p, button: 'left', buttons: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...points.at(-1), button: 'left', buttons: 0, clickCount: 1 });
}

await send('Runtime.enable');
await send('Log.enable');
await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: origin });
await wait(700);

const report = {
  title: await evaluate('document.title'),
  api: await evaluate('typeof window.lightlineV2'),
  canvas: await evaluate('({css:[game.clientWidth,game.clientHeight],pixels:[game.width,game.height]})'),
  checkpoints: [],
  browserErrors,
};
report.checkpoints.push(await evaluate('lightlineV2.getState()'));
await shot('01-title-cdp');

// Product shell: help, settings, pause and return behavior.
await evaluate(`document.querySelector('[data-open="how"]').click()`);
report.helpVisible = await evaluate(`document.getElementById('how').classList.contains('on')`);
await evaluate(`document.querySelector('#how [data-close]').click()`);
await evaluate(`document.querySelector('[data-open="settings"]').click()`);
await evaluate(`document.getElementById('motionSwitch').click(); document.getElementById('captionSwitch').click()`);
report.settings = await evaluate('lightlineV2.getState().settings');
await evaluate(`document.querySelector('#settings [data-close]').click()`);

await evaluate('document.getElementById("newButton").click(); lightlineV2.skipIntro()');
await wait(250);
report.checkpoints.push(await evaluate('lightlineV2.getState()'));
await shot('02-room-1');
await evaluate('document.getElementById("pauseButton").click()');
report.pauseVisible = await evaluate('lightlineV2.getState().screen');
await evaluate('document.getElementById("resumeButton").click()');

// Deliberate wrong direct route verifies legible failure and recovery.
await drag([{x:150,y:500},{x:1100,y:450}]);
await wait(150);
report.failure = await evaluate('({screen:lightlineV2.getState().screen,reason:document.getElementById("failReason").textContent})');
report.directAccepted = report.failure.screen !== 'fail';
await shot('03-readable-failure');
await evaluate('document.getElementById("retryButton").click()');

// First room is completed through actual browser pointer events.
await drag([{x:150,y:500},{x:520,y:350},{x:1100,y:450}]);
await wait(1120);
report.pointerRoom0 = await evaluate('lightlineV2.getState()');
if (report.pointerRoom0.run.room !== 1) throw new Error('Real pointer route did not complete room 0');
report.checkpoints.push(report.pointerRoom0);

let guard = 0;
while (!(await evaluate('lightlineV2.getState().run.complete')) && guard++ < 10) {
  const before = await evaluate('lightlineV2.getState()');
  const diagnostic = await evaluate('(()=>{const s=lightlineV2.getState(),p=lightlineV2.canonical(s.run.room,s.run.phase,"short");return{screen:s.screen,points:p,analysis:LL.puzzleV2.analyzeStroke(s.run.room,s.run.phase,p)}})()');
  const accepted = await evaluate('lightlineV2.solveCurrent("short")');
  if (!accepted) throw new Error(`Canonical solution rejected at ${before.room}/${before.phase}: ${JSON.stringify(diagnostic)}`);
  if (before.run.room === 2 || (before.run.room === 4 && before.run.phase === 1)) {
    await wait(430);
    await shot(before.run.room === 2 ? '04b-prism-action' : '05b-city-heart-action');
    await wait(690);
  } else await wait(1120);
  const after = await evaluate('lightlineV2.getState()');
  report.checkpoints.push(after);
  if (after.run.room === 2 && after.run.phase === 0) await shot('04-prism-court');
  if (after.screen === 'play' && after.run.room === 4 && after.run.phase === 1) await shot('05-city-heart-choice');
}
await wait(200);
report.final = await evaluate('lightlineV2.getState()');
report.endingVisible = await evaluate('document.getElementById("ending").classList.contains("on")');
report.metrics = await evaluate('lightlineV2.metrics()');
await shot('06-ending');
report.passed = report.api === 'object' && report.helpVisible && report.pauseVisible === 'pause' &&
  report.directAccepted === false && report.failure.screen === 'fail' && report.final.run.complete &&
  report.endingVisible && browserErrors.length === 0;

await writeFile(resolve(evidence, 'browser-smoke.json'), JSON.stringify(report, null, 2));
ws.close();
console.log(JSON.stringify(report, null, 2));
if (!report.passed) process.exitCode = 1;
