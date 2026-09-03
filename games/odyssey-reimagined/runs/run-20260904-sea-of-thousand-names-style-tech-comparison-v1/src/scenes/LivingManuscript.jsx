import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import RouteControls from "../components/RouteControls";

function InkLine({ points, color = "#34271f", width = 1 }) {
  const geometry = useMemo(() => new THREE.BufferGeometry().setFromPoints(points.map((point) => new THREE.Vector3(...point))), [points]);
  return (
    <line geometry={geometry}>
      <lineBasicMaterial color={color} linewidth={width} />
    </line>
  );
}

function PaperPort({ world }) {
  const folio = useRef();
  const ion = useRef();
  const seal = useRef();
  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    folio.current.rotation.z = Math.sin(time * 0.32) * 0.004;
    ion.current.position.x = -1.9 + Math.sin(time * 0.3) * 0.3;
    seal.current.rotation.z = Math.sin(time * 0.8) * 0.08;
    seal.current.scale.setScalar(world.observed ? 1.18 : 0.9);
  });

  const paper = "#e8d8af";
  const ink = "#34271f";
  const red = "#9d4437";
  const blue = "#356b70";
  const gold = "#b28b45";

  return (
    <group ref={folio}>
      <color attach="background" args={["#5a4535"]} />
      <ambientLight intensity={2.6} />
      <directionalLight position={[-4, 7, 8]} intensity={2.2} color="#ffe7b3" />
      <mesh position={[0, 0, -0.8]} receiveShadow>
        <boxGeometry args={[12, 7.4, 0.16]} />
        <meshStandardMaterial color={paper} roughness={1} />
      </mesh>
      <mesh position={[0.15, -0.1, -0.68]} rotation={[0, 0, -0.015]}>
        <planeGeometry args={[11.45, 6.85]} />
        <meshBasicMaterial color="#dfc99a" />
      </mesh>
      <group position={[0, -0.15, -0.35]}>
        <mesh position={[0, -2.35, 0]} rotation={[-Math.PI / 2.1, 0, 0]}>
          <planeGeometry args={[10.4, 2.5]} />
          <meshBasicMaterial color={blue} transparent opacity={0.78} />
        </mesh>
        <mesh position={[-3.55, 0.2, 0]}>
          <boxGeometry args={[2.4, 3.5, 0.2]} />
          <meshBasicMaterial color="#b99462" />
        </mesh>
        <mesh position={[-3.55, 2.08, 0]} rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[1.7, 1.7, 0.19]} />
          <meshBasicMaterial color={red} />
        </mesh>
        <mesh position={[3.5, 0.35, 0]}>
          <boxGeometry args={[2.3, 3.25, 0.2]} />
          <meshBasicMaterial color="#ad885c" />
        </mesh>
        <mesh position={[1.85, 0.3, 0.08]}>
          <ringGeometry args={[0.82, 1.05, 32]} />
          <meshBasicMaterial color={world.identity === "pilgrim" ? blue : gold} side={THREE.DoubleSide} />
        </mesh>
        {Array.from({ length: 5 }, (_, index) => (
          <mesh key={index} position={[0.1, -0.9 - index * 0.38, 0.04]}>
            <planeGeometry args={[3.7 - index * 0.32, 0.31]} />
            <meshBasicMaterial color="#d1b57c" />
          </mesh>
        ))}
        <group position={[0.15, -1.95, 0.1]}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <capsuleGeometry args={[0.28, 2.7, 4, 8]} />
            <meshBasicMaterial color={ink} />
          </mesh>
          <mesh position={[0, 1.45, 0]}>
            <boxGeometry args={[0.08, 2.4, 0.08]} />
            <meshBasicMaterial color={ink} />
          </mesh>
          <mesh position={[0.65, 1.45, 0.02]}>
            <planeGeometry args={[1.25, 1.55]} />
            <meshBasicMaterial color="#ede0b8" side={THREE.DoubleSide} />
          </mesh>
        </group>
        <group position={[-0.7, -0.65, 0.18]}>
          <mesh position={[0, 0.45, 0]}>
            <planeGeometry args={[0.58, 1.25]} />
            <meshBasicMaterial color="#273b4a" />
          </mesh>
          <mesh position={[0, 1.22, 0]}>
            <circleGeometry args={[0.24, 12]} />
            <meshBasicMaterial color="#a66e4f" />
          </mesh>
        </group>
        <group ref={ion} position={[-1.9, -0.15, 0.16]}>
          <mesh position={[0, 0.4, 0]}><planeGeometry args={[0.5, 1.1]} /><meshBasicMaterial color={red} /></mesh>
          <mesh position={[0, 1.06, 0]}><circleGeometry args={[0.21, 12]} /><meshBasicMaterial color="#a66e4f" /></mesh>
          <mesh position={[0, 1.55, 0]}><ringGeometry args={[0.22, 0.3, 3]} /><meshBasicMaterial color={gold} /></mesh>
        </group>
        <group ref={seal} position={[-2.6, 0.45, 0.2]}>
          <mesh><circleGeometry args={[0.38, 18]} /><meshBasicMaterial color={red} /></mesh>
          <mesh position={[0, 0, 0.01]}><ringGeometry args={[0.14, 0.23, 8]} /><meshBasicMaterial color="#edcf8d" /></mesh>
        </group>
        <InkLine points={[[-5.1, 2.75, 0.2], [-4.4, 2.45, 0.2], [-4.8, 2.1, 0.2]]} color={red} />
        <InkLine points={[[2.35, 2.5, 0.2], [3.0, 2.85, 0.2], [3.55, 2.5, 0.2], [4.1, 2.85, 0.2]]} color={blue} />
        <InkLine points={[[-4.7, -1.2, 0.2], [-3.4, -1.45, 0.2], [-2.2, -1.18, 0.2]]} />
      </group>
    </group>
  );
}

