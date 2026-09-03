/**
 * rewind.js — 10 秒模拟缓冲与确定性回溯
 *
 * 失败不是黑屏读档，而是把时间和光线一起收回。
 * 只恢复到「明确合法且安全」的快照；没有合法快照时视为内容错误，
 * 由 game 报出并重开本段，而不是猜一个位置。
 */
(function (global) {
  'use strict';
  const LL = (global.LL = global.LL || {});
  const C = LL.core;

  const HZ = 12;
  const WINDOW = 10;              // 秒
  const CAP = HZ * WINDOW;
  const SAFE_MARGIN = 0.42;       // 坠落前这段时间的快照一律不信任
  const RECOVER_LEAD = 0.9;       // 恢复点至少要比坠落早这么久
  const MIN_RUNWAY = 1.1;         // 恢复后至少还有这么多秒的助跑，否则等于没救

  function createRewind() {
    const buf = [];
    let acc = 0;

    function capture(dt, state) {
      acc += dt;
      if (acc < 1 / HZ) return;
      acc = 0;
      buf.push(state);
      if (buf.length > CAP) buf.shift();
    }

    /**
     * 恢复点必须同时满足：合法着地、离坠落足够远、并且还留有助跑距离。
     * 只满足「合法」会把玩家丢回断口边缘，形成无解的重复坠落。
     */
    function findSafe(beforeT) {
      for (let i = buf.length - 1; i >= 0; i--) {
        const s = buf[i];
        if (s.safe && s.runway >= MIN_RUNWAY && s.t <= beforeT - RECOVER_LEAD) return { snap: s, index: i };
      }
      for (let i = buf.length - 1; i >= 0; i--) {
        const s = buf[i];
        if (s.safe && s.t <= beforeT - SAFE_MARGIN) return { snap: s, index: i };
      }
      return null;
    }

    /** 从 index 到当前的位置序列，供回放使用 */
    function tail(index) {
      return buf.slice(index);
    }

    function truncate(index) {
      buf.length = Math.max(0, index + 1);
    }

    function clear() { buf.length = 0; acc = 0; }

    return {
      capture, findSafe, tail, truncate, clear,
      get size() { return buf.length; },
      get span() { return buf.length ? buf[buf.length - 1].t - buf[0].t : 0; },
      buf,
    };
  }

  LL.createRewind = createRewind;
})(typeof window !== 'undefined' ? window : globalThis);
