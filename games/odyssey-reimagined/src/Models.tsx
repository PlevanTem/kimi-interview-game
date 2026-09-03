import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { ActionName, EnemyState, Identity } from "./gameState";
import { HeroCharacterModel, type HeroLabAction } from "./HeroCharacterModel";

const C = {
  teal: "#0d4144",
  deep: "#082e33",
  salt: "#eee1c5",
  cyan: "#53d8cf",
  ochre: "#d99a4e",
  gold: "#f0c36a",
  bronze: "#55756e",
  wood: "#6d4a32",
  danger: "#d96852",
};

const heroActionMap: Record<ActionName, HeroLabAction> = {
  idle: "idle_neutral",
  observe: "observe",
  light: "light_1",
  heavy: "heavy",
  dodge: "dodge",
  parry: "parry",
  namebreak: "namebreak",
  hit: "hit",
};

export function HeroModel({ action, actionSerial, identity }: { action: ActionName; actionSerial: number; identity: Identity | null }) {
  return (
    <HeroCharacterModel
      action={heroActionMap[action]}
      actionSerial={actionSerial}
      identity={identity}
      scale={0.76}
      showWeaponTrail
    />
  );
}

function ThreadArc({ index, active }: { index: number; active: boolean }) {
  const curve = useMemo(() => {
    const y = 1.1 + index * 0.34;
    return new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, y, 0), new THREE.Vector3(-0.95 - index * 0.18, y + 0.65, 0.35), new THREE.Vector3(-1.55, 0.95 + index * 0.22, 0));
  }, [index]);
  if (!active) return null;
  return (
    <mesh>
      <tubeGeometry args={[curve, 28, 0.022, 6, false]} />
      <meshBasicMaterial color={C.cyan} toneMapped={false} />
    </mesh>
  );
}

export function EnemyModel({ enemy, highContrast }: { enemy: EnemyState; highContrast: boolean }) {
  const root = useRef<THREE.Group>(null);
  const weapon = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!root.current || !weapon.current) return;
    const t = clock.elapsedTime;
    root.current.position.y = Math.sin(t * 1.45) * 0.025;
    const urgency = enemy.telegraph === "parryable" ? Math.min(1, (Math.sin(t * 8) + 1) / 2) : 0;
    weapon.current.rotation.z = -0.42 - urgency * 0.72;
  });
  const isWarden = enemy.kind === "warden";
  const signal = enemy.telegraph === "ring" ? C.gold : enemy.telegraph === "parryable" ? C.cyan : C.bronze;
  const emissive = highContrast && enemy.telegraph !== "none" ? 2.2 : 0.75;
  if (enemy.kind === "none") return null;
  return (
    <group ref={root} scale={isWarden ? 1.18 : 0.93}>
      <mesh position={[0, 1.14, 0]} scale={[0.72, 0.98, 0.45]} castShadow>
        <sphereGeometry args={[0.7, 10, 8]} />
        <meshStandardMaterial color={C.bronze} roughness={0.7} metalness={0.28} />
      </mesh>
      {[0.73, 1.03, 1.33].map((y, i) => (
        <mesh key={y} position={[0, y, 0.38 + i * 0.01]} scale={[0.84 - i * 0.08, 0.16, 0.13]} castShadow>
          <boxGeometry />
          <meshStandardMaterial color={i === 1 ? C.teal : C.salt} roughness={0.82} />
        </mesh>
      ))}
      <mesh position={[0, 1.93, 0]} castShadow>
        <dodecahedronGeometry args={[0.35, 0]} />
        <meshStandardMaterial color={C.salt} roughness={0.76} />
      </mesh>
      <mesh position={[0, 1.95, 0.32]} scale={[0.72, 1.1, 0.15]} castShadow>
        <sphereGeometry args={[0.36, 8, 6]} />
        <meshStandardMaterial color="#d9d0b7" roughness={0.75} />
      </mesh>
      <mesh position={[-0.11, 1.99, 0.45]}><sphereGeometry args={[0.045, 8, 6]} /><meshBasicMaterial color={signal} toneMapped={false} /></mesh>
      <mesh position={[0.11, 1.99, 0.45]}><sphereGeometry args={[0.045, 8, 6]} /><meshBasicMaterial color={signal} toneMapped={false} /></mesh>
      <group ref={weapon} position={[0.72, 1.28, 0]} rotation={[0, 0, -0.42]}>
        <mesh position={[0, -0.75, 0]} castShadow><cylinderGeometry args={[0.06, 0.075, 2.15, 8]} /><meshStandardMaterial color={C.wood} /></mesh>
        <mesh position={[0, -1.87, 0]} scale={[0.28, 0.54, 0.12]} castShadow><boxGeometry /><meshStandardMaterial color={C.bronze} metalness={0.35} roughness={0.5} /></mesh>
      </group>
      {isWarden && [0, 1, 2].map((i) => (
        <group key={i} position={[0, 1.18, 0]} rotation={[Math.PI / 2 + i * 0.22, 0.25 * i, 0]}>
          <mesh><torusGeometry args={[0.92 + i * 0.2, 0.028, 6, 42]} /><meshStandardMaterial color={signal} emissive={signal} emissiveIntensity={emissive} /></mesh>
        </group>
      ))}
      {[0, 1, 2].map((i) => <ThreadArc key={i} index={i} active={enemy.threads > i} />)}
      {enemy.telegraph === "ring" && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
          <ringGeometry args={[1.55, 1.68, 48]} />
          <meshBasicMaterial color={C.gold} transparent opacity={0.9} side={THREE.DoubleSide} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
}

function SaltColumn({ x, z, height = 4.2, broken = false }: { x: number; z: number; height?: number; broken?: boolean }) {
  return (
    <group position={[x, 0, z]} rotation={[0, x * 0.017, broken ? 0.05 : 0]}>
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.44, 0.58, height, 7]} />
        <meshStandardMaterial color={C.salt} roughness={0.94} />
      </mesh>
      <mesh position={[0, height + 0.12, 0]} scale={[1.4, 0.26, 1.4]} castShadow><boxGeometry /><meshStandardMaterial color="#d8c9a9" roughness={0.92} /></mesh>
    </group>
  );
}

