import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import { GameScene } from "./GameScene";
import { CharacterLab } from "./CharacterLab";
import { canNameBreak, gameReducer, initialGameState, rumorOutcome, type Identity, type RumorChoice } from "./gameState";
import { previsualAssets, uiKeyframes } from "./assets";

type JournalTab = "identity" | "relations" | "network";

const controls = [
  ["WASD / 方向键", "移动"], ["Q", "锁定目标"], ["F", "观察事实"], ["左键 / J", "轻击"],
  ["E / K", "重击"], ["右键 / L", "招架"], ["Shift / Space", "闪避"], ["R", "拆名"],
  ["Tab", "履历与传播"], ["Esc", "暂停"],
];

function Sigil({ active, kind }: { active: boolean; kind: "health" | "breath" | "thread" }) {
  return <span className={`sigil sigil--${kind} ${active ? "is-active" : ""}`} aria-hidden="true" />;
}

function TitleStage({ onStart, onGallery }: { onStart: () => void; onGallery: () => void }) {
  return (
    <section className="title-stage">
      <div className="title-stage__image" style={{ backgroundImage: `linear-gradient(90deg, rgba(4,27,32,.83), rgba(4,27,32,.16)), url(${uiKeyframes})` }} />
      <div className="title-stage__copy">
        <p className="eyebrow">A WEB-NATIVE GRAPHIC STAGE · PREVISUAL BUILD</p>
        <h1>千名之海</h1>
        <p className="title-stage__poem">每一座岛先听见你的名字。<br />归乡，是决定哪一个名字能活着抵达。</p>
        <div className="button-row">
          <button className="primary" onClick={onStart}>驶入盐岬</button>
          <button className="ghost" onClick={onGallery}>查看视觉制作册</button>
          <a className="ghost" href="?lab=character">角色模型调试</a>
        </div>
        <p className="microcopy">键鼠可玩 · 早期动作关卡 · Three.js + R3F</p>
      </div>
      <div className="scroll-cue"><span />向归途航行</div>
    </section>
  );
}

function IdentityChoice({ choose }: { choose: (identity: Identity) => void }) {
  return (
    <div className="modal-shell identity-shell" role="dialog" aria-modal="true" aria-labelledby="identity-title">
      <div className="chapter-mark">客门 · 第一幕</div>
      <h2 id="identity-title">你要让盐岬先看见谁？</h2>
      <p>身份不是职业。它是一项立即生效的权限，和一笔之后会被核对的债。</p>
      <div className="identity-grid">
        <button className="identity-card" onClick={() => choose("captain")}>
          <span className="identity-card__index">01</span><h3>归来的船长</h3>
          <dl><div><dt>现在</dt><dd>重击额外削减 1 格守势</dd></div><div><dt>以后</dt><dd>招架失败会留下“武力索船”</dd></div></dl>
          <span className="identity-card__cta">以桨为证 →</span>
        </button>
        <button className="identity-card identity-card--pilgrim" onClick={() => choose("pilgrim")}>
          <span className="identity-card__index">02</span><h3>风暴朝圣者</h3>
          <dl><div><dt>现在</dt><dd>闪避后的呼吸恢复更快</dd></div><div><dt>以后</dt><dd>主动挥桨会留下“持武朝圣”</dd></div></dl>
          <span className="identity-card__cta">以盐为证 →</span>
        </button>
      </div>
    </div>
  );
}

function Resolution({ choose }: { choose: (choice: RumorChoice) => void }) {
  const options: { id: RumorChoice; title: string; body: string; consequence: string }[] = [
    { id: "reveal", title: "公开誓名", body: "让港口共同见证客礼被背弃。", consequence: "证人欢迎 / 权势家族敌视" },
    { id: "bind", title: "绑定誓名", body: "留下誓卫对归乡者的一次通行债。", consequence: "守卫债务 / 必须兑现" },
    { id: "sever", title: "斩断誓名", body: "让开门者从所有口供中消失。", consequence: "隐匿抵达 / 失去客权" },
  ];
  return (
    <div className="modal-shell resolution-shell" role="dialog" aria-modal="true">
      <div className="thread-knot"><i /><i /><i /></div>
      <p className="eyebrow">三条名线已经显形</p><h2>你如何结束这场胜利？</h2>
      <div className="resolution-grid">
        {options.map((option) => <button key={option.id} onClick={() => choose(option.id)}><span>{option.title}</span><small>{option.body}</small><em>{option.consequence}</em></button>)}
      </div>
    </div>
  );
}

