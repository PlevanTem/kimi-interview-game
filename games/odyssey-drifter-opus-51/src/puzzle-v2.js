/**
 * puzzle-v2.js — 《光线之上》共织机关的确定性规则与五房数据
 * 不依赖 DOM / Canvas，可在 Node 下直接测试。
 */
(function (global) {
  'use strict';
  const LL = (global.LL = global.LL || {});

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const distance = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);

  function polyLength(points) {
    let total = 0;
    for (let i = 1; i < points.length; i++) total += distance(points[i - 1], points[i]);
    return total;
  }

  function closestOnSegment(p, a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const d2 = dx * dx + dy * dy || 1;
    const t = clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / d2, 0, 1);
    const x = a.x + dx * t;
    const y = a.y + dy * t;
    return { t, x, y, d: Math.hypot(p.x - x, p.y - y) };
  }

  function lengthAt(points, at) {
    const whole = Math.max(0, Math.min(points.length - 2, Math.floor(at)));
    let total = 0;
    for (let i = 1; i <= whole; i++) total += distance(points[i - 1], points[i]);
    const f = clamp(at - whole, 0, 1);
    total += distance(points[whole], points[whole + 1]) * f;
    return total;
  }

  function firstNodeHit(points, node) {
    const radius = node.radius || 42;
    let best = null;
    for (let i = 1; i < points.length; i++) {
      const q = closestOnSegment(node, points[i - 1], points[i]);
      if (q.d <= radius) {
        const hit = { id: node.id, kind: node.kind, at: i - 1 + q.t, x: node.x, y: node.y };
        if (!best || hit.at < best.at) best = hit;
      }
    }
    return best;
  }

  function traceNodes(points, nodes) {
    return nodes.map((node) => firstNodeHit(points, node)).filter(Boolean).sort((a, b) => a.at - b.at);
  }

  function firstCircleHit(points, circle) {
    for (let i = 1; i < points.length; i++) {
      const q = closestOnSegment(circle, points[i - 1], points[i]);
      if (q.d <= circle.r) return i - 1 + q.t;
    }
    return Infinity;
  }

  function spanTension(points, a, b) {
    if (!a || !b || b.at <= a.at) return 1;
    const arc = Math.max(1, lengthAt(points, b.at) - lengthAt(points, a.at));
    return clamp(distance(a, b) / arc, 0, 1);
  }

  function node(id, kind, x, y, label, extra) {
    return Object.assign({ id, kind, x, y, label, radius: 44 }, extra || {});
  }

  const ROOMS = [
    {
      id: 'awakening-winch', number: 'I', title: '风井初醒', breath: '让光成为力量',
      goal: '让光绕过绞盘，抬起出口', hint: '拖线经过铜色绞盘，再送到出口。',
      budget: 1320, source: { x: 150, y: 500 }, ajaStart: { x: 180, y: 500 },
      phases: [{
        required: ['winch', 'exit'],
        devices: [
          node('winch', 'winch', 520, 350, '绞盘'),
          node('exit', 'exit', 1100, 450, '出口', { radius: 58 }),
        ],
      }],
      platforms: [[70, 530, 350], [920, 480, 300]],
      skyline: 11,
    },
    {
      id: 'split-tension', number: 'II', title: '双息廊桥', breath: '一段拉动，一段承重',
      goal: '前段绷紧绞盘，后段放松成桥', hint: '到绞盘要直；离开绞盘后让线明显下垂。',
      budget: 1530, source: { x: 135, y: 470 }, ajaStart: { x: 170, y: 470 },
      phases: [{
        required: ['winch', 'exit'], tension: { before: [0.88, 1.01], after: [0.56, 0.84] },
        devices: [
          node('winch', 'winch', 470, 340, '绞盘'),
          node('exit', 'exit', 1115, 415, '出口', { radius: 58 }),
        ],
      }],
      platforms: [[55, 500, 330], [945, 445, 280]],
      skyline: 23,
    },
    {
      id: 'prism-order', number: 'III', title: '折光庭', breath: '顺序就是道路',
      goal: '先熄灭阴影，再点亮出口', hint: '脉冲会按你经过装置的顺序前进。',
      budget: 1610, source: { x: 125, y: 480 }, ajaStart: { x: 160, y: 480 },
      phases: [{
        required: ['prism-a', 'prism-b', 'exit'], shieldId: 'prism-a',
        devices: [
          node('prism-a', 'prism', 410, 250, '静影棱镜'),
          node('prism-b', 'prism', 900, 540, '出口棱镜'),
          node('exit', 'exit', 1130, 320, '出口', { radius: 58 }),
        ],
        hazards: [{ id: 'shadow', x: 690, y: 410, r: 105 }],
      }],
      platforms: [[45, 510, 310], [995, 350, 250]],
      skyline: 37,
    },
    {
      id: 'aja-is-anchor', number: 'IV', title: '守门人的手', breath: '他是机关的另一半',
      goal: '让阿迦压住踏座，再从他的灯继续', hint: '第一笔停在踏座；第二笔从阿迦手中的灯起线。',
      budget: 1470, source: { x: 120, y: 500 }, ajaStart: { x: 160, y: 500 },
      phases: [
        {
          required: ['pedal'],
          devices: [node('pedal', 'pedal', 475, 500, '踏座', { radius: 60 })],
          nextSource: { x: 475, y: 452 },
        },
        {
          required: ['prism', 'exit'],
          devices: [
            node('prism', 'prism', 760, 245, '门棱镜'),
            node('exit', 'exit', 1120, 420, '出口', { radius: 58 }),
          ],
        },
      ],
      platforms: [[45, 530, 390], [390, 530, 190], [960, 450, 270]],
      skyline: 51,
    },
    {
      id: 'city-heart', number: 'V', title: '城市心室', breath: '选择你留下的形状',
      goal: '让阿迦守住心座，再完成最后的力与光序', hint: '短路更紧；经过上方支点的长路更稳。两种都能成立。',
      budget: 1810, source: { x: 105, y: 525 }, ajaStart: { x: 145, y: 525 },
      phases: [
        {
          required: ['pedal'],
          devices: [node('pedal', 'pedal', 275, 525, '心座', { radius: 58 })],
          nextSource: { x: 275, y: 475 },
        },
        {
          alternatives: [
            { id: 'short', required: ['winch', 'prism-a', 'prism-b', 'exit'], maxLength: 1260, winchTension: [0.86, 1.01] },
            { id: 'long', required: ['anchor', 'winch', 'prism-a', 'prism-b', 'exit'], maxLength: 1580, winchTension: [0.62, 1.01] },
          ],
          shieldId: 'prism-a',
          devices: [
            node('anchor', 'anchor', 430, 230, '稳固支点'),
            node('winch', 'winch', 520, 485, '心室绞盘'),
            node('prism-a', 'prism', 710, 285, '静影棱镜'),
            node('prism-b', 'prism', 930, 515, '晨光棱镜'),
            node('exit', 'exit', 1160, 325, '终灯', { radius: 62 }),
          ],
          hazards: [{ id: 'shadow', x: 815, y: 405, r: 86 }],
        },
      ],
      platforms: [[25, 555, 330], [1040, 355, 220]],
      skyline: 73,
    },
  ];

  function phaseFor(room, phaseIndex) {
    return room.phases[Math.max(0, Math.min(room.phases.length - 1, phaseIndex || 0))];
  }

  function sourceFor(room, phaseIndex) {
    if (!phaseIndex) return room.source;
    return room.phases[phaseIndex - 1].nextSource || room.source;
  }

  function checkOrder(trace, required) {
    const allowed = new Set(required);
    const seen = trace.filter((h) => allowed.has(h.id)).map((h) => h.id);
    return seen.length === required.length && required.every((id, i) => seen[i] === id);
  }

  function previewMessage(room, phaseIndex, points) {
    if (!points || points.length < 2) return '从发光的起点开始';
    const phase = phaseFor(room, phaseIndex);
    const trace = traceNodes(points, phase.devices);
    const ids = trace.map((h) => h.id);
    const length = polyLength(points);
    if (length > room.budget) return '余光已用尽 · 缩短路线';
    if (!ids.length) return phaseIndex ? '把光送向下一台机关' : room.goal;
    const labels = trace.map((hit, i) => `${i + 1} ${phase.devices.find((d) => d.id === hit.id).label}`);
    return labels.join('  →  ');
  }

  function analyzeStroke(roomOrIndex, phaseIndex, points) {
    const room = typeof roomOrIndex === 'number' ? ROOMS[roomOrIndex] : roomOrIndex;
    const phase = phaseFor(room, phaseIndex);
    const source = sourceFor(room, phaseIndex);
    const out = {
      valid: false, roomId: room.id, phase: phaseIndex || 0, reason: '', solution: null,
      length: polyLength(points || []), budget: room.budget, trace: [], tensions: {}, interactions: 0,
    };
    if (!points || points.length < 2) { out.reason = '这条线还没有形成'; return out; }
    if (distance(points[0], source) > 72) { out.reason = '请从发光的起点开始'; return out; }
    if (out.length > room.budget) { out.reason = '余光不够，缩短路线'; return out; }

    out.trace = traceNodes(points, phase.devices);
    const byId = Object.fromEntries(out.trace.map((hit) => [hit.id, hit]));

    if (phase.hazards) {
      for (const hazard of phase.hazards) {
        const hazardAt = firstCircleHit(points, hazard);
        const shieldAt = byId[phase.shieldId] ? byId[phase.shieldId].at : Infinity;
        if (hazardAt < shieldAt) {
          out.reason = '阴影先吞掉了光 · 先经过静影棱镜';
          out.failureAt = hazardAt;
          return out;
        }
      }
    }

    let chosen = null;
    if (phase.alternatives) {
      // Prefer the most explicit route. A long route contains every node of the
      // short route plus its anchor, so testing the short route first would
      // misclassify a legitimate long solution and apply the wrong budget.
      chosen = phase.alternatives.slice()
        .sort((a, b) => b.required.length - a.required.length)
        .find((candidate) => checkOrder(out.trace, candidate.required)) || null;
      if (!chosen) { out.reason = '机关顺序还没有闭合'; return out; }
      if (out.length > chosen.maxLength) { out.reason = '这条解法超过了可用线长'; return out; }
    } else if (!checkOrder(out.trace, phase.required)) {
      const expected = phase.required.find((id) => !byId[id]);
      const label = phase.devices.find((d) => d.id === expected);
      out.reason = label ? `还没有经过${label.label}` : '机关顺序不正确';
      return out;
    }

    const required = chosen ? chosen.required : phase.required;
    const winchIndex = required.indexOf('winch');
    if (winchIndex >= 0 && byId.winch) {
      const prevId = required[winchIndex - 1];
      const prev = prevId && byId[prevId] ? byId[prevId] : { id: 'source', x: source.x, y: source.y, at: 0 };
      const before = spanTension(points, prev, byId.winch);
      out.tensions.before = before;
      const nextId = required[winchIndex + 1];
      if (nextId && byId[nextId]) out.tensions.after = spanTension(points, byId.winch, byId[nextId]);
    }

    if (phase.tension) {
      const before = out.tensions.before == null ? 1 : out.tensions.before;
      const after = out.tensions.after == null ? 1 : out.tensions.after;
      if (before < phase.tension.before[0]) { out.reason = '绞盘前的线太松，无法传力'; return out; }
      if (after > phase.tension.after[1]) { out.reason = '阿迦脚下太紧 · 让后半段下垂'; return out; }
      if (after < phase.tension.after[0]) { out.reason = '后半段太松，够不到出口'; return out; }
    }

    if (chosen && chosen.winchTension) {
      const tension = out.tensions.before == null ? 1 : out.tensions.before;
      if (tension < chosen.winchTension[0] || tension > chosen.winchTension[1]) {
        out.reason = chosen.id === 'short' ? '短路没有把绞盘绷紧' : '长路失去传力';
        return out;
      }
      out.solution = chosen.id;
    }

    out.valid = true;
    out.reason = phaseIndex < room.phases.length - 1 ? '阿迦接住了机关 · 从他的灯继续' : '因果闭合';
    out.interactions = out.trace.filter((hit) => ['winch', 'prism', 'pedal'].includes(hit.kind)).length;
    return out;
  }

  function makeRun() {
    return { room: 0, phase: 0, attempts: 0, interactions: 0, solutions: [], complete: false };
  }

  function applyResult(run, result) {
    const next = Object.assign({}, run, { solutions: run.solutions.slice() });
    next.attempts += 1;
    if (!result.valid) return next;
    next.interactions += result.interactions;
    const room = ROOMS[next.room];
    if (next.phase < room.phases.length - 1) {
      next.phase += 1;
      return next;
    }
    if (result.solution) next.solutions.push(result.solution);
    if (next.room >= ROOMS.length - 1) next.complete = true;
    else { next.room += 1; next.phase = 0; }
    return next;
  }

  LL.puzzleV2 = {
    ROOMS, polyLength, closestOnSegment, traceNodes, firstCircleHit, spanTension,
    phaseFor, sourceFor, previewMessage, analyzeStroke, makeRun, applyResult,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = LL.puzzleV2;
})(typeof window !== 'undefined' ? window : globalThis);