export function HarborEnvironment({ phase }: { phase: string }) {
  const battle = phase === "guard" || phase === "warden" || phase === "resolution";
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[26, 64]} />
        <meshStandardMaterial color="#bda77e" roughness={1} />
      </mesh>
      <mesh position={[0, -0.22, -12]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[70, 35, 1, 1]} />
        <meshStandardMaterial color={C.deep} roughness={0.52} metalness={0.12} />
      </mesh>
      <mesh position={[0, 0.025, 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3.3, 17]} />
        <meshStandardMaterial color={C.ochre} emissive={C.ochre} emissiveIntensity={battle ? 0.04 : 0.12} roughness={0.9} />
      </mesh>
      {[-7.5, 7.5].flatMap((x) => [-7, -1, 5].map((z, i) => <SaltColumn key={`${x}-${z}`} x={x} z={z} height={3.5 + i * 0.8} broken={i === 1} />))}
      <group position={[0, 0, -6]}>
        <SaltColumn x={-3.2} z={0} height={6.5} />
        <SaltColumn x={3.2} z={0} height={6.5} />
        <mesh position={[0, 5.8, 0]} scale={[5.8, 0.7, 1]} castShadow><boxGeometry /><meshStandardMaterial color={C.salt} roughness={0.9} /></mesh>
        <mesh position={[0, 2.2, 0]} scale={[4.4, 4.4, 0.45]} castShadow><torusGeometry args={[1, 0.2, 10, 32, Math.PI]} /><meshStandardMaterial color="#d1bd93" roughness={0.92} /></mesh>
      </group>
      {[-4.5, 4.5].map((x) => (
        <group key={x} position={[x, 2.7, -2]}>
          <mesh rotation={[0, 0, x < 0 ? 0.12 : -0.12]} castShadow>
            <planeGeometry args={[1.7, 4.8, 3, 6]} />
            <meshStandardMaterial color={C.teal} roughness={0.95} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, 0, 0.04]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.37, 0.035, 6, 24]} /><meshBasicMaterial color={C.gold} /></mesh>
        </group>
      ))}
      {[[-1.15, 5.7], [0, 5.25], [1.15, 5.7]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.08, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.18 + i * 0.05, 0.25 + i * 0.05, 20]} />
          <meshBasicMaterial color={C.cyan} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

export function Boat({ active = false }: { active?: boolean }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.z = Math.sin(clock.elapsedTime * 0.9) * 0.035;
    ref.current.position.y = 0.7 + Math.sin(clock.elapsedTime * 1.3) * 0.06;
    if (active) ref.current.position.x = Math.sin(clock.elapsedTime * 0.22) * 0.4;
  });
  return (
    <group ref={ref} position={[0, 0.7, -10]}>
      <mesh scale={[1.7, 0.42, 3.1]} rotation={[0, 0, 0]} castShadow><sphereGeometry args={[0.72, 10, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} /><meshStandardMaterial color={C.wood} roughness={0.86} side={THREE.DoubleSide} /></mesh>
      <mesh position={[0, 2.0, 0]}><cylinderGeometry args={[0.05, 0.08, 4, 8]} /><meshStandardMaterial color={C.wood} /></mesh>
      <mesh position={[0.02, 2.45, 0]} rotation={[0, 0.08, 0]}>
        <planeGeometry args={[2.7, 3.1]} />
        <meshStandardMaterial color={C.teal} roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

export { C };