function Network({ choice, facts, onDepart }: { choice: RumorChoice | null; facts: string[]; onDepart?: () => void }) {
  const outcome = rumorOutcome(choice);
  return (
    <div className="network-map">
      <svg viewBox="0 0 720 320" aria-label="传播网络预览">
        <path d="M114 160 C240 55 300 75 390 120 S550 70 628 62" /><path d="M114 160 C260 175 298 185 390 160 S540 170 628 162" /><path d="M114 160 C230 280 315 246 390 210 S530 250 628 262" />
        <g className="node node--origin"><circle cx="114" cy="160" r="38" /><text x="114" y="156">盐岬港</text><text x="114" y="176">Thaleia</text></g>
        <g className="node"><circle cx="390" cy="120" r="28" /><text x="390" y="125">Ion</text></g>
        <g className="node"><circle cx="390" cy="210" r="28" /><text x="390" y="215">Doro</text></g>
        <g className="node node--island"><circle cx="628" cy="62" r="33" /><text x="628" y="67">蜜酒礁</text></g>
        <g className="node node--island"><circle cx="628" cy="162" r="33" /><text x="628" y="167">回声谷</text></g>
        <g className="node node--island"><circle cx="628" cy="262" r="33" /><text x="628" y="267">无灯岛</text></g>
      </svg>
      <div className="network-copy">
        <div><span>下一站先相信</span><strong>{outcome.permission}</strong></div><div><span>下一站会怀疑</span><strong>{outcome.risk}</strong></div><div><span>当前去向</span><strong>{outcome.island}</strong></div>
      </div>
      {facts.length > 0 && <p className="rumor-line">“{facts[facts.length - 1]}”</p>}
      {onDepart && <button className="primary" onClick={onDepart}>登上归潮号</button>}
    </div>
  );
}

function Journal({ tab, setTab, identity, choice, facts, onClose }: { tab: JournalTab; setTab: (tab: JournalTab) => void; identity: Identity | null; choice: RumorChoice | null; facts: string[]; onClose: () => void }) {
  return (
    <div className="drawer" role="dialog" aria-modal="true">
      <div className="drawer__top"><p className="eyebrow">航海册 · 可交互预留</p><button className="icon-button" onClick={onClose} aria-label="关闭">×</button></div>
      <nav>{(["identity", "relations", "network"] as JournalTab[]).map((id) => <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>{id === "identity" ? "身份履历" : id === "relations" ? "人物关系" : "传播网络"}</button>)}</nav>
      {tab === "identity" && <div className="journal-page"><h3>{identity === "captain" ? "归来的船长" : identity === "pilgrim" ? "风暴朝圣者" : "尚未声明"}</h3><p>已确认事实：断裂客符属于一笔未偿还的款待债。</p><ul>{facts.length ? facts.map((fact) => <li key={fact}>{fact}</li>) : <li>尚无公开传播事实</li>}</ul></div>}
      {tab === "relations" && <div className="journal-page relation-list"><div><b>Thaleia</b><span>见证你的战斗结束方式</span></div><div><b>Ion</b><span>把精简传闻带到下一岛</span></div><div><b>Doro</b><span>因潮门重新开启而改变立场</span></div><p>大规模关系网在完整产品中运行；此处仅显示当前关卡真实写入的数据和三个预留角色槽。</p></div>}
      {tab === "network" && <Network choice={choice} facts={facts} />}
    </div>
  );
}

function Gallery({ onClose }: { onClose: () => void }) {
  return (
    <div className="gallery" role="dialog" aria-modal="true" aria-label="预视觉制作册">
      <div className="gallery__head"><div><p className="eyebrow">PREVISUAL REFERENCE · NOT GATE 3 APPROVED</p><h2>视觉制作册</h2></div><button className="icon-button" onClick={onClose}>×</button></div>
      <p className="gallery__notice">这些图只定义画面节奏、动作语义和拆件关系。它们不是最终模型、纹理、骨骼或可直接上线资产。</p>
      <div className="gallery__grid">{previsualAssets.map((asset) => <figure key={asset.id}><img src={asset.src} alt={asset.label} /><figcaption>{asset.label}</figcaption></figure>)}</div>
    </div>
  );
}

function PauseMenu({ state, dispatch, onGallery }: { state: ReturnType<typeof initialGameState>; dispatch: React.Dispatch<Parameters<typeof gameReducer>[1]>; onGallery: () => void }) {
  return (
    <div className="modal-shell pause-shell"><p className="eyebrow">模拟已冻结</p><h2>潮声暂停</h2>
      <div className="pause-actions"><button className="primary" onClick={() => dispatch({ type: "RESUME" })}>继续归途</button><button className="ghost" onClick={onGallery}>视觉制作册</button><button className="ghost" onClick={() => dispatch({ type: "RESTART" })}>从海上重开</button></div>
      <div className="settings"><button onClick={() => dispatch({ type: "TOGGLE_SHAKE" })}>镜头震动 <b>{state.cameraShake ? "开" : "关"}</b></button><button onClick={() => dispatch({ type: "TOGGLE_CONTRAST" })}>高对比预兆 <b>{state.highContrast ? "开" : "关"}</b></button></div>
    </div>
  );
}

