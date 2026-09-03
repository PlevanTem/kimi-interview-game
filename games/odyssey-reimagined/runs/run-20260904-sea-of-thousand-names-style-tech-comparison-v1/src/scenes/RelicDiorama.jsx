import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import RouteControls from "../components/RouteControls";

const palette = {
  void: "#0d2021",
  stone: "#c7a66f",
  shadow: "#493e35",
  coral: "#bb6048",
  teal: "#2d7a75",
  gold: "#d5ae54",
  sea: "#173e48",
  ink: "#17272a",
};

function Block({ position, scale, color = palette.stone }) {
  return (
    <mesh position={position} scale={scale} castShadow receiveShadow>
      <boxGeometry />
      <meshStandardMaterial color={color} roughness={0.88} flatShading />
    </mesh>
  );
}

function Actor({ position, color, marker }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.58, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.34, 0.9, 6]} />
        <meshStandardMaterial color={color} flatShading />
      </mesh>
      <mesh position={[0, 1.14, 0]} castShadow>
        <sphereGeometry args={[0.22, 8, 6]} />
        <meshStandardMaterial color="#dfbd88" flatShading />
      </mesh>
      <mesh position={[0, 1.65, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.24, 0.34, 3]} />
        <meshBasicMaterial color={marker} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function RelicWorld({ world }) {
  const harborRef = useRef();
  const sealRef = useRef();
  const seaGeometry = useMemo(() => new THREE.PlaneGeometry(24, 18, 24, 18), []);

  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    harborRef.current.rotation.y = Math.sin(time * 0.18) * 0.018;
    sealRef.current.rotation.y = time * 0.65;
    sealRef.current.position.y = 1.28 + Math.sin(time * 2) * 0.08;
    const factor = world.observed ? 1.2 : 0.82;
    sealRef.current.scale.setScalar(factor);
    const positions = seaGeometry.attributes.position;
    for (let index = 0; index < positions.count; index += 1) {
      positions.setZ(index, Math.sin(index * 1.7 + time) * 0.07);
    }
    positions.needsUpdate = true;
  });

  return (
    <>
      <color attach="background" args={[palette.void]} />
      <fog attach="fog" args={[palette.void, 14, 28]} />
      <ambientLight intensity={1.5} color="#91b8aa" />
      <directionalLight position={[-7, 11, -6]} intensity={3.4} color="#ffd58c" castShadow shadow-mapSize={[1024, 1024]} />
      <group ref={harborRef} rotation={[0, -0.18, 0]}>
        <mesh position={[0, -0.42, 0]} receiveShadow>
          <cylinderGeometry args={[6.4, 7.1, 0.8, 7]} />
          <meshStandardMaterial color={palette.shadow} roughness={1} flatShading />
        </mesh>
        <mesh position={[0, 0.02, -0.35]} receiveShadow>
          <cylinderGeometry args={[5.85, 6.1, 0.18, 7]} />
          <meshStandardMaterial color={palette.stone} roughness={1} flatShading />
        </mesh>
        <Block position={[-3.6, 1.0, 0.2]} scale={[1.6, 2.1, 1.8]} />
        <Block position={[-2.1, 0.72, -2.8]} scale={[1.3, 1.55, 1.4]} color={palette.coral} />
        <Block position={[3.45, 1.15, 0.45]} scale={[1.75, 2.4, 2.0]} color={palette.shadow} />
        <Block position={[1.9, 0.62, -2.85]} scale={[1.6, 1.35, 1.5]} />
        {Array.from({ length: 5 }, (_, index) => (
          <Block key={index} position={[0.4, 0.12 + index * 0.08, 1.7 + index * 0.58]} scale={[2.1, 0.16, 0.52]} />
        ))}
        <mesh position={[3.05, 1.08, -1.35]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <torusGeometry args={[0.88, 0.18, 8, 24]} />
          <meshStandardMaterial color={world.identity === "pilgrim" ? palette.teal : palette.gold} emissive={palette.teal} emissiveIntensity={0.18} flatShading />
        </mesh>
        <group position={[0.7, 0.18, 4.7]} rotation={[0, 0.25, 0]}>
          <mesh rotation={[0, 0, Math.PI / 2]} scale={[0.7, 1.9, 0.8]} castShadow>
            <cylinderGeometry args={[0.45, 0.7, 3.0, 5]} />
            <meshStandardMaterial color={palette.ink} flatShading />
          </mesh>
          <Block position={[0, 1.9, 0]} scale={[0.09, 3.3, 0.09]} color={palette.gold} />
          <mesh position={[0.06, 2.25, 0]} rotation={[0, Math.PI / 2, 0]}>
            <planeGeometry args={[2.4, 1.6]} />
            <meshBasicMaterial color="#e6c98c" side={THREE.DoubleSide} />
          </mesh>
        </group>
        <Actor position={[-0.8, 0.08, -0.65]} color="#20364a" marker={palette.gold} />
        <Actor position={[1.2, 0.08, 1.2]} color={palette.teal} marker={palette.teal} />
        <Actor position={[-1.75, 0.08, 1.45]} color={palette.coral} marker={palette.coral} />
        <group ref={sealRef} position={[-1.75, 1.25, -2.15]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.36, 0.36, 0.15, 8]} />
            <meshStandardMaterial color={palette.gold} emissive={palette.gold} emissiveIntensity={world.observed ? 0.8 : 0.12} flatShading />
          </mesh>
          <pointLight intensity={world.observed ? 5 : 0.8} distance={3} color={palette.gold} />
        </group>
      </group>
      <mesh geometry={seaGeometry} position={[0, -0.75, 8]} rotation={[-Math.PI / 2, 0, 0]}>
        <meshStandardMaterial color={palette.sea} roughness={0.42} metalness={0.08} flatShading />
      </mesh>
    </>
  );
}

