/**
 * studio-v2.js — 《光线之上：共织之城》Gate 2 playable candidate
 * Runtime visuals, animation and sound are generated entirely in code.
 */
(function () {
  'use strict';
  const P = window.LL.puzzleV2;
  const W = 1280, H = 720, SAVE = 'lightline-opus51-v2';
  const $ = (id) => document.getElementById(id);
  const canvas = $('game'), ctx = canvas.getContext('2d', { alpha: false });
  const ui = {
    hud: $('hud'), title: $('title'), pause: $('pause'), fail: $('fail'), ending: $('ending'),
    how: $('how'), settings: $('settings'), credits: $('credits'), intro: $('intro'),
    roomRoman: $('roomRoman'), roomTitle: $('roomTitle'), roomBreath: $('roomBreath'),
    goalText: $('goalText'), phaseText: $('phaseText'), previewText: $('previewText'),
    budgetFill: $('budgetFill'), budgetText: $('budgetText'), toast: $('toast'),
    dialogue: $('dialogue'), dialogueText: $('dialogueText'), failReason: $('failReason'),
  };
  const defaults = { master: .78, music: .5, sfx: .75, reduceMotion: false, contrast: false, captions: true };
  const state = {
    screen: 'title', run: P.makeRun(), draft: [], drawing: false, activeLine: null, hintLine: null,
    solvedLines: {}, resolution: null, resolveStarted: 0, startedAt: 0, elapsedBefore: 0,
    roomEntered: 0, introStarted: 0, introStep: 0, returnOverlay: 'title',
    shake: 0, flash: 0, hintUntil: 0, toastUntil: 0, dialogueUntil: 0,
    settings: { ...defaults }, particles: [], stars: [], rafSamples: [], lastFrame: performance.now(),
  };

  function load() {
    try {
      const data = JSON.parse(localStorage.getItem(SAVE) || 'null');
      if (!data) return;
      state.settings = { ...defaults, ...(data.settings || {}) };
      if (data.run && !data.run.complete && data.run.room >= 0 && data.run.room < P.ROOMS.length) {
        state.savedRun = data.run;
        state.elapsedBefore = Number(data.elapsed || 0);
        $('continueButton').hidden = false;
      }
    } catch (_) {}
  }
  function persist() {
    const elapsed = state.screen === 'title' ? state.elapsedBefore : state.elapsedBefore + Math.max(0, performance.now() - state.startedAt);
    localStorage.setItem(SAVE, JSON.stringify({ run: state.run, elapsed, settings: state.settings }));
  }
  function applySettings() {
    document.body.classList.toggle('reduce-motion', state.settings.reduceMotion);
    document.body.classList.toggle('high-contrast', state.settings.contrast);
    for (const [id, key] of [['masterVolume','master'],['musicVolume','music'],['sfxVolume','sfx']]) {
      $(id).value = state.settings[key]; $(id.replace('Volume','Out')).value = Math.round(state.settings[key] * 100) + '%';
    }
    $('motionSwitch').classList.toggle('on', state.settings.reduceMotion);
    $('contrastSwitch').classList.toggle('on', state.settings.contrast);
    $('captionSwitch').classList.toggle('on', state.settings.captions);
    Audio.setLevels();
  }

  const Audio = {
    ac: null, master: null, music: null, sfx: null, started: false,
    ensure() {
      if (this.started) { this.ac.resume(); return; }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const ac = this.ac = new AC();
      this.master = ac.createGain(); this.music = ac.createGain(); this.sfx = ac.createGain();
      this.music.connect(this.master); this.sfx.connect(this.master); this.master.connect(ac.destination);
      const wash = ac.createBiquadFilter(); wash.type = 'lowpass'; wash.frequency.value = 420;
      wash.connect(this.music);
      [55, 82.5, 110].forEach((f, i) => {
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = i === 1 ? 'triangle' : 'sine'; o.frequency.value = f;
        g.gain.value = [0.045, 0.025, 0.012][i]; o.connect(g); g.connect(wash); o.start();
      });
      this.started = true; this.setLevels();
    },
    setLevels() {
      if (!this.started) return;
      const t = this.ac.currentTime;
      this.master.gain.setTargetAtTime(state.settings.master, t, .05);
      this.music.gain.setTargetAtTime(state.settings.music, t, .05);
      this.sfx.gain.setTargetAtTime(state.settings.sfx, t, .05);
    },
    tone(freq, duration=.18, type='sine', volume=.12, delay=0) {
      if (!this.started || !state.settings.sfx) return;
      const t = this.ac.currentTime + delay, o = this.ac.createOscillator(), g = this.ac.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(freq * 1.045, t + duration);
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(volume, t + .025); g.gain.exponentialRampToValueAtTime(.0001, t + duration);
      o.connect(g); g.connect(this.sfx); o.start(t); o.stop(t + duration + .02);
    },
    trace() { this.tone(390,.12,'sine',.055); },
    reject() { this.tone(128,.34,'sawtooth',.06); },
    accept() { [392,523,659].forEach((f,i)=>this.tone(f,.42,'sine',.08,i*.085)); },
    device(kind, n=0) {
      const f = kind === 'winch' ? 190 : kind === 'pedal' ? 116 : 620 + n*90;
      this.tone(f,.28,kind === 'winch' ? 'triangle':'sine',.09);
    }
  };

  function seeded(n) { return function(){ n = Math.imul(n ^ n >>> 15, n | 1); n ^= n + Math.imul(n ^ n >>> 7, n | 61); return ((n ^ n >>> 14) >>> 0) / 4294967296; }; }
  function initStars() {
    const r = seeded(51073);
    state.stars = Array.from({length:140},()=>({x:r()*W,y:r()*410,z:.25+r()*.75,s:r()*1.8+.3}));
  }
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const lerp=(a,b,t)=>a+(b-a)*t;
  const dist=(a,b)=>Math.hypot(b.x-a.x,b.y-a.y);
  const ease=(t)=>1-Math.pow(1-clamp(t,0,1),3);
  function polyPoint(points, t) {
    if (!points.length) return {x:0,y:0};
    const lengths=[]; let total=0;
    for(let i=1;i<points.length;i++){const d=dist(points[i-1],points[i]);lengths.push(d);total+=d;}
    let at=clamp(t,0,1)*total;
    for(let i=0;i<lengths.length;i++){if(at<=lengths[i]){const q=lengths[i]?at/lengths[i]:0;return{x:lerp(points[i].x,points[i+1].x,q),y:lerp(points[i].y,points[i+1].y,q)};}at-=lengths[i];}
    return points[points.length-1];
  }
  function roundRect(x,y,w,h,r) {
    ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();
  }
  function path(points) { ctx.beginPath(); points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y)); }

  function resize() {
    const dpr=Math.min(devicePixelRatio||1,2), rect=canvas.getBoundingClientRect();
    canvas.width=Math.round(rect.width*dpr);canvas.height=Math.round(rect.height*dpr);
  }
  function viewportTransform() {
    const rect=canvas.getBoundingClientRect(), dpr=canvas.width/rect.width;
    const s=Math.min(rect.width/W,rect.height/H), ox=(rect.width-W*s)/2, oy=(rect.height-H*s)/2;
    ctx.setTransform(dpr*s,0,0,dpr*s,dpr*ox,dpr*oy);
    return {s,ox,oy,rect};
  }
  function pointerPos(e) {
    const r=canvas.getBoundingClientRect(), s=Math.min(r.width/W,r.height/H);
    return {x:clamp((e.clientX-r.left-(r.width-W*s)/2)/s,0,W),y:clamp((e.clientY-r.top-(r.height-H*s)/2)/s,0,H)};
  }

  function drawBackdrop(t, room) {
    const dawn = state.run.complete ? 1 : (state.run.room / 7);
    const g=ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0, dawn>.5?'#173348':'#06101d'); g.addColorStop(.48,dawn>.5?'#30495b':'#10283a'); g.addColorStop(1,'#071018');
    ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    ctx.save();ctx.globalCompositeOperation='screen';
    const aur=ctx.createRadialGradient(820,70,30,820,70,520);
    aur.addColorStop(0,`rgba(95,205,188,${.13+dawn*.15})`);aur.addColorStop(.45,'rgba(72,115,144,.08)');aur.addColorStop(1,'transparent');
    ctx.fillStyle=aur;ctx.fillRect(0,0,W,H);
    ctx.restore();
    ctx.fillStyle='rgba(205,235,229,.7)';
    for(const s of state.stars){const tw=.45+.45*Math.sin(t*.0005+s.x);ctx.globalAlpha=s.z*tw;ctx.fillRect(s.x,s.y,s.s,s.s);}
    ctx.globalAlpha=1;
    // moon and city halo
    ctx.save();ctx.shadowColor='#a6ddd4';ctx.shadowBlur=30;ctx.fillStyle='rgba(205,236,226,.72)';ctx.beginPath();ctx.arc(1040,112,34,0,Math.PI*2);ctx.fill();ctx.restore();
    for(let layer=0;layer<3;layer++){
      const rnd=seeded(room.skyline+layer*999), base=470+layer*46, alpha=.22+layer*.2;
      ctx.fillStyle=`rgba(3,10,17,${alpha})`;ctx.beginPath();ctx.moveTo(0,H);
      for(let x=-30;x<W+50;){const w=36+rnd()*75,h=55+rnd()*(165-layer*28);ctx.lineTo(x,base-h);ctx.lineTo(x+w,base-h);if(rnd()>.72){ctx.lineTo(x+w*.58,base-h-28-rnd()*55);ctx.lineTo(x+w*.35,base-h);}x+=w+4+rnd()*15;}
      ctx.lineTo(W,H);ctx.closePath();ctx.fill();
    }
    const fogY=390+Math.sin(t*.00018)*8;const fog=ctx.createLinearGradient(0,fogY-40,0,fogY+150);fog.addColorStop(0,'transparent');fog.addColorStop(.55,'rgba(97,151,157,.08)');fog.addColorStop(1,'transparent');ctx.fillStyle=fog;ctx.fillRect(0,fogY-40,W,190);
  }

  function drawPlatforms(room) {
    room.platforms.forEach(([x,y,w],i)=>{
      const grad=ctx.createLinearGradient(0,y,0,y+100);grad.addColorStop(0,'#233b43');grad.addColorStop(.12,'#142b34');grad.addColorStop(1,'#061018');
      ctx.fillStyle=grad;roundRect(x,y,w,120,5);ctx.fill();
      ctx.strokeStyle='rgba(164,207,197,.25)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+w,y);ctx.stroke();
      ctx.strokeStyle='rgba(242,198,109,.15)';
      for(let k=24;k<w;k+=54){ctx.beginPath();ctx.moveTo(x+k,y+10);ctx.lineTo(x+k-12,y+68);ctx.stroke();}
      ctx.fillStyle='rgba(156,233,220,.18)';for(let k=18;k<w;k+=88)ctx.fillRect(x+k,y+18,14,3);
    });
  }
  function allDevices(room) {
    const map=new Map();room.phases.forEach(ph=>ph.devices.forEach(d=>map.set(d.id,d)));return [...map.values()];
  }
  function activated(id) {
    const room=state.run.room;
    if(state.screen==='resolve'&&state.resolution){const hit=state.resolution.trace.find(h=>h.id===id);if(hit)return state.resolveProgress >= hit.at/Math.max(1,state.activeLine.length-1);}
    if(state.run.phase>0 && id==='pedal')return true;
    return false;
  }
  function deviceGlow(x,y,color,r=42,a=.25){const g=ctx.createRadialGradient(x,y,0,x,y,r*2.2);g.addColorStop(0,color.replace('1)',a+')'));g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.fillRect(x-r*2.2,y-r*2.2,r*4.4,r*4.4);}
  function drawDevice(d,t) {
    const on=activated(d.id), pulse=.85+.15*Math.sin(t*.004+d.x);
    ctx.save();ctx.translate(d.x,d.y);
    if(d.kind==='winch'){
      if(on)deviceGlow(0,0,'rgba(242,198,109,1)',55,.38);
      ctx.rotate((on?t*.004:0));ctx.lineWidth=6;ctx.strokeStyle=on?'#f2c66d':'#8f744c';ctx.beginPath();ctx.arc(0,0,32,0,Math.PI*2);ctx.stroke();
      for(let a=0;a<Math.PI*2;a+=Math.PI/4){ctx.beginPath();ctx.moveTo(Math.cos(a)*9,Math.sin(a)*9);ctx.lineTo(Math.cos(a)*31,Math.sin(a)*31);ctx.stroke();}
      ctx.fillStyle='#17242a';ctx.beginPath();ctx.arc(0,0,10,0,Math.PI*2);ctx.fill();ctx.strokeStyle='rgba(242,198,109,.5)';ctx.stroke();
    } else if(d.kind==='prism'){
      if(on)deviceGlow(0,0,'rgba(156,233,220,1)',58,.42);
      ctx.shadowColor=on?'#9ce9dc':'transparent';ctx.shadowBlur=on?22:0;ctx.fillStyle=on?'rgba(156,233,220,.55)':'rgba(90,139,145,.28)';
      ctx.strokeStyle=on?'#d5fff6':'#719399';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,-42);ctx.lineTo(31,25);ctx.lineTo(-29,25);ctx.closePath();ctx.fill();ctx.stroke();
      ctx.strokeStyle='rgba(242,198,109,.7)';ctx.beginPath();ctx.moveTo(-21,13);ctx.lineTo(15,-9);ctx.lineTo(5,25);ctx.stroke();
    } else if(d.kind==='pedal'){
      if(on)deviceGlow(0,0,'rgba(242,198,109,1)',50,.4);
      ctx.fillStyle=on?'#caa85c':'#34494b';ctx.beginPath();ctx.ellipse(0,9,45,15,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle=on?'#ffe089':'#789092';ctx.lineWidth=2;ctx.stroke();
      ctx.fillStyle=on?'rgba(255,224,137,.55)':'rgba(10,24,30,.8)';ctx.beginPath();ctx.ellipse(0,4,29,8,0,0,Math.PI*2);ctx.fill();
    } else if(d.kind==='anchor'){
      ctx.strokeStyle=on?'#f2c66d':'#759194';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,19,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(0,-26);ctx.lineTo(0,31);ctx.moveTo(-20,23);ctx.quadraticCurveTo(0,39,20,23);ctx.stroke();
    } else {
      if(on)deviceGlow(0,0,'rgba(242,198,109,1)',72,.42);
      ctx.fillStyle='#13282f';ctx.strokeStyle=on?'#ffe29a':'#9a8153';ctx.lineWidth=3;roundRect(-28,-58,56,70,8);ctx.fill();ctx.stroke();
      ctx.fillStyle=on?'#f5d985':'rgba(242,198,109,.25)';ctx.shadowColor='#f2c66d';ctx.shadowBlur=on?26:5;ctx.beginPath();ctx.arc(0,-24,13*pulse,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
    ctx.save();ctx.font='10px var(--ui)';ctx.textAlign='center';ctx.fillStyle=on?'#f7d888':'rgba(214,232,229,.58)';ctx.fillText(d.label,d.x,d.y+62);ctx.restore();
  }
  function drawHazards(room,t) {
    const ph=P.phaseFor(room,state.run.phase);if(!ph.hazards)return;
    ph.hazards.forEach(h=>{ctx.save();ctx.translate(h.x,h.y);ctx.globalCompositeOperation='screen';
      for(let i=0;i<7;i++){const a=i/7*Math.PI*2+t*.00015*(i%2?1:-1);const rr=h.r*(.55+.24*Math.sin(a*2+i));const g=ctx.createRadialGradient(Math.cos(a)*22,Math.sin(a)*16,4,0,0,rr);g.addColorStop(0,'rgba(103,47,115,.2)');g.addColorStop(.6,'rgba(35,18,55,.24)');g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,rr,0,Math.PI*2);ctx.fill();}
      ctx.globalCompositeOperation='source-over';ctx.fillStyle='rgba(2,4,10,.6)';ctx.beginPath();ctx.arc(0,0,h.r*.62,0,Math.PI*2);ctx.fill();ctx.restore();});
  }
  function drawSource(room,t) {
    const s=P.sourceFor(room,state.run.phase), pulse=1+Math.sin(t*.005)*.08;
    deviceGlow(s.x,s.y,'rgba(156,233,220,1)',44,.34);ctx.save();ctx.translate(s.x,s.y);ctx.strokeStyle='rgba(225,255,248,.8)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,19*pulse,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#d8fff7';ctx.shadowColor='#9ce9dc';ctx.shadowBlur=20;ctx.beginPath();ctx.arc(0,0,7,0,Math.PI*2);ctx.fill();ctx.restore();
  }
  function drawLight(points,t,alpha=1,progress=1) {
    if(points.length<2)return;const end=Math.max(2,Math.ceil(points.length*progress)), pts=points.slice(0,end);
    ctx.save();ctx.globalAlpha=alpha;ctx.lineJoin='round';ctx.lineCap='round';
    path(pts);ctx.strokeStyle='rgba(44,118,119,.5)';ctx.lineWidth=13;ctx.shadowColor='#7ffff0';ctx.shadowBlur=22;ctx.stroke();
    path(pts);ctx.strokeStyle='#d9fff5';ctx.lineWidth=3.2;ctx.shadowBlur=12;ctx.stroke();
    const p=polyPoint(pts,(t*.00028)%1);ctx.fillStyle='#fff5c7';ctx.shadowColor='#f2c66d';ctx.shadowBlur=18;ctx.beginPath();ctx.arc(p.x,p.y,5,0,Math.PI*2);ctx.fill();ctx.restore();
  }
  function drawHintLine(points,t,room) {
    if(!points||points.length<2)return;
    const pulse=.72+.14*Math.sin(t*.006);
    const devices=P.phaseFor(room,state.run.phase).devices;let deviceOrder=0;
    ctx.save();ctx.lineJoin='round';ctx.lineCap='round';
    path(points);ctx.strokeStyle=`rgba(242,198,109,${.18*pulse})`;ctx.lineWidth=14;ctx.stroke();
    path(points);ctx.setLineDash([12,10]);ctx.lineDashOffset=-(t*.035)%22;ctx.strokeStyle=`rgba(255,231,169,${pulse})`;ctx.lineWidth=3;ctx.stroke();ctx.setLineDash([]);
    for(let i=1;i<points.length;i++){
      const a=points[i-1],b=points[i],q=.52,x=lerp(a.x,b.x,q),y=lerp(a.y,b.y,q),ang=Math.atan2(b.y-a.y,b.x-a.x);
      ctx.save();ctx.translate(x,y);ctx.rotate(ang);ctx.fillStyle='#ffe7a4';ctx.beginPath();ctx.moveTo(9,0);ctx.lineTo(-7,-6);ctx.lineTo(-3,0);ctx.lineTo(-7,6);ctx.closePath();ctx.fill();ctx.restore();
      const device=devices.find(d=>dist(d,b)<4);if(device){deviceOrder++;ctx.save();ctx.translate(b.x,b.y);ctx.fillStyle='rgba(5,17,27,.92)';ctx.strokeStyle='#ffe7a4';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,-25,12,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#fff4cd';ctx.font='600 11px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(deviceOrder),0,-25);ctx.restore();}
    }
    ctx.restore();
  }
  function drawAja(pos,t,action) {
    const bob=state.settings.reduceMotion?0:Math.sin(t*.009)*2;
    ctx.save();ctx.translate(pos.x,pos.y+bob);if(action==='pedal')ctx.translate(0,5);if(action==='winch')ctx.rotate(Math.sin(t*.018)*.05);
    // scarf
    ctx.strokeStyle='rgba(232,131,132,.78)';ctx.lineWidth=7;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-5,-46);ctx.quadraticCurveTo(-28,-40,-39+Math.sin(t*.006)*6,-29);ctx.stroke();
    // body and coat
    ctx.fillStyle='#182c34';ctx.strokeStyle='#a8c0bd';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(-13,-40);ctx.quadraticCurveTo(-22,-10,-17,12);ctx.lineTo(-13,39);ctx.lineTo(14,39);ctx.lineTo(18,11);ctx.quadraticCurveTo(22,-15,12,-40);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.strokeStyle='#6f8b8b';ctx.beginPath();ctx.moveTo(0,-33);ctx.lineTo(0,29);ctx.stroke();
    // head + lamp
    ctx.fillStyle='#b9a184';ctx.beginPath();ctx.arc(0,-53,12,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#f4d579';ctx.shadowColor='#f2c66d';ctx.shadowBlur=18;ctx.beginPath();ctx.arc(18,-31,6,0,Math.PI*2);ctx.fill();
    // arms communicate action
    ctx.shadowBlur=0;ctx.strokeStyle='#b9a184';ctx.lineWidth=4;ctx.beginPath();
    if(action==='winch'){ctx.moveTo(-8,-24);ctx.lineTo(-24,-7);ctx.moveTo(8,-24);ctx.lineTo(25,-9);}
    else if(action==='prism'){ctx.moveTo(7,-25);ctx.lineTo(22,-48);ctx.moveTo(-7,-25);ctx.lineTo(-14,-4);}
    else{ctx.moveTo(-8,-25);ctx.lineTo(-14,-4);ctx.moveTo(8,-25);ctx.lineTo(14,-5);}ctx.stroke();
    // feet
    ctx.strokeStyle='#0b1318';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(-8,36);ctx.lineTo(-10,48);ctx.moveTo(8,36);ctx.lineTo(11,48);ctx.stroke();
    ctx.restore();
  }
  function activeAction() {
    if(state.screen!=='resolve'||!state.resolution)return null;
    let last=null;for(const h of state.resolution.trace){if(state.resolveProgress>=h.at/Math.max(1,state.activeLine.length-1))last=h;else break;}
    return last && ['winch','prism','pedal'].includes(last.kind)?last.kind:null;
  }
  function drawParticles(dt) {
    for(const p of state.particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=.00008*dt;}
    state.particles=state.particles.filter(p=>p.life>0);
    ctx.save();ctx.globalCompositeOperation='screen';for(const p of state.particles){ctx.globalAlpha=clamp(p.life/700,0,1);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();}ctx.restore();ctx.globalAlpha=1;
  }
  function burst(x,y,color='#f2c66d',count=20){if(state.settings.reduceMotion)count=6;const r=seeded(Math.floor(x*17+y*31+performance.now()));for(let i=0;i<count;i++){const a=r()*Math.PI*2,s=.025+r()*.09;state.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-.03,r:1+r()*2.5,life:450+r()*500,color});}}

  function render(now) {
    const dt=Math.min(40,now-state.lastFrame);state.lastFrame=now;
    const v=viewportTransform();ctx.save();
    const shake=state.settings.reduceMotion?0:state.shake*Math.sin(now*.07);ctx.translate(shake,shake*.5);state.shake*=.9;
    const room=P.ROOMS[state.run.room]||P.ROOMS[0];drawBackdrop(now,room);drawPlatforms(room);drawHazards(room,now);
    if(state.hintLine)drawHintLine(state.hintLine,now,room);
    const saved=state.solvedLines[state.run.room]||[];saved.forEach(line=>drawLight(line,now,.32,1));
    if(state.draft.length>1)drawLight(state.draft,now,.82,1);
    // The player's submitted line exists immediately; only Aja and the pulse
    // travel along it. This keeps the character from visually outrunning the path.
    if(state.activeLine)drawLight(state.activeLine,now,1,1);
    allDevices(room).forEach(d=>drawDevice(d,now));drawSource(room,now);
    let aja=P.sourceFor(room,state.run.phase);
    if(state.screen==='resolve'&&state.activeLine){aja=polyPoint(state.activeLine,ease(state.resolveProgress));}
    else aja={x:room.ajaStart.x,y:room.ajaStart.y};
    if(state.run.phase>0&&!state.activeLine)aja=P.sourceFor(room,state.run.phase);
    drawAja(aja,now,activeAction());drawParticles(dt);
    if(state.flash>0){ctx.fillStyle=`rgba(232,131,132,${state.flash})`;ctx.fillRect(0,0,W,H);state.flash*=.87;}
    ctx.restore();
    // letterbox when aspect ratio differs
    const dpr=canvas.width/v.rect.width;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#02070c';
    if(v.ox>0){ctx.fillRect(0,0,v.ox,v.rect.height);ctx.fillRect(v.rect.width-v.ox,0,v.ox,v.rect.height);}
    if(v.oy>0){ctx.fillRect(0,0,v.rect.width,v.oy);ctx.fillRect(0,v.rect.height-v.oy,v.rect.width,v.oy);}
    update(now);
    state.rafSamples.push(dt);if(state.rafSamples.length>3600)state.rafSamples.shift();
    requestAnimationFrame(render);
  }

  function update(now) {
    if(state.screen==='intro'){
      const p=(now-state.introStarted)/3400;
      const copies=['<span>没有光的地方，</span><br>城市学会了屏住呼吸。','守灯人阿迦仍在行走。<br><span>他需要你的手。</span>','拖出第一道光。<br><span>剩下的，他会完成。</span>'];
      const step=Math.min(2,Math.floor(p*3));if(step!==state.introStep){state.introStep=step;$('introCopy').innerHTML=copies[step];}
      if(p>=1)enterRoom(false);
    }
    if(state.screen==='resolve'&&state.activeLine){
      const prev=state.resolveProgress||0;state.resolveProgress=clamp((now-state.resolveStarted)/(state.settings.reduceMotion?900:1900),0,1);
      for(const h of state.resolution.trace){const at=h.at/Math.max(1,state.activeLine.length-1);if(prev<at&&state.resolveProgress>=at){Audio.device(h.kind,h.at);burst(h.x,h.y,h.kind==='prism'?'#9ce9dc':'#f2c66d');}}
      if(state.resolveProgress>=1&&!state.resolved){state.resolved=true;finishResolution();}
    }
    if(state.hintUntil&&now>state.hintUntil){state.hintUntil=0;if(state.screen==='play')ui.previewText.textContent='';}
    if(state.toastUntil&&now>state.toastUntil){ui.toast.classList.remove('on');state.toastUntil=0;}
    if(state.dialogueUntil&&now>state.dialogueUntil){ui.dialogue.classList.remove('on');state.dialogueUntil=0;}
  }
  function updateHUD() {
    const r=P.ROOMS[state.run.room];ui.roomRoman.textContent=r.number;ui.roomTitle.textContent=r.title;ui.roomBreath.textContent=r.breath;
    ui.goalText.textContent=r.goal;ui.phaseText.textContent=r.phases.length>1?`步骤 ${state.run.phase+1} / ${r.phases.length}`:'当前目标';
    const used=state.draft.length?P.polyLength(state.draft):0, left=clamp(1-used/r.budget,0,1);
    ui.budgetFill.style.width=(left*100).toFixed(0)+'%';ui.budgetText.textContent=Math.round(left*100)+'%';
    if(state.drawing)ui.previewText.textContent=P.previewMessage(r,state.run.phase,state.draft);
  }
  function showToast(text,ms=1700){ui.toast.textContent=text;ui.toast.classList.add('on');state.toastUntil=performance.now()+ms;}
  function speak(text,ms=2300){if(!state.settings.captions)return;ui.dialogueText.textContent=text;ui.dialogue.classList.add('on');state.dialogueUntil=performance.now()+ms;}
  function hideOverlays(){document.querySelectorAll('.overlay').forEach(x=>x.classList.remove('on'));ui.intro.classList.remove('on');}
  function setScreen(name) {
    state.screen=name;hideOverlays();ui.hud.classList.toggle('on',['play','resolve'].includes(name));
    if(ui[name])ui[name].classList.add('on');
  }
  function startNew() {
    Audio.ensure();state.run=P.makeRun();state.solvedLines={};state.elapsedBefore=0;state.startedAt=performance.now();
    localStorage.removeItem(SAVE);setScreen('intro');ui.intro.classList.add('on');state.introStarted=performance.now();state.introStep=-1;
    $('introCopy').innerHTML='<span>没有光的地方，</span><br>城市学会了屏住呼吸。';
  }
  function continueRun() {
    Audio.ensure();state.run={...P.makeRun(),...state.savedRun,solutions:[...(state.savedRun.solutions||[])]};state.startedAt=performance.now();enterRoom(false);
  }
  function enterRoom(announce=true) {
    state.activeLine=null;state.hintLine=null;state.draft=[];state.resolution=null;state.resolved=false;state.resolveProgress=0;$('hintButton').textContent='需要一点启发？';setScreen('play');updateHUD();persist();
    const r=P.ROOMS[state.run.room];if(announce)showToast(`${r.number} · ${r.title}`,1500);
    const words=['光能拉动比你更重的东西。','线的形状，也是一种力量。','让我看见机关醒来的顺序。','有些门，需要一个人留下来。','最后一次。把选择留在城市里。'];
    speak(words[state.run.room],2500);
  }
  function restartRoom() {
    state.run={...state.run,phase:0,complete:false};delete state.solvedLines[state.run.room];state.activeLine=null;state.draft=[];enterRoom(false);showToast('本室因果已复位');
  }
  function finishResolution() {
    const beforeRoom=state.run.room,beforePhase=state.run.phase;
    (state.solvedLines[beforeRoom]||(state.solvedLines[beforeRoom]=[])).push(state.activeLine.slice());
    state.run=P.applyResult(state.run,state.resolution);state.activeLine=null;persist();
    if(state.run.complete){state.elapsedBefore+=performance.now()-state.startedAt;state.startedAt=performance.now();showEnding();return;}
    if(state.run.room!==beforeRoom){enterRoom(true);return;}
    if(state.run.phase!==beforePhase){enterRoom(false);showToast('阿迦守住了踏座 · 从他的灯继续',2200);speak('我站在这里。下一道光，从我手里开始。',2800);}
  }
  function reject(result) {
    state.run=P.applyResult(state.run,result);persist();Audio.reject();state.shake=7;state.flash=.16;ui.failReason.textContent=result.reason;setScreen('fail');
  }
  function showEnding() {
    state.hintLine=null;setScreen('ending');const ms=state.elapsedBefore;$('endTime').textContent=formatTime(ms);$('endAttempts').textContent=state.run.attempts;
    const sol=state.run.solutions[state.run.solutions.length-1];$('endSolution').textContent=sol==='long'?'稳固长路':'锋利短路';
    Audio.accept();localStorage.removeItem(SAVE);$('continueButton').hidden=true;
  }
  function formatTime(ms){const s=Math.floor(ms/1000),m=Math.floor(s/60);return String(m).padStart(2,'0')+':'+String(s%60).padStart(2,'0');}
  function showHint() {
    const r=P.ROOMS[state.run.room];state.hintLine=canonical(state.run.room,state.run.phase,'short');ui.previewText.textContent='已显示当前阶段的通关路线 · 沿金色虚线描画';$('hintButton').textContent='答案路线已显示';showToast('通关路线已显形',1300);
  }

  canvas.addEventListener('pointerdown',e=>{
    if(state.screen==='intro'){enterRoom(false);return;}if(state.screen!=='play')return;
    const p=pointerPos(e),source=P.sourceFor(P.ROOMS[state.run.room],state.run.phase);
    if(dist(p,source)>78){showToast('请从发光的起点开始');return;}
    Audio.ensure();canvas.setPointerCapture(e.pointerId);state.drawing=true;state.draft=[{...source}];updateHUD();
  });
  canvas.addEventListener('pointermove',e=>{
    if(!state.drawing||state.screen!=='play')return;const p=pointerPos(e),last=state.draft[state.draft.length-1];
    if(dist(p,last)>6){state.draft.push(p);if(state.draft.length%10===0)Audio.trace();updateHUD();}
  });
  function release(e) {
    if(!state.drawing)return;state.drawing=false;
    if(e&&canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);
    const room=P.ROOMS[state.run.room],result=P.analyzeStroke(room,state.run.phase,state.draft);
    if(!result.valid){state.draft=[];updateHUD();reject(result);return;}
    state.activeLine=state.draft.slice();state.draft=[];state.resolution=result;state.resolveStarted=performance.now();state.resolveProgress=0;state.resolved=false;setScreen('resolve');Audio.accept();speak(result.reason,2200);
  }
  canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',()=>{state.drawing=false;state.draft=[];updateHUD();});
  canvas.addEventListener('contextmenu',e=>e.preventDefault());
  window.addEventListener('keydown',e=>{
    if(e.key==='Escape'){if(state.screen==='play')setScreen('pause');else if(state.screen==='pause'){setScreen('play');updateHUD();}else if(['how','settings','credits'].includes(state.screen))closeSheet();}
    if((e.key==='r'||e.key==='R')&&['play','fail','pause'].includes(state.screen))restartRoom();
    if((e.key==='h'||e.key==='H')&&state.screen==='play')showHint();
  });
  window.addEventListener('resize',resize);

  let sheetReturn='title';
  function openSheet(name){sheetReturn=state.screen;if(sheetReturn==='resolve')sheetReturn='play';setScreen(name);}
  function closeSheet(){setScreen(sheetReturn);if(sheetReturn==='play')updateHUD();}
  document.querySelectorAll('[data-open]').forEach(b=>b.addEventListener('click',()=>openSheet(b.dataset.open)));
  document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',closeSheet));
  $('newButton').onclick=startNew;$('continueButton').onclick=continueRun;
  $('pauseButton').onclick=()=>setScreen('pause');$('resumeButton').onclick=()=>{setScreen('play');updateHUD();};
  $('restartButton').onclick=restartRoom;$('titleButton').onclick=()=>{persist();setScreen('title');};
  $('retryButton').onclick=()=>{setScreen('play');updateHUD();};$('failHintButton').onclick=()=>{setScreen('play');updateHUD();showHint();};
  $('failTitleButton').onclick=()=>{persist();setScreen('title');};$('hintButton').onclick=showHint;
  $('againButton').onclick=startNew;$('endingTitleButton').onclick=()=>setScreen('title');
  $('fullscreenButton').onclick=()=>document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen();
  for(const [id,key] of [['masterVolume','master'],['musicVolume','music'],['sfxVolume','sfx']]){
    $(id).addEventListener('input',e=>{state.settings[key]=Number(e.target.value);$(id.replace('Volume','Out')).value=Math.round(state.settings[key]*100)+'%';Audio.ensure();Audio.setLevels();persist();});
  }
  function bindSwitch(id,key){$(id).onclick=()=>{state.settings[key]=!state.settings[key];applySettings();persist();};}
  bindSwitch('motionSwitch','reduceMotion');bindSwitch('contrastSwitch','contrast');bindSwitch('captionSwitch','captions');

  // Deterministic QA hooks. They do not bypass player-facing rules; they feed the
  // same analyzer used by pointer input.
  function canonical(roomIndex,phaseIndex,variant='short'){
    const r=P.ROOMS[roomIndex],ph=r.phases[phaseIndex],by=Object.fromEntries(ph.devices.map(d=>[d.id,d]));
    const req=ph.alternatives?ph.alternatives.find(a=>a.id===variant).required:ph.required;
    const pts=[{...P.sourceFor(r,phaseIndex)},...req.map(id=>({x:by[id].x,y:by[id].y}))];
    if(roomIndex===1)pts.splice(2,0,{x:690,y:620});return pts;
  }
  window.lightlineV2={
    getState:()=>JSON.parse(JSON.stringify({screen:state.screen,run:state.run,settings:state.settings,room:P.ROOMS[state.run.room]?.id,phase:state.run.phase,hintVisible:!!state.hintLine,hintPoints:state.hintLine?.length||0})),
    start:startNew,continue:continueRun,restartRoom,
    submit(points){if(state.screen!=='play')return false;state.draft=points;state.drawing=true;release();return state.resolution?.valid||false;},
    solveCurrent(variant='short'){return this.submit(canonical(state.run.room,state.run.phase,variant));},
    canonical,
    skipIntro:()=>enterRoom(false),
    resetMetrics:()=>{state.rafSamples=[];},
    metrics:()=>{const a=state.rafSamples.slice(-600).sort((x,y)=>x-y);return{samples:a.length,medianMs:a[Math.floor(a.length*.5)]||0,p95Ms:a[Math.floor(a.length*.95)]||0,particles:state.particles.length};},
    screenshot:async(name='shot')=>fetch('/_shot?name='+encodeURIComponent(name),{method:'POST',body:canvas.toDataURL('image/png')}).then(r=>r.text())
  };

  load();applySettings();initStars();resize();updateHUD();requestAnimationFrame(render);
})();
