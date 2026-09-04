import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { heroActions as actionSheetUrl, heroTurnaround as turnaroundUrl } from "./assets";
import {
  HERO_LAB_ACTIONS,
  HeroCharacterModel,
  type HeroLabAction,
} from "./HeroCharacterModel";
import "./characterLab.css";

type CameraPreset = "front" | "left" | "back" | "three-quarter";

type RenderMetrics = {
  calls: number;
  triangles: number;
  geometries: number;
};

const CAMERA_PRESETS: Record<CameraPreset, { label: string; short: string; position: [number, number, number] }> = {
  front: { label: "正面 0°", short: "正", position: [0, 2.28, 6.8] },
  left: { label: "左侧 90°", short: "侧", position: [-6.8, 2.28, 0] },
  back: { label: "背面 180°", short: "背", position: [0, 2.28, -6.8] },
  "three-quarter": { label: "英雄 3/4", short: "¾", position: [5.1, 2.82, 5.1] },
};

const DEFAULT_ACTION = HERO_LAB_ACTIONS[0]?.id ?? ("idle_neutral" as HeroLabAction);

function LabCamera({ preset, revision }: { preset: CameraPreset; revision: number }) {
  const { camera, gl } = useThree();
  const controlsRef = useRef<OrbitControls | null>(null);
  const goalPosition = useRef(new THREE.Vector3(...CAMERA_PRESETS[preset].position));
  const goalTarget = useRef(new THREE.Vector3(0, 1.62, 0));

  useEffect(() => {
    const controls = new OrbitControls(camera, gl.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.075;
    controls.enablePan = true;
    controls.screenSpacePanning = true;
    controls.minDistance = 4.1;
    controls.maxDistance = 10;
    controls.minPolarAngle = Math.PI * 0.16;
    controls.maxPolarAngle = Math.PI * 0.82;
    controls.target.copy(goalTarget.current);
    controls.update();
    controlsRef.current = controls;
    return () => {
      controls.dispose();
      controlsRef.current = null;
    };
  }, [camera, gl.domElement]);

  useEffect(() => {
    goalPosition.current.set(...CAMERA_PRESETS[preset].position);
    goalTarget.current.set(0, 1.62, 0);
    camera.position.copy(goalPosition.current);
    const controls = controlsRef.current;
    if (controls) {
      controls.target.copy(goalTarget.current);
      controls.update();
    } else {
      camera.lookAt(goalTarget.current);
    }
  }, [camera, preset, revision]);

  useFrame(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    controls.update();
  });

  return null;
}

function MetricsProbe({ onChange }: { onChange: (metrics: RenderMetrics) => void }) {
  const { gl } = useThree();

  useEffect(() => {
    const read = () => {
      onChange({
        calls: gl.info.render.calls,
        triangles: gl.info.render.triangles,
        geometries: gl.info.memory.geometries,
      });
    };
    read();
    const timer = window.setInterval(read, 500);
    return () => window.clearInterval(timer);
  }, [gl, onChange]);

  return null;
}

function StudioStage({
  action,
  actionSerial,
  holdPeak,
  wireframe,
  showRig,
  showWeaponTrail,
  identity,
}: {
  action: HeroLabAction;
  actionSerial: number;
  holdPeak: boolean;
  wireframe: boolean;
  showRig: boolean;
  showWeaponTrail: boolean;
  identity: "captain" | "pilgrim";
}) {
  return (
    <>
      <color attach="background" args={["#071c21"]} />
      <fog attach="fog" args={["#071c21", 8, 17]} />
      <ambientLight intensity={0.78} color="#d9f3eb" />
      <hemisphereLight args={["#9ad9da", "#38291f", 1.15]} />
      <directionalLight
        castShadow
        color="#ffd89a"
        intensity={3.4}
        position={[4.4, 7.5, 5.2]}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-far={18}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={6}
        shadow-camera-bottom={-2}
      />
      <pointLight color="#3ac7c0" intensity={7} distance={8} position={[-3.2, 2.3, 1.8]} />
      <group position={[0, -0.02, 0]}>
        <HeroCharacterModel
          action={action}
          actionSerial={actionSerial}
          holdPeak={holdPeak}
          wireframe={wireframe}
          showRig={showRig}
          showWeaponTrail={showWeaponTrail}
          identity={identity}
          scale={1}
        />
      </group>
      <mesh receiveShadow rotation-x={-Math.PI / 2} position={[0, -0.05, 0]}>
        <circleGeometry args={[4.2, 72]} />
        <meshStandardMaterial color="#102f32" roughness={0.94} metalness={0.02} />
      </mesh>
      <mesh receiveShadow rotation-x={-Math.PI / 2} position={[0, -0.075, 0]}>
        <ringGeometry args={[4.25, 4.31, 96]} />
        <meshBasicMaterial color="#b58b4b" transparent opacity={0.54} />
      </mesh>
      <gridHelper args={[12, 24, "#83683d", "#164046"]} position={[0, -0.095, 0]} />
    </>
  );
}