function RelicDiorama({ world, actions }) {
  return (
    <div className="scene-layout relic-layout" data-testid="scene-relic">
      <div className="canvas-stage relic-stage">
        <Canvas orthographic shadows camera={{ position: [10, 10, 10], zoom: 57, near: 0.1, far: 80 }}>
          <RelicWorld world={world} />
        </Canvas>
        <div className="relic-compass"><span>潮</span><i /><b>Ⅲ</b></div>
        <div className="topology-key">
          <span><i className="captain" />船长权限</span>
          <span><i className="pilgrim" />朝圣者权限</span>
          <span><i className="witness" />见证者路径</span>
        </div>
        <div className="relic-objective"><small>目标拓扑</small><strong>客符 → 船印 → 潮门 → 归潮号</strong></div>
      </div>
      <aside className="route-panel relic-panel">
        <div className="relic-header">
          <span className="relic-glyph">ϟ</span>
          <div><small>盐岬港 / 遗物匣 07</small><h2>谁有资格穿过潮门？</h2></div>
        </div>
        <div className="token-grid">
          <button className={world.observed ? "token active" : "token"} onClick={actions.observe}>
            <span className="token-shape broken" /><small>证据</small><strong>断裂客符</strong>
          </button>
          <div className={`token ${world.identity ? "active" : ""}`}>
            <span className="token-shape mask" /><small>公开身份</small><strong>{world.identity === "captain" ? "归来船长" : world.identity === "pilgrim" ? "无名朝圣者" : "未放置"}</strong>
          </div>
          <div className="token active">
            <span className="token-shape eye" /><small>移动见证</small><strong>伊翁 · 第 {world.sunset} 阶段</strong>
          </div>
          <div className="token danger">
            <span className="token-shape gate" /><small>门槛</small><strong>{world.identity ? "条件已改变" : "封闭"}</strong>
          </div>
        </div>
        <div className="rumor-strip"><small>将被带走的说法</small><p>{world.rumor}</p></div>
        <RouteControls world={world} actions={actions} variant="relic" />
      </aside>
    </div>
  );
}

export default RelicDiorama;
