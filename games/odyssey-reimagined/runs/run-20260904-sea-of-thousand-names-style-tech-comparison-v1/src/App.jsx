import { lazy, Suspense, useEffect, useMemo, useState } from "react";

const BabylonPainterly = lazy(() => import("./scenes/BabylonPainterly"));
const RelicDiorama = lazy(() => import("./scenes/RelicDiorama"));
const LivingManuscript = lazy(() => import("./scenes/LivingManuscript"));

const ROUTES = [
  {
    id: "painterly",
    marker: "A",
    title: "绘画性电影 3D",
    engine: "Babylon.js",
    subtitle: "角色表演 · 手绘材质 · 电影化景深",
  },
  {
    id: "relic",
    marker: "B",
    title: "抽象遗物棋盘",
    engine: "Three.js + R3F",
    subtitle: "等距箱庭 · 权限拓扑 · 遗物色章",
  },
  {
    id: "manuscript",
    marker: "C",
    title: "活页手抄本",
    engine: "Three.js + R3F",
    subtitle: "折页舞台 · 边注证据 · 蜡封身份",
  },
];

const INITIAL_STATE = {
  observed: false,
  identity: null,
  sunset: 1,
  rumor: "伊翁仍在集市收集说法",
};

const requestedRoute = new URLSearchParams(window.location.search).get("route");
const initialRoute = ROUTES.some((item) => item.id === requestedRoute) ? requestedRoute : "painterly";

function App() {
  const [active, setActive] = useState(initialRoute);
  const [world, setWorld] = useState(INITIAL_STATE);
  const [fps, setFps] = useState("—");

  useEffect(() => {
    let frameId;
    let previous = performance.now();
    let frames = 0;
    let elapsed = 0;
    const sample = (now) => {
      const delta = now - previous;
      previous = now;
      frames += 1;
      elapsed += delta;
      if (elapsed >= 750) {
        setFps(String(Math.round((frames * 1000) / elapsed)));
        frames = 0;
        elapsed = 0;
      }
      frameId = requestAnimationFrame(sample);
    };
    frameId = requestAnimationFrame(sample);
    return () => cancelAnimationFrame(frameId);
  }, []);

  const route = useMemo(() => ROUTES.find((item) => item.id === active), [active]);

  const actions = {
    observe: () => setWorld((value) => ({ ...value, observed: true, rumor: "伊翁记住：执政官家族欠一份旧款待债" })),
    claim: (identity) => setWorld((value) => ({ ...value, identity })),
    advance: () => setWorld((value) => ({ ...value, sunset: Math.min(4, value.sunset + 1) })),
    reset: () => setWorld(INITIAL_STATE),
  };

  const selectRoute = (routeId) => {
    setActive(routeId);
    window.history.replaceState(null, "", `?route=${routeId}`);
  };

  return (
    <main className={`app route-${active}`} data-testid="app-shell">
      <header className="masthead">
        <div className="brand-block">
          <span className="eyebrow">SEA OF A THOUSAND NAMES / TECH–STYLE STUDY</span>
          <h1>盐岬港：被扣的归潮号</h1>
        </div>
        <div className="experiment-status">
          <span className="status-dot" />
          实验资产 · 非视觉锁定
        </div>
      </header>

      <nav className="route-tabs" aria-label="视觉路线">
        {ROUTES.map((item) => (
          <button
            key={item.id}
            className={active === item.id ? "route-tab active" : "route-tab"}
            onClick={() => selectRoute(item.id)}
            data-testid={`route-${item.id}`}
          >
            <span className="route-marker">{item.marker}</span>
            <span className="route-copy">
              <strong>{item.title}</strong>
              <small>{item.engine}</small>
            </span>
          </button>
        ))}
      </nav>

      <section className="comparison-frame" aria-label={`${route.title} 实时场景`}>
        <div className="frame-label">
          <span>路线 {route.marker}</span>
          <strong>{route.title}</strong>
          <em>{route.subtitle}</em>
        </div>
        <Suspense fallback={<div className="route-loading">正在装入实时场景…</div>}>
          {active === "painterly" && <BabylonPainterly world={world} actions={actions} />}
          {active === "relic" && <RelicDiorama world={world} actions={actions} />}
          {active === "manuscript" && <LivingManuscript world={world} actions={actions} />}
        </Suspense>
      </section>

      <footer className="study-footer">
        <span>固定内容：船印 / 潮门 / 伊翁传闻 / 两种身份</span>
        <span data-testid="fps-readout">当前路线浏览器帧率≈ {fps} FPS</span>
        <span>变化项：渲染器 / 空间模型 / 材质 / UI / 动效</span>
      </footer>
    </main>
  );
}

export default App;