function PlayableGame() {
  const [state, dispatch] = useReducer(gameReducer, undefined, initialGameState);
  const [locked, setLocked] = useState(true);
  const [journalOpen, setJournalOpen] = useState(false);
  const [journalTab, setJournalTab] = useState<JournalTab>("identity");
  const [galleryOpen, setGalleryOpen] = useState(false);
  const combat = state.phase === "guard" || state.phase === "warden";

  const dodge = useCallback(() => {
    dispatch({ type: "DODGE_START" });
    window.setTimeout(() => dispatch({ type: "DODGE_END" }), 420);
  }, []);
  const parry = useCallback(() => {
    dispatch({ type: "PARRY_START" });
    window.setTimeout(() => dispatch({ type: "PARRY_END" }), state.phase === "guard" ? 520 : 420);
  }, [state.phase]);

  useEffect(() => {
    if (!combat || state.enemy.telegraph !== "none") return;
    const wait = state.phase === "guard" && state.enemy.attackIndex === 0 ? 1700 : state.phase === "warden" ? 1150 : 1350;
    const timer = window.setTimeout(() => {
      const ring = state.phase === "warden" && state.enemy.attackIndex % 3 === 2;
      dispatch({ type: "ENEMY_TELEGRAPH", telegraph: ring ? "ring" : "parryable" });
    }, wait);
    return () => window.clearTimeout(timer);
  }, [combat, state.phase, state.enemy.telegraph, state.enemy.attackIndex]);

  useEffect(() => {
    if (!combat || state.enemy.telegraph === "none") return;
    const delay = state.enemy.telegraph === "ring" ? 820 : state.phase === "guard" ? 900 : 690;
    const timer = window.setTimeout(() => dispatch({ type: "ENEMY_STRIKE" }), delay);
    return () => window.clearTimeout(timer);
  }, [combat, state.enemy.telegraph, state.phase]);

  useEffect(() => {
    if (!combat || state.breath >= 3) return;
    const delay = state.identity === "pilgrim" ? 950 : 1450;
    const timer = window.setTimeout(() => dispatch({ type: "RESTORE_BREATH" }), delay);
    return () => window.clearTimeout(timer);
  }, [combat, state.breath, state.identity]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (event.code === "Escape") { dispatch({ type: state.phase === "paused" ? "RESUME" : "PAUSE" }); return; }
      if (event.code === "Tab") { event.preventDefault(); setJournalOpen((value) => !value); return; }
      if (event.code === "KeyQ") setLocked((value) => !value);
      if (event.code === "KeyF") dispatch({ type: "OBSERVE_TOKEN" });
      if (event.code === "KeyJ") dispatch({ type: "PLAYER_ATTACK", attack: "light" });
      if (event.code === "KeyK" || event.code === "KeyE") dispatch({ type: "PLAYER_ATTACK", attack: "heavy" });
      if (event.code === "KeyL") parry();
      if (event.code === "ShiftLeft" || event.code === "ShiftRight" || event.code === "Space") dodge();
      if (event.code === "KeyR") dispatch({ type: "NAME_BREAK" });
      if (event.code === "Enter" && state.phase === "title") dispatch({ type: "START" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dodge, parry, state.phase]);

  const tutorial = useMemo(() => {
    if (state.phase === "shore") return { title: "读懂港口", keys: "WASD 移动 · F 观察发光客符" };
    if (state.phase === "guard") return { title: "先看吸气，再举桨", keys: "Q 锁定 · 右键/L 招架 · 左键/J 轻击" };
    if (state.phase === "warden") return { title: canNameBreak(state) ? "三线齐备" : "金环闪避，青息招架", keys: canNameBreak(state) ? "按 R 拆名" : "Shift 闪避 · K 重击 · L 招架" };
    return null;
  }, [state]);

  const mouseAction = (event: React.MouseEvent) => {
    if (!combat) return;
    if ((event.target as HTMLElement).closest("button, summary, .drawer, .gallery, .modal-shell")) return;
    if (event.button === 0) dispatch({ type: "PLAYER_ATTACK", attack: "light" });
    if (event.button === 2) parry();
  };

  return (
    <main className={`app phase-${state.phase} ${state.highContrast ? "high-contrast" : ""}`} onContextMenu={(event) => event.preventDefault()} onMouseDown={mouseAction}>
      <div className="canvas-layer"><GameScene state={state} locked={locked} /></div>
      {state.phase === "title" && <TitleStage onStart={() => dispatch({ type: "START" })} onGallery={() => setGalleryOpen(true)} />}
      {state.phase !== "title" && <>
        <header className="hud-top"><div><span className="hud-label">当前目标</span><strong>{state.objective}</strong></div><div className="hud-actions"><button onClick={() => setJournalOpen(true)}>Tab 航海册</button><button onClick={() => dispatch({ type: "PAUSE" })}>Esc 暂停</button></div></header>
        <aside className="status-cluster">
          <div className="resource"><span>生命</span><div>{[0,1,2,3].map((i) => <Sigil key={i} kind="health" active={state.health > i} />)}</div></div>
          <div className="resource"><span>呼吸</span><div>{[0,1,2].map((i) => <Sigil key={i} kind="breath" active={state.breath > i} />)}</div></div>
          <div className="identity-chip">{state.identity === "captain" ? "归来的船长" : state.identity === "pilgrim" ? "风暴朝圣者" : "尚未宣名"}</div>
        </aside>
        {combat && <div className="boss-bar"><div className="boss-bar__title"><span>{state.phase === "guard" ? "港口誓卫" : "潮门誓卫"}</span><small>{state.enemy.telegraph === "parryable" ? "青色吸气 · 可招架" : state.enemy.telegraph === "ring" ? "金色环击 · 闪避" : "正在判断距离"}</small></div><div className="poise"><i style={{ width: `${state.enemy.maxPoise ? (state.enemy.poise / state.enemy.maxPoise) * 100 : 0}%` }} /></div><div className="threads">{[0,1,2].map((i) => <Sigil key={i} kind="thread" active={state.enemy.threads > i} />)}</div></div>}
        {tutorial && <div className="tutorial-card"><span>{tutorial.title}</span><strong>{tutorial.keys}</strong></div>}
        <div className="feedback-line" key={`${state.actionSerial}-${state.feedback}`}>{state.feedback}</div>
        {combat && <div className="action-dock"><button onClick={() => dispatch({ type: "PLAYER_ATTACK", attack: "light" })}>J<small>轻击</small></button><button onClick={() => dispatch({ type: "PLAYER_ATTACK", attack: "heavy" })}>K<small>重击</small></button><button onClick={dodge}>⇧<small>闪避</small></button><button onClick={parry}>L<small>招架</small></button><button className={canNameBreak(state) ? "ready" : ""} onClick={() => dispatch({ type: "NAME_BREAK" })}>R<small>拆名</small></button></div>}
      </>}
      {state.phase === "identity" && <IdentityChoice choose={(identity) => dispatch({ type: "CLAIM_IDENTITY", identity })} />}
      {state.phase === "resolution" && <Resolution choose={(choice) => dispatch({ type: "RESOLVE_NAME", choice })} />}
      {state.phase === "rumor" && <div className="modal-shell rumor-shell"><p className="eyebrow">传闻已写入</p><h2>它会比你先抵达下一座岛</h2><Network choice={state.rumorChoice} facts={state.rumorFacts} onDepart={() => dispatch({ type: "DEPART" })} /></div>}
      {state.phase === "success" && <div className="modal-shell end-shell"><p className="eyebrow">DEMO COMPLETE · 盐岬港</p><h2>海记住了你的结束方式</h2><p>{state.feedback}</p><div className="button-row"><button className="primary" onClick={() => dispatch({ type: "RESTART" })}>以另一身份重试</button><button className="ghost" onClick={() => { setJournalTab("network"); setJournalOpen(true); }}>查看传播结果</button></div></div>}
      {state.phase === "failure" && <div className="modal-shell end-shell end-shell--failure"><p className="eyebrow">归途在此中断</p><h2>这不是无来源的失败</h2><p>{state.feedback}</p><button className="primary" onClick={() => dispatch({ type: "RESTART" })}>从同一种子重开</button></div>}
      {state.phase === "paused" && <PauseMenu state={state} dispatch={dispatch} onGallery={() => setGalleryOpen(true)} />}
      {journalOpen && <Journal tab={journalTab} setTab={setJournalTab} identity={state.identity} choice={state.rumorChoice} facts={state.rumorFacts} onClose={() => setJournalOpen(false)} />}
      {galleryOpen && <Gallery onClose={() => setGalleryOpen(false)} />}
      {state.phase !== "title" && <button className="controls-help" onClick={() => { setJournalOpen(true); setJournalTab("identity"); }} aria-label="打开操作指引">?</button>}
      <div className="sr-only" aria-live="polite">{state.feedback}</div>
      <details className="controls-legend"><summary>操作指引</summary>{controls.map(([key, label]) => <div key={key}><kbd>{key}</kbd><span>{label}</span></div>)}</details>
    </main>
  );
}

export default function App() {
  return new URLSearchParams(window.location.search).get("lab") === "character"
    ? <CharacterLab />
    : <PlayableGame />;
}
