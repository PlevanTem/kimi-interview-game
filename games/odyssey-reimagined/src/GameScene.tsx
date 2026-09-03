import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { GameState } from "./gameState";
import { Boat, C, EnemyModel, HarborEnvironment, HeroModel } from "./Models";

function useMovementKeys(enabled: boolean) {
  const keys = useRef<Record<string, boolean>>({});
  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (enabled) keys.current[event.code] = true;
    };
    const up = (event: KeyboardEvent) => { keys.current[event.code] = false; };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [enabled]);
  return keys;
}

function PlayerRig({ state, locked }: { state: GameState; locked: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const velocity = useRef(new THREE.Vector3());
  const keys = useMovementKeys(state.phase === "shore" || state.phase === "guard" || state.phase === "warden");
  const { camera } = useThree();
  const target = useMemo(() => new THREE.Vector3(), []);
  const desired = useMemo(() => new THREE.Vector3(), []);
  const forward = useMemo(() => new THREE.Vector3(), []);
  const side = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, delta) => {
    if (!ref.current) return;
    const inputX = (keys.current.KeyD || keys.current.ArrowRight ? 1 : 0) - (keys.current.KeyA || keys.current.ArrowLeft ? 1 : 0);
    const inputZ = (keys.current.KeyS || keys.current.ArrowDown ? 1 : 0) - (keys.current.KeyW || keys.current.ArrowUp ? 1 : 0);
    forward.set(0, 0, -1).applyQuaternion(camera.quaternion); forward.y = 0; forward.normalize();
    side.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
    const wanted = forward.multiplyScalar(-inputZ).add(side.multiplyScalar(inputX));
    if (wanted.lengthSq() > 0) wanted.normalize().multiplyScalar(state.dodging ? 9.2 : 3.8);
    velocity.current.lerp(wanted, 1 - Math.exp(-delta * 9));
    ref.current.position.addScaledVector(velocity.current, delta);
    ref.current.position.x = THREE.MathUtils.clamp(ref.current.position.x, -5.2, 5.2);
    ref.current.position.z = THREE.MathUtils.clamp(ref.current.position.z, -3.2, 7.0);
    if (locked && (state.phase === "guard" || state.phase === "warden")) {
      ref.current.rotation.y = Math.atan2(-ref.current.position.x, -1.1 - ref.current.position.z);
      target.set(ref.current.position.x * 0.4, 1.15, (ref.current.position.z - 1.1) * 0.5);
      desired.set(target.x + 6.2, 5.4, target.z + 7.2);
    } else {
      if (wanted.lengthSq() > 0.01) ref.current.rotation.y = Math.atan2(wanted.x, wanted.z);
      target.copy(ref.current.position).add(new THREE.Vector3(0, 1.05, -0.8));
      desired.copy(ref.current.position).add(new THREE.Vector3(6.6, 6.4, 9.6));
    }
    camera.position.lerp(desired, 1 - Math.exp(-delta * 3.2));
    camera.lookAt(target);
  });

  return (
    <group ref={ref} position={[0, 0.1, 5.2]}>
      <HeroModel action={state.action} actionSerial={state.actionSerial} identity={state.identity} />
    </group>
  );
}

function Atmosphere({ state }: { state: GameState }) {
  const points = useRef<THREE.Points>(null);
  const count = 110;
  const positions = useMemo(() => {
    const data = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      data[i * 3] = ((i * 19) % 37) - 18;
      data[i * 3 + 1] = 0.6 + ((i * 13) % 41) * 0.17;
      data[i * 3 + 2] = ((i * 29) % 39) - 18;
    }
    return data;
  }, []);
  useFrame(({ clock }) => {
    if (points.current) points.current.rotation.y = clock.elapsedTime * 0.006;
  });
  return (
    <points ref={points}>
      <bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry>
      <pointsMaterial color={state.phase === "warden" ? C.gold : C.cyan} size={0.035} transparent opacity={0.42} depthWrite={false} />
    </points>
  );
}

function World({ state, locked }: { state: GameState; locked: boolean }) {
  const enemyVisible = state.phase === "guard" || state.phase === "warden" || state.phase === "resolution" || (state.phase === "paused" && state.enemy.kind !== "none");
  return (
    <>
      <color attach="background" args={[state.highContrast ? "#041b20" : "#0b3438"]} />
      <fog attach="fog" args={[state.highContrast ? "#13383a" : "#7e987f", 11, 34]} />
      <ambientLight intensity={0.95} color="#a7cfca" />
      <hemisphereLight intensity={1.45} color="#f4d59b" groundColor="#12383c" />
      <directionalLight castShadow position={[8, 12, 7]} intensity={2.8} color="#ffd495" shadow-mapSize={[1024, 1024]} shadow-camera-left={-14} shadow-camera-right={14} shadow-camera-top={14} shadow-camera-bottom={-14} />
      <HarborEnvironment phase={state.phase} />
      <Boat active={state.phase === "title" || state.phase === "success"} />
      {state.phase !== "title" && <PlayerRig state={state} locked={locked} />}
      {enemyVisible && <group position={[0, 0.1, -1.1]}><EnemyModel enemy={state.enemy} highContrast={state.highContrast} /></group>}
      <Atmosphere state={state} />
    </>
  );
}

export function GameScene({ state, locked }: { state: GameState; locked: boolean }) {
  return (
    <Canvas shadows dpr={[1, 1.65]} camera={{ position: [7, 6.2, 10], fov: 43, near: 0.1, far: 90 }} gl={{ antialias: true, powerPreference: "high-performance" }}>
      <Suspense fallback={null}><World state={state} locked={locked} /></Suspense>
    </Canvas>
  );
}