function Toggle({
  label,
  checked,
  onChange,
  testId,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
  testId?: string;
}) {
  return (
    <button
      type="button"
      className={`character-lab__toggle ${checked ? "is-on" : ""}`}
      aria-pressed={checked}
      onClick={onChange}
      data-testid={testId}
    >
      <span aria-hidden="true"><i /></span>
      {label}
    </button>
  );
}

export function CharacterLab() {
  const [action, setAction] = useState<HeroLabAction>(DEFAULT_ACTION);
  const [actionSerial, setActionSerial] = useState(0);
  const [preset, setPreset] = useState<CameraPreset>("three-quarter");
  const [cameraRevision, setCameraRevision] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);
  const [wireframe, setWireframe] = useState(false);
  const [showRig, setShowRig] = useState(false);
  const [showWeaponTrail, setShowWeaponTrail] = useState(true);
  const [holdPeak, setHoldPeak] = useState(false);
  const [identity, setIdentity] = useState<"captain" | "pilgrim">("captain");
  const [metrics, setMetrics] = useState<RenderMetrics>({ calls: 0, triangles: 0, geometries: 0 });

  const currentAction = useMemo(
    () => HERO_LAB_ACTIONS.find((entry) => entry.id === action) ?? HERO_LAB_ACTIONS[0],
    [action],
  );

  const playAction = useCallback((nextAction: HeroLabAction) => {
    setAction(nextAction);
    setActionSerial((serial) => serial + 1);
  }, []);

  const cycleAction = useCallback((direction: 1 | -1) => {
    const index = HERO_LAB_ACTIONS.findIndex((entry) => entry.id === action);
    const nextIndex = (index + direction + HERO_LAB_ACTIONS.length) % HERO_LAB_ACTIONS.length;
    playAction(HERO_LAB_ACTIONS[nextIndex].id);
  }, [action, playAction]);

  const chooseCamera = useCallback((nextPreset: CameraPreset) => {
    setPreset(nextPreset);
    setCameraRevision((revision) => revision + 1);
  }, []);

  useEffect(() => {
    if (!autoPlay) return;
    const timer = window.setInterval(() => {
      setAction((previous) => {
        const index = HERO_LAB_ACTIONS.findIndex((entry) => entry.id === previous);
        return HERO_LAB_ACTIONS[(index + 1) % HERO_LAB_ACTIONS.length].id;
      });
      setActionSerial((serial) => serial + 1);
    }, 1900);
    return () => window.clearInterval(timer);
  }, [autoPlay]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("button, a, summary, input, textarea, select, [contenteditable='true']")) return;
      if (event.code === "ArrowRight") { event.preventDefault(); cycleAction(1); }
      if (event.code === "ArrowLeft") { event.preventDefault(); cycleAction(-1); }
      if (event.code === "Space") { event.preventDefault(); setAutoPlay((value) => !value); }
      if (event.code === "Digit1") chooseCamera("front");
      if (event.code === "Digit2") chooseCamera("left");
      if (event.code === "Digit3") chooseCamera("back");
      if (event.code === "Digit4") chooseCamera("three-quarter");
      if (event.code === "KeyR") chooseCamera("three-quarter");
      if (event.code === "KeyH") setHoldPeak((value) => !value);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [chooseCamera, cycleAction]);

  return (
    <main className="character-lab">
      <header className="character-lab__header">
        <div className="character-lab__brand">
          <a href="./" className="character-lab__back" aria-label="返回主游戏">← 返回主游戏</a>
          <div>
            <p>THREE.JS · PROCEDURAL CHARACTER BUILD</p>
            <h1>角色动作实验室</h1>
          </div>
        </div>
        <div className="character-lab__status" role="status">
          <span>PREVISUAL</span>
          <strong>NOT GATE 3</strong>
          <small>模型与动作仅供结构、比例和可读性验证</small>
        </div>
      </header>

      <section className="character-lab__workspace" aria-label="三维角色调试工作区">
        <div className="character-lab__viewport">
          <div className="character-lab__canvas" data-testid="character-canvas">
            <Canvas
              shadows
              dpr={[1, 2]}
              camera={{ fov: 32, near: 0.1, far: 40, position: CAMERA_PRESETS["three-quarter"].position }}
              gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
              onCreated={({ gl }) => {
                gl.outputColorSpace = THREE.SRGBColorSpace;
                gl.toneMapping = THREE.ACESFilmicToneMapping;
                gl.toneMappingExposure = 1.08;
              }}
            >
              <Suspense fallback={null}>
                <StudioStage
                  action={action}
                  actionSerial={actionSerial}
                  holdPeak={holdPeak}
                  wireframe={wireframe}
                  showRig={showRig}
                  showWeaponTrail={showWeaponTrail}
                  identity={identity}
                />
                <LabCamera preset={preset} revision={cameraRevision} />
                <MetricsProbe onChange={setMetrics} />
              </Suspense>
            </Canvas>
          </div>

          <div className="character-lab__viewport-topline">
            <div>
              <span className="character-lab__live-dot" /> LIVE MODEL
            </div>
            <output data-testid="camera-status">{CAMERA_PRESETS[preset].label}</output>
          </div>

          <div className="character-lab__view-presets" aria-label="镜头预设">
            {(Object.entries(CAMERA_PRESETS) as [CameraPreset, (typeof CAMERA_PRESETS)[CameraPreset]][]).map(([id, item], index) => (
              <button
                type="button"
                key={id}
                className={preset === id ? "is-active" : ""}
                aria-pressed={preset === id}
                onClick={() => chooseCamera(id)}
                data-testid={`camera-${id}`}
              >
                <span>{item.short}</span>
                <small>{index + 1}</small>
                {item.label}
              </button>
            ))}
          </div>

          <div className="character-lab__metrics" aria-label="实时渲染统计">
            <div><span>DRAW CALLS</span><strong>{metrics.calls.toLocaleString()}</strong></div>
            <div><span>TRIANGLES</span><strong>{metrics.triangles.toLocaleString()}</strong></div>
            <div><span>GEOMETRIES</span><strong>{metrics.geometries.toLocaleString()}</strong></div>
          </div>

          <p className="character-lab__orbit-hint">拖动旋转 · 滚轮缩放 · 右键平移 · R 复位</p>
        </div>

        <aside className="character-lab__panel">
          <section className="character-lab__current">
            <div>
              <span>当前动作 / {currentAction?.category ?? "ACTION"}</span>
              <strong data-testid="current-action">{currentAction?.label ?? action}</strong>
              <code>{action}</code>
            </div>
            <button
              type="button"
              className={`character-lab__play ${autoPlay ? "is-playing" : ""}`}
              aria-pressed={autoPlay}
              onClick={() => setAutoPlay((value) => !value)}
              data-testid="autoplay-toggle"
            >
              <i aria-hidden="true" />
              {autoPlay ? "暂停轮播" : "自动轮播"}
              <kbd>Space</kbd>
            </button>
          </section>

          <section className="character-lab__action-section">
            <div className="character-lab__section-title">
              <h2>动作姿势</h2>
              <span>12 / 12</span>
            </div>
            <div className="character-lab__action-grid">
              {HERO_LAB_ACTIONS.map((item, index) => (
                <button
                  type="button"
                  key={item.id}
                  className={action === item.id ? "is-active" : ""}
                  aria-pressed={action === item.id}
                  onClick={() => playAction(item.id)}
                  data-testid="action-button"
                  data-action-id={item.id}
                >
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{item.label}</strong>
                  <small>{item.category}</small>
                </button>
              ))}
            </div>
            <div className="character-lab__cycle-help">
              <button type="button" onClick={() => cycleAction(-1)} aria-label="上一个动作">←</button>
              <span>点击当前动作重播 · 方向键切换</span>
              <button type="button" onClick={() => cycleAction(1)} aria-label="下一个动作">→</button>
            </div>
          </section>

          <section className="character-lab__options">
            <div className="character-lab__section-title"><h2>调试显示</h2><span>VIEW</span></div>
            <div className="character-lab__toggle-grid">
              <Toggle label="线框" checked={wireframe} onChange={() => setWireframe((value) => !value)} testId="wireframe-toggle" />
              <Toggle label="关节标记" checked={showRig} onChange={() => setShowRig((value) => !value)} testId="rig-toggle" />
              <Toggle label="武器拖尾" checked={showWeaponTrail} onChange={() => setShowWeaponTrail((value) => !value)} />
              <Toggle label="关键帧定格" checked={holdPeak} onChange={() => setHoldPeak((value) => !value)} testId="hold-peak-toggle" />
            </div>
            <div className="character-lab__identity" aria-label="身份配色">
              <span>身份配色</span>
              <div>
                <button type="button" className={identity === "captain" ? "is-active" : ""} aria-pressed={identity === "captain"} onClick={() => setIdentity("captain")}>归来的船长</button>
                <button type="button" className={identity === "pilgrim" ? "is-active" : ""} aria-pressed={identity === "pilgrim"} onClick={() => setIdentity("pilgrim")}>风暴朝圣者</button>
              </div>
            </div>
          </section>

          <details className="character-lab__references">
            <summary>
              <span><b>参考图校对</b><small>三面全身 / 面部特写 + 动作关键姿势</small></span>
              <i aria-hidden="true" />
            </summary>
            <div>
              <figure><img src={turnaroundUrl} alt="主角三面全身与面部特写参考" /><figcaption>形体、服装层级、武器比例；右侧结构为对称推断</figcaption></figure>
              <figure><img src={actionSheetUrl} alt="主角动作关键姿势参考" /><figcaption>轮廓、重心、动作语义</figcaption></figure>
            </div>
          </details>
        </aside>
      </section>

      <footer className="character-lab__footer">
        <span>CHARACTER LAB / BUILD 0.1</span>
        <p>验证重点：远景剪影、披风穿插、武器轨迹、动作起止姿势。非最终拓扑、绑定或材质。</p>
      </footer>
    </main>
  );
}

export default CharacterLab;