function LivingManuscript({ world, actions }) {
  return (
    <div className="scene-layout manuscript-layout" data-testid="scene-manuscript">
      <div className="canvas-stage manuscript-stage">
        <Canvas orthographic camera={{ position: [0, 0.2, 12], zoom: 69, near: 0.1, far: 30 }}>
          <PaperPort world={world} />
        </Canvas>
        <div className="folio-number">FOLIO<br /><strong>XVII</strong></div>
        <div className="ink-title"><span>盐岬港志</span><strong>归潮号被扣之日</strong></div>
        <div className="margin-note left-note">此门只认<br />公开的名字</div>
        <div className="margin-note right-note">伊翁将在<br />第四潮钟离港</div>
      </div>
      <aside className="route-panel manuscript-panel">
        <div className="chapter-mark"><span>第三章</span><h2>名字写在门上，<br />债写在人身上。</h2></div>
        <div className="manuscript-rule" />
        <div className="scribe-entry">
          <small>边注 · 可核查事实</small>
          <p className={world.observed ? "written" : "faded"}>{world.observed ? "执政官家族持有另一半客符，因此欠来者一次款待。" : "尚未检查断裂客符，此处留白。"}</p>
        </div>
        <div className="wax-claims">
          <button onClick={() => actions.claim("captain")} className={world.identity === "captain" ? "wax selected" : "wax"}><i>Κ</i><span>归来的船长</span><small>可申诉船只</small></button>
          <button onClick={() => actions.claim("pilgrim")} className={world.identity === "pilgrim" ? "wax selected blue" : "wax blue"}><i>Θ</i><span>无名朝圣者</span><small>可进入神庙</small></button>
        </div>
        <div className="rumor-script"><small>伊翁的行记</small><p>{world.rumor}</p></div>
        <RouteControls world={world} actions={actions} variant="manuscript" />
      </aside>
    </div>
  );
}

export default LivingManuscript;
