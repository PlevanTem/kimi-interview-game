import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Identity } from "./gameState";

export const HERO_LAB_ACTIONS = [
  { id: "idle_neutral", label: "中立待机", category: "待机" },
  { id: "idle_combat", label: "战斗待机", category: "待机" },
  { id: "locomotion_walk", label: "行走", category: "移动" },
  { id: "locomotion_run", label: "奔跑", category: "移动" },
  { id: "observe", label: "观察", category: "叙事" },
  { id: "light_1", label: "轻击一", category: "战斗" },
  { id: "light_2", label: "轻击二", category: "战斗" },
  { id: "heavy", label: "重击", category: "战斗" },
  { id: "dodge", label: "侧闪", category: "战斗" },
  { id: "parry", label: "精准招架", category: "战斗" },
  { id: "hit", label: "受击", category: "反馈" },
  { id: "namebreak", label: "拆名", category: "仪式" },
] as const;

export type HeroLabAction = (typeof HERO_LAB_ACTIONS)[number]["id"];

export interface HeroCharacterModelProps {
  action: HeroLabAction;
  actionSerial: number;
  wireframe?: boolean;
  showRig?: boolean;
  showWeaponTrail?: boolean;
  identity?: Identity | null;
  scale?: number;
}

type Vec3 = [number, number, number];

interface Pose {
  rootPosition: Vec3;
  rootRotation: Vec3;
  hipsRotation: Vec3;
  torsoRotation: Vec3;
  headRotation: Vec3;
  leftArmRotation: Vec3;
  leftForearmRotation: Vec3;
  rightArmRotation: Vec3;
  rightForearmRotation: Vec3;
  leftLegRotation: Vec3;
  leftShinRotation: Vec3;
  rightLegRotation: Vec3;
  rightShinRotation: Vec3;
  weaponRotation: Vec3;
}

const COLORS = {
  hair: "#191a1d",
  hairLight: "#27292d",
  skin: "#c98e62",
  skinLight: "#dda47a",
  eye: "#2b211b",
  iris: "#9b6a37",
  pupil: "#15110f",
  eyeGlint: "#fff4d7",
  teal: "#123f43",
  tealLight: "#1c5558",
  tealDeep: "#082b31",
  ivory: "#e8dcc1",
  ivoryShadow: "#cdbf9f",
  charcoal: "#393532",
  leather: "#5f402b",
  leatherDark: "#35271f",
  bronze: "#8b6538",
  gold: "#d99b45",
  ochre: "#d78f35",
  cyan: "#50ddd5",
  rig: "#ff4fa3",
};

function Surface({
  color,
  wireframe,
  metalness = 0,
  roughness = 0.82,
  emissive,
  emissiveIntensity = 0,
  side,
}: {
  color: string;
  wireframe: boolean;
  metalness?: number;
  roughness?: number;
  emissive?: string;
  emissiveIntensity?: number;
  side?: THREE.Side;
}) {
  return (
    <meshStandardMaterial
      color={color}
      wireframe={wireframe}
      flatShading
      metalness={metalness}
      roughness={roughness}
      emissive={emissive}
      emissiveIntensity={emissiveIntensity}
      side={side}
    />
  );
}

function RigMarker({ visible, size = 0.045 }: { visible: boolean; size?: number }) {
  if (!visible) return null;
  return (
    <mesh renderOrder={30}>
      <octahedronGeometry args={[size, 0]} />
      <meshBasicMaterial color={COLORS.rig} depthTest={false} toneMapped={false} />
    </mesh>
  );
}

function HairSpike({ position, rotation, scale, wireframe }: { position: Vec3; rotation: Vec3; scale: Vec3; wireframe: boolean }) {
  return (
    <mesh position={position} rotation={rotation} scale={scale} castShadow>
      <coneGeometry args={[0.16, 0.48, 4, 1]} />
      <Surface color={COLORS.hair} wireframe={wireframe} roughness={0.92} />
    </mesh>
  );
}

function Face({ wireframe }: { wireframe: boolean }) {
  return (
    <group>
      <mesh scale={[0.93, 1.04, 0.88]} castShadow>
        <icosahedronGeometry args={[0.43, 2]} />
        <Surface color={COLORS.skin} wireframe={wireframe} roughness={0.9} />
      </mesh>

      {[-0.135, 0.135].map((x) => (
        <group key={x} position={[x, 0.035, 0.374]}>
          <mesh scale={[1.0, 1.25, 0.35]}>
            <sphereGeometry args={[0.078, 10, 8]} />
            <Surface color={COLORS.eye} wireframe={wireframe} roughness={0.48} />
          </mesh>
          <mesh position={[0, -0.006, 0.032]} scale={[1, 1.12, 0.24]}>
            <sphereGeometry args={[0.047, 8, 6]} />
            <Surface color={COLORS.iris} wireframe={wireframe} roughness={0.5} />
          </mesh>
          <mesh position={[0, -0.008, 0.043]} scale={[1, 1.1, 0.22]}>
            <sphereGeometry args={[0.024, 7, 5]} />
            <Surface color={COLORS.pupil} wireframe={wireframe} roughness={0.42} />
          </mesh>
          <mesh position={[-0.018, 0.026, 0.057]}>
            <sphereGeometry args={[0.017, 6, 5]} />
            <meshBasicMaterial color={COLORS.eyeGlint} toneMapped={false} />
          </mesh>
          <mesh position={[0, 0.105, 0.025]} rotation={[0, 0, x < 0 ? -0.16 : 0.16]} scale={[1.8, 0.24, 0.25]}>
            <boxGeometry args={[0.095, 0.045, 0.045]} />
            <Surface color={COLORS.hair} wireframe={wireframe} roughness={0.94} />
          </mesh>
        </group>
      ))}

      <mesh position={[0, -0.055, 0.393]} rotation={[Math.PI / 2, 0, 0]} scale={[0.6, 0.8, 0.65]}>
        <coneGeometry args={[0.038, 0.085, 4]} />
        <Surface color={COLORS.skinLight} wireframe={wireframe} roughness={0.94} />
      </mesh>
      <mesh position={[0, -0.17, 0.399]} scale={[0.9, 0.16, 0.24]}>
        <sphereGeometry args={[0.075, 8, 5]} />
        <Surface color="#744f42" wireframe={wireframe} roughness={0.9} />
      </mesh>
    </group>
  );
}

const HAIR_SPIKES: ReadonlyArray<{ position: Vec3; rotation: Vec3; scale: Vec3 }> = [
  { position: [-0.28, 0.21, 0.22], rotation: [0.05, -0.2, 2.58], scale: [1.05, 1.05, 1.05] },
  { position: [-0.12, 0.3, 0.18], rotation: [0.08, -0.08, 2.94], scale: [1.12, 1.16, 1.05] },
  { position: [0.09, 0.32, 0.17], rotation: [0.1, 0.08, -2.94], scale: [1.1, 1.12, 1] },
  { position: [0.29, 0.2, 0.17], rotation: [0.05, 0.18, -2.52], scale: [1.05, 1.04, 1] },
  { position: [-0.31, 0.04, 0.27], rotation: [0, -0.16, 2.84], scale: [0.7, 0.78, 0.72] },
  { position: [-0.11, 0.2, 0.34], rotation: [0.02, -0.08, Math.PI], scale: [0.56, 0.68, 0.62] },
  { position: [0, 0.23, 0.38], rotation: [0.02, 0, Math.PI], scale: [0.32, 0.82, 0.55] },
  { position: [0.08, 0.2, 0.35], rotation: [0.02, 0.02, Math.PI], scale: [0.56, 0.7, 0.62] },
  { position: [0.29, 0.05, 0.3], rotation: [0.02, 0.14, -2.78], scale: [0.7, 0.8, 0.72] },
  { position: [-0.42, 0.05, -0.01], rotation: [0.22, 0.28, 1.92], scale: [0.9, 1.0, 0.94] },
  { position: [0.42, 0.07, -0.01], rotation: [-0.22, -0.28, -1.92], scale: [0.9, 1.0, 0.94] },
  { position: [-0.3, 0.19, -0.25], rotation: [0.32, 0.2, 2.25], scale: [0.95, 1.05, 1.0] },
  { position: [0.28, 0.2, -0.25], rotation: [-0.32, -0.2, -2.25], scale: [0.95, 1.05, 1.0] },
  { position: [0.02, 0.46, -0.06], rotation: [0.15, 0, -0.18], scale: [0.92, 1.05, 0.95] },
];

function Head({ wireframe, showRig }: { wireframe: boolean; showRig: boolean }) {
  return (
    <group>
      <Face wireframe={wireframe} />
      {/* Rear hair mass stays behind the face; the separate spikes form the readable fringe. */}
      <mesh position={[0, 0.2, -0.12]} scale={[1.05, 0.9, 0.72]} castShadow>
        <dodecahedronGeometry args={[0.45, 1]} />
        <Surface color={COLORS.hairLight} wireframe={wireframe} roughness={0.94} />
      </mesh>
      {HAIR_SPIKES.map((spike, index) => (
        <HairSpike key={index} {...spike} wireframe={wireframe} />
      ))}
      <mesh position={[-0.392, -0.02, 0]} scale={[0.48, 0.78, 0.38]}>
        <sphereGeometry args={[0.16, 8, 6]} />
        <Surface color={COLORS.skin} wireframe={wireframe} roughness={0.9} />
      </mesh>
      <mesh position={[0.392, -0.02, 0]} scale={[0.48, 0.78, 0.38]}>
        <sphereGeometry args={[0.16, 8, 6]} />
        <Surface color={COLORS.skin} wireframe={wireframe} roughness={0.9} />
      </mesh>
      <RigMarker visible={showRig} size={0.055} />
    </group>
  );
}

function ChestRune({ wireframe }: { wireframe: boolean }) {
  return (
    <group position={[0, 0.13, 0.348]}>
      <mesh rotation={[0, 0, Math.PI / 4]} scale={[0.11, 0.11, 0.035]}>
        <boxGeometry />
        <Surface color={COLORS.bronze} wireframe={wireframe} roughness={0.75} />
      </mesh>
      <mesh position={[0, 0, 0.022]} rotation={[0, 0, Math.PI / 4]} scale={[0.052, 0.052, 0.038]}>
        <boxGeometry />
        <Surface color={COLORS.ivory} wireframe={wireframe} roughness={0.9} />
      </mesh>
      <mesh position={[-0.09, -0.12, 0]} rotation={[0, 0, -0.72]} scale={[0.105, 0.025, 0.035]}>
        <boxGeometry />
        <Surface color={COLORS.bronze} wireframe={wireframe} roughness={0.8} />
      </mesh>
      <mesh position={[0.09, -0.12, 0]} rotation={[0, 0, 0.72]} scale={[0.105, 0.025, 0.035]}>
        <boxGeometry />
        <Surface color={COLORS.bronze} wireframe={wireframe} roughness={0.8} />
      </mesh>
    </group>
  );
}

function Buckle({ wireframe, accent }: { wireframe: boolean; accent: string }) {
  return (
    <group>
      <mesh rotation={[0, 0, Math.PI / 4]} scale={[0.14, 0.14, 0.055]} castShadow>
        <boxGeometry />
        <Surface color={accent} wireframe={wireframe} metalness={0.26} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0, 0.06]} rotation={[0, 0, Math.PI / 4]} scale={[0.065, 0.065, 0.04]}>
        <boxGeometry />
        <Surface color={COLORS.tealDeep} wireframe={wireframe} roughness={0.75} />
      </mesh>
    </group>
  );
}

function Torso({ wireframe, accent }: { wireframe: boolean; accent: string }) {
  return (
    <group>
      <mesh position={[0, 0.26, 0]} scale={[0.5, 0.56, 0.32]} castShadow>
        <dodecahedronGeometry args={[0.78, 0]} />
        <Surface color={COLORS.ivory} wireframe={wireframe} roughness={0.94} />
      </mesh>
      <ChestRune wireframe={wireframe} />

      <mesh position={[-0.06, 0.25, 0.37]} rotation={[0, 0, -0.64]} scale={[0.48, 0.055, 0.035]} castShadow>
        <boxGeometry />
        <Surface color={COLORS.leatherDark} wireframe={wireframe} roughness={0.92} />
      </mesh>

      <mesh position={[0, -0.08, 0]} scale={[0.56, 0.095, 0.35]} castShadow>
        <boxGeometry />
        <Surface color={COLORS.leatherDark} wireframe={wireframe} roughness={0.9} />
      </mesh>
      <group position={[0, -0.075, 0.37]} scale={0.72}>
        <Buckle wireframe={wireframe} accent={accent} />
      </group>
      <mesh position={[0.43, -0.22, 0.01]} scale={[0.18, 0.22, 0.14]} rotation={[0, 0, -0.08]} castShadow>
        <dodecahedronGeometry args={[0.7, 0]} />
        <Surface color={COLORS.leather} wireframe={wireframe} roughness={0.96} />
      </mesh>
      <mesh position={[0.43, -0.05, 0.02]} scale={[0.15, 0.035, 0.14]}>
        <boxGeometry />
        <Surface color={COLORS.gold} wireframe={wireframe} metalness={0.2} roughness={0.62} />
      </mesh>

      <mesh position={[0, -0.37, 0.13]} scale={[0.34, 0.42, 0.12]} rotation={[0.06, 0, 0]} castShadow>
        <octahedronGeometry args={[0.72, 0]} />
        <Surface color={COLORS.ivoryShadow} wireframe={wireframe} roughness={0.95} />
      </mesh>
      <mesh position={[0, -0.36, 0.255]} scale={[0.055, 0.14, 0.025]} rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry />
        <Surface color={COLORS.bronze} wireframe={wireframe} roughness={0.82} />
      </mesh>
    </group>
  );
}

function Mantle({ wireframe, accent }: { wireframe: boolean; accent: string }) {
  return (
    <group>
      {/* The mantle wraps the back and shoulders but leaves the tunic readable at the front. */}
      <mesh position={[0, 0.26, -0.015]} scale={[1, 0.88, 0.78]} castShadow>
        <coneGeometry args={[0.72, 0.68, 12, 1, true, 0.76, Math.PI * 2 - 1.52]} />
        <Surface color={COLORS.teal} wireframe={wireframe} roughness={0.95} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.55, -0.04]} rotation={[Math.PI / 2, 0, 0]} scale={[1.05, 0.82, 1]}>
        <torusGeometry args={[0.35, 0.095, 5, 12]} />
        <Surface color={COLORS.tealDeep} wireframe={wireframe} roughness={0.95} />
      </mesh>
      <mesh position={[-0.33, 0.16, 0.31]} rotation={[0, 0, -0.71]} scale={[0.34, 0.035, 0.03]}>
        <boxGeometry />
        <Surface color={accent} wireframe={wireframe} metalness={0.1} roughness={0.67} />
      </mesh>
      <mesh position={[0.33, 0.16, 0.31]} rotation={[0, 0, 0.71]} scale={[0.34, 0.035, 0.03]}>
        <boxGeometry />
        <Surface color={accent} wireframe={wireframe} metalness={0.1} roughness={0.67} />
      </mesh>
      <group position={[0, 0.42, 0.39]}>
        <Buckle wireframe={wireframe} accent={accent} />
      </group>
    </group>
  );
}

function Arm({
  side,
  wireframe,
  showRig,
  forearmRef,
  weapon,
}: {
  side: "left" | "right";
  wireframe: boolean;
  showRig: boolean;
  forearmRef: React.RefObject<THREE.Group | null>;
  weapon?: React.ReactNode;
}) {
  const xSign = side === "left" ? -1 : 1;
  return (
    <group>
      <RigMarker visible={showRig} />
      <mesh position={[0, -0.215, 0]} scale={[0.19, 0.28, 0.18]} castShadow>
        <dodecahedronGeometry args={[0.75, 0]} />
        <Surface color={COLORS.ivory} wireframe={wireframe} roughness={0.94} />
      </mesh>
      <group ref={forearmRef} position={[0, -0.43, 0]}>
        <RigMarker visible={showRig} />
        <mesh position={[0, -0.21, 0]} scale={[0.18, 0.27, 0.175]} castShadow>
          <dodecahedronGeometry args={[0.72, 0]} />
          <Surface color={COLORS.leatherDark} wireframe={wireframe} roughness={0.9} />
        </mesh>
        {[-0.06, -0.18, -0.3].map((y, index) => (
          <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, 0.9]}>
            <torusGeometry args={[0.135 - index * 0.009, 0.024, 4, 8]} />
            <Surface color={index === 1 ? COLORS.bronze : COLORS.leather} wireframe={wireframe} metalness={0.08} roughness={0.78} />
          </mesh>
        ))}
        <mesh position={[0, -0.48, 0.015]} scale={[0.16, 0.15, 0.145]} castShadow>
          <dodecahedronGeometry args={[0.72, 0]} />
          <Surface color={COLORS.skin} wireframe={wireframe} roughness={0.9} />
        </mesh>
        <mesh position={[xSign * 0.055, -0.48, 0.055]} rotation={[0, 0, -xSign * 0.25]} scale={[0.07, 0.12, 0.065]}>
          <boxGeometry />
          <Surface color={COLORS.leatherDark} wireframe={wireframe} roughness={0.92} />
        </mesh>
        {weapon}
      </group>
    </group>
  );
}

function Leg({
  wireframe,
  showRig,
  shinRef,
}: {
  wireframe: boolean;
  showRig: boolean;
  shinRef: React.RefObject<THREE.Group | null>;
}) {
  return (
    <group>
      <RigMarker visible={showRig} />
      <mesh position={[0, -0.22, 0]} scale={[0.25, 0.31, 0.235]} castShadow>
        <dodecahedronGeometry args={[0.78, 0]} />
        <Surface color={COLORS.charcoal} wireframe={wireframe} roughness={0.96} />
      </mesh>
      <mesh position={[0, -0.365, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.15, 0.032, 4, 8]} />
        <Surface color={COLORS.gold} wireframe={wireframe} metalness={0.12} roughness={0.7} />
      </mesh>
      <group ref={shinRef} position={[0, -0.43, 0]}>
        <RigMarker visible={showRig} />
        <mesh position={[0, -0.21, 0]} scale={[0.19, 0.29, 0.18]} castShadow>
          <dodecahedronGeometry args={[0.72, 0]} />
          <Surface color={COLORS.leatherDark} wireframe={wireframe} roughness={0.93} />
        </mesh>
        {[-0.08, -0.21].map((y) => (
          <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.14, 0.025, 4, 8]} />
            <Surface color={COLORS.leather} wireframe={wireframe} roughness={0.84} />
          </mesh>
        ))}
        <mesh position={[0, -0.41, 0.105]} scale={[0.21, 0.145, 0.34]} castShadow>
          <boxGeometry />
          <Surface color={COLORS.leather} wireframe={wireframe} roughness={0.88} />
        </mesh>
        <mesh position={[0, -0.395, 0.31]} scale={[0.17, 0.10, 0.12]} castShadow>
          <dodecahedronGeometry args={[0.72, 0]} />
          <Surface color={COLORS.bronze} wireframe={wireframe} metalness={0.12} roughness={0.76} />
        </mesh>
      </group>
    </group>
  );
}

function WeaponTrail({
  visible,
  attack,
  actionSerial,
}: {
  visible: boolean;
  attack: HeroLabAction;
  actionSerial: number;
}) {
  const trail = useRef<THREE.Group>(null);
  const startedAt = useRef<number | null>(null);

  useEffect(() => {
    startedAt.current = null;
    if (trail.current) trail.current.visible = false;
  }, [attack, actionSerial]);

  useFrame(({ clock }) => {
    if (!trail.current) return;
    if (startedAt.current === null) startedAt.current = clock.elapsedTime;
    const elapsed = clock.elapsedTime - startedAt.current;
    const attackSupportsTrail = ["light_1", "light_2", "heavy", "parry"].includes(attack);
    const end = attack === "heavy" ? 0.82 : 0.6;
    trail.current.visible = visible && attackSupportsTrail && elapsed >= 0.1 && elapsed <= end;
  });

  return (
    <group ref={trail} position={[0.12, -0.58, -0.03]} rotation={[0, 0, -0.45]} visible={false}>
      <mesh>
        <torusGeometry args={[0.78, 0.035, 6, 40, Math.PI * 0.82]} />
        <meshBasicMaterial color={COLORS.cyan} transparent opacity={0.56} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, -0.012]} scale={0.92}>
        <torusGeometry args={[0.78, 0.018, 5, 40, Math.PI * 0.82]} />
        <meshBasicMaterial color="#d7fffb" transparent opacity={0.74} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

function OarWeapon({
  wireframe,
  accent,
  showTrail,
  attack,
  actionSerial,
}: {
  wireframe: boolean;
  accent: string;
  showTrail: boolean;
  attack: HeroLabAction;
  actionSerial: number;
}) {
  return (
    <group position={[0, 0.45, 0.02]}>
      <mesh position={[0, -0.38, 0]} castShadow>
        <cylinderGeometry args={[0.045, 0.055, 0.82, 8]} />
        <Surface color={COLORS.leatherDark} wireframe={wireframe} roughness={0.88} />
      </mesh>
      {[-0.15, -0.36, -0.58].map((y) => (
        <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.063, 0.012, 4, 8]} />
          <Surface color={COLORS.gold} wireframe={wireframe} metalness={0.32} roughness={0.54} />
        </mesh>
      ))}
      <mesh position={[0, -0.93, 0]} scale={[0.28, 0.42, 0.09]} rotation={[0, 0, Math.PI / 4]} castShadow>
        <octahedronGeometry args={[0.72, 0]} />
        <Surface color={COLORS.ivory} wireframe={wireframe} metalness={0.08} roughness={0.72} />
      </mesh>
      <mesh position={[0, -0.93, 0.095]} scale={[0.12, 0.25, 0.035]} rotation={[0, 0, Math.PI / 4]}>
        <octahedronGeometry args={[0.72, 0]} />
        <Surface color={COLORS.tealLight} wireframe={wireframe} metalness={0.18} roughness={0.54} emissive={accent} emissiveIntensity={0.12} />
      </mesh>
      <mesh position={[0, -0.93, 0.135]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.12, 0.014, 4, 8]} />
        <meshBasicMaterial color={accent} toneMapped={false} wireframe={wireframe} />
      </mesh>

      <WeaponTrail visible={showTrail && !wireframe} attack={attack} actionSerial={actionSerial} />
    </group>
  );
}

function CapePanel({ wireframe, accent, offset = 0 }: { wireframe: boolean; accent: string; offset?: number }) {
  return (
    <group>
      <mesh position={[0, -0.52, 0]} scale={[1, 1, 0.36]} castShadow>
        <cylinderGeometry args={[0.22, 0.42, 1.18, 4, 1]} />
        <Surface color={offset === 0 ? COLORS.teal : COLORS.tealLight} wireframe={wireframe} roughness={0.96} />
      </mesh>
      <mesh position={[0, -0.94, 0.13]} rotation={[0, 0, offset * 0.08]} scale={[0.25, 0.035, 0.025]}>
        <boxGeometry />
        <Surface color={accent} wireframe={wireframe} metalness={0.08} roughness={0.68} />
      </mesh>
      <mesh position={[offset * 0.08, -0.63, 0.135]} rotation={[0, 0, Math.PI / 4]} scale={[0.07, 0.07, 0.025]}>
        <boxGeometry />
        <Surface color={accent} wireframe={wireframe} roughness={0.72} />
      </mesh>
    </group>
  );
}

function GoldenTail({ wireframe, accent }: { wireframe: boolean; accent: string }) {
  const ribbonShape = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-0.05, 0.16);
    shape.bezierCurveTo(0.2, 0.11, 0.4, -0.08, 0.59, -0.28);
    shape.bezierCurveTo(0.72, -0.42, 0.88, -0.48, 1.03, -0.45);
    shape.lineTo(0.88, -0.64);
    shape.bezierCurveTo(0.7, -0.62, 0.56, -0.52, 0.43, -0.38);
    shape.bezierCurveTo(0.25, -0.18, 0.11, -0.05, -0.08, 0);
    shape.closePath();
    return shape;
  }, []);

  return (
    <group>
      <mesh position={[0, 0, -0.025]} castShadow>
        <extrudeGeometry args={[ribbonShape, { depth: 0.05, bevelEnabled: false, steps: 1 }]} />
        <Surface color={COLORS.ochre} wireframe={wireframe} roughness={0.9} />
      </mesh>
      <mesh position={[0.56, -0.3, 0.052]} rotation={[0, 0, Math.PI / 4]} scale={[0.065, 0.065, 0.025]}>
        <boxGeometry />
        <Surface color={accent} wireframe={wireframe} roughness={0.72} />
      </mesh>
    </group>
  );
}

function ObservationCrystal({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <group position={[-0.56, 1.55, 0.52]}>
      <mesh>
        <octahedronGeometry args={[0.11, 0]} />
        <meshStandardMaterial color="#d9fffb" emissive={COLORS.cyan} emissiveIntensity={2.2} roughness={0.22} toneMapped={false} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.2, 0.012, 4, 20]} />
        <meshBasicMaterial color={COLORS.cyan} transparent opacity={0.62} toneMapped={false} depthWrite={false} />
      </mesh>
    </group>
  );
}

function NameThreads({ visible }: { visible: boolean }) {
  const curves = useMemo(
    () =>
      [-0.12, 0, 0.12].map((offset, index) =>
        new THREE.CatmullRomCurve3([
          new THREE.Vector3(-0.48, 1.52 + offset, 0.32),
          new THREE.Vector3(-0.92, 1.62 + index * 0.07, 0.1),
          new THREE.Vector3(-1.24, 1.4 + offset, -0.08),
        ]),
      ),
    [],
  );
  if (!visible) return null;
  return (
    <group>
      {curves.map((curve, index) => (
        <mesh key={index}>
          <tubeGeometry args={[curve, 18, 0.012, 5, false]} />
          <meshBasicMaterial color={index === 1 ? "#d6fffb" : COLORS.cyan} transparent opacity={0.86} toneMapped={false} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

function createNeutralPose(): Pose {
  return {
    rootPosition: [0, 0, 0],
    rootRotation: [0, 0, 0],
    hipsRotation: [0, 0, 0],
    torsoRotation: [0, 0, 0],
    headRotation: [0, 0, 0],
    leftArmRotation: [0, 0, 0.14],
    leftForearmRotation: [0, 0, -0.05],
    rightArmRotation: [0, 0, -0.14],
    rightForearmRotation: [0, 0, 0.05],
    leftLegRotation: [0, 0, 0.025],
    leftShinRotation: [0, 0, -0.025],
    rightLegRotation: [0, 0, -0.025],
    rightShinRotation: [0, 0, 0.025],
    weaponRotation: [0, 0, -0.08],
  };
}

function smoothStep(value: number) {
  const t = THREE.MathUtils.clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

function oneShotWeight(elapsed: number, duration: number) {
  const p = elapsed / duration;
  if (p <= 0) return 0;
  if (p < 0.28) return smoothStep(p / 0.28);
  if (p < 0.64) return 1;
  if (p < 1) return smoothStep(1 - (p - 0.64) / 0.36);
  return 0;
}

function heldWeight(elapsed: number, rise = 0.24) {
  return smoothStep(elapsed / rise);
}

function mixVec(base: Vec3, target: Vec3, weight: number): Vec3 {
  return [
    THREE.MathUtils.lerp(base[0], target[0], weight),
    THREE.MathUtils.lerp(base[1], target[1], weight),
    THREE.MathUtils.lerp(base[2], target[2], weight),
  ];
}

function dampGroupRotation(group: THREE.Group | null, target: Vec3, delta: number, speed = 16) {
  if (!group) return;
  const alpha = 1 - Math.exp(-speed * Math.min(delta, 0.05));
  group.rotation.x = THREE.MathUtils.lerp(group.rotation.x, target[0], alpha);
  group.rotation.y = THREE.MathUtils.lerp(group.rotation.y, target[1], alpha);
  group.rotation.z = THREE.MathUtils.lerp(group.rotation.z, target[2], alpha);
}

function dampGroupPosition(group: THREE.Group | null, target: Vec3, delta: number, speed = 16) {
  if (!group) return;
  const alpha = 1 - Math.exp(-speed * Math.min(delta, 0.05));
  group.position.x = THREE.MathUtils.lerp(group.position.x, target[0], alpha);
  group.position.y = THREE.MathUtils.lerp(group.position.y, target[1], alpha);
  group.position.z = THREE.MathUtils.lerp(group.position.z, target[2], alpha);
}

function applyActionPose(action: HeroLabAction, elapsed: number, t: number): Pose {
  const pose = createNeutralPose();
  const breathing = Math.sin(t * 2.2);
  pose.rootPosition[1] = breathing * 0.012;
  pose.torsoRotation[0] = breathing * 0.012;
  pose.headRotation[0] = -breathing * 0.009;

  if (action === "idle_neutral") {
    pose.leftArmRotation[2] += Math.sin(t * 1.3) * 0.018;
    pose.rightArmRotation[2] -= Math.sin(t * 1.3) * 0.018;
    return pose;
  }

  if (action === "idle_combat") {
    const pulse = Math.sin(t * 2.8) * 0.025;
    pose.rootPosition[1] = -0.055 + pulse;
    pose.torsoRotation = [0.055, 0.04, 0];
    pose.headRotation = [-0.035, -0.04, 0];
    pose.leftArmRotation = [-0.48, 0.06, 0.62];
    pose.leftForearmRotation = [-0.26, 0, -0.58];
    pose.rightArmRotation = [-0.38, -0.06, -0.56];
    pose.rightForearmRotation = [-0.22, 0, 0.38];
    pose.leftLegRotation = [0.08, 0, 0.18];
    pose.leftShinRotation = [-0.16, 0, -0.08];
    pose.rightLegRotation = [-0.08, 0, -0.18];
    pose.rightShinRotation = [-0.08, 0, 0.08];
    pose.weaponRotation = [0, 0, -0.68];
    return pose;
  }

  if (action === "locomotion_walk" || action === "locomotion_run") {
    const run = action === "locomotion_run";
    const speed = run ? 8.2 : 4.6;
    const stride = run ? 0.74 : 0.43;
    const cycle = Math.sin(t * speed);
    const lift = Math.max(0, Math.sin(t * speed * 2));
    pose.rootPosition = [0, (run ? 0.025 : 0.014) + lift * (run ? 0.045 : 0.022), 0];
    pose.rootRotation = [run ? 0.14 : 0.035, 0, cycle * (run ? 0.025 : 0.015)];
    pose.torsoRotation = [run ? 0.12 : 0.03, 0, -cycle * 0.06];
    pose.headRotation = [run ? -0.08 : -0.02, 0, cycle * 0.025];
    pose.leftLegRotation = [cycle * stride, 0, 0.025];
    pose.rightLegRotation = [-cycle * stride, 0, -0.025];
    pose.leftShinRotation = [Math.max(0, -cycle) * (run ? 0.82 : 0.42), 0, -0.025];
    pose.rightShinRotation = [Math.max(0, cycle) * (run ? 0.82 : 0.42), 0, 0.025];
    pose.leftArmRotation = [-cycle * stride * 0.72, 0, 0.14];
    pose.rightArmRotation = [cycle * stride * 0.72, 0, -0.14];
    pose.leftForearmRotation = [run ? -0.35 : -0.12, 0, -0.05];
    pose.rightForearmRotation = [run ? -0.35 : -0.12, 0, 0.05];
    pose.weaponRotation = [0, 0, run ? -0.35 : -0.12];
    return pose;
  }

  if (action === "observe") {
    const w = heldWeight(elapsed);
    pose.torsoRotation = mixVec(pose.torsoRotation, [0.02, -0.12, 0.03], w);
    pose.headRotation = mixVec(pose.headRotation, [-0.1, -0.2, 0.02], w);
    pose.leftArmRotation = mixVec(pose.leftArmRotation, [-1.18, -0.25, 0.34], w);
    pose.leftForearmRotation = mixVec(pose.leftForearmRotation, [-0.34, 0.12, -0.3], w);
    pose.rightArmRotation = mixVec(pose.rightArmRotation, [0.05, 0, -0.22], w);
    pose.weaponRotation = mixVec(pose.weaponRotation, [0, 0, -0.1], w);
    return pose;
  }

  if (action === "light_1") {
    const w = oneShotWeight(elapsed, 0.72);
    pose.rootRotation = mixVec(pose.rootRotation, [0.03, 0.2, 0.08], w);
    pose.hipsRotation = mixVec(pose.hipsRotation, [0, 0.25, -0.08], w);
    pose.torsoRotation = mixVec(pose.torsoRotation, [-0.12, -0.48, 0.26], w);
    pose.headRotation = mixVec(pose.headRotation, [-0.04, 0.36, -0.1], w);
    pose.rightArmRotation = mixVec(pose.rightArmRotation, [-0.72, 0.35, -1.12], w);
    pose.rightForearmRotation = mixVec(pose.rightForearmRotation, [-0.18, 0.12, -0.46], w);
    pose.leftArmRotation = mixVec(pose.leftArmRotation, [-0.38, -0.3, 0.58], w);
    pose.leftLegRotation = mixVec(pose.leftLegRotation, [0.12, 0, 0.18], w);
    pose.rightLegRotation = mixVec(pose.rightLegRotation, [-0.18, 0, -0.12], w);
    pose.weaponRotation = mixVec(pose.weaponRotation, [0.15, -0.12, -0.72], w);
    return pose;
  }

  if (action === "light_2") {
    const w = oneShotWeight(elapsed, 0.78);
    pose.rootRotation = mixVec(pose.rootRotation, [0.02, -0.18, -0.07], w);
    pose.hipsRotation = mixVec(pose.hipsRotation, [0, -0.22, 0.1], w);
    pose.torsoRotation = mixVec(pose.torsoRotation, [-0.08, 0.46, -0.28], w);
    pose.headRotation = mixVec(pose.headRotation, [-0.02, -0.3, 0.08], w);
    pose.rightArmRotation = mixVec(pose.rightArmRotation, [-0.62, -0.42, 0.94], w);
    pose.rightForearmRotation = mixVec(pose.rightForearmRotation, [-0.18, -0.12, 0.42], w);
    pose.leftArmRotation = mixVec(pose.leftArmRotation, [-0.35, 0.2, -0.35], w);
    pose.leftLegRotation = mixVec(pose.leftLegRotation, [-0.1, 0, 0.12], w);
    pose.rightLegRotation = mixVec(pose.rightLegRotation, [0.15, 0, -0.2], w);
    pose.weaponRotation = mixVec(pose.weaponRotation, [-0.1, 0.12, 0.58], w);
    return pose;
  }

  if (action === "heavy") {
    const w = oneShotWeight(elapsed, 1.06);
    pose.rootPosition = mixVec(pose.rootPosition, [0, -0.08, 0], w);
    pose.rootRotation = mixVec(pose.rootRotation, [0.08, 0.04, 0], w);
    pose.torsoRotation = mixVec(pose.torsoRotation, [-0.08, -0.12, 0.05], w);
    pose.headRotation = mixVec(pose.headRotation, [-0.16, 0.04, 0], w);
    pose.rightArmRotation = mixVec(pose.rightArmRotation, [-0.18, 0.12, 2.72], w);
    pose.rightForearmRotation = mixVec(pose.rightForearmRotation, [-0.08, 0, 0.34], w);
    pose.leftArmRotation = mixVec(pose.leftArmRotation, [-0.18, -0.14, -2.35], w);
    pose.leftForearmRotation = mixVec(pose.leftForearmRotation, [-0.1, 0, -0.42], w);
    pose.leftLegRotation = mixVec(pose.leftLegRotation, [0.15, 0, 0.22], w);
    pose.leftShinRotation = mixVec(pose.leftShinRotation, [-0.3, 0, -0.1], w);
    pose.rightLegRotation = mixVec(pose.rightLegRotation, [-0.08, 0, -0.2], w);
    pose.rightShinRotation = mixVec(pose.rightShinRotation, [-0.2, 0, 0.08], w);
    pose.weaponRotation = mixVec(pose.weaponRotation, [0, 0, Math.PI], w);
    return pose;
  }

  if (action === "dodge") {
    const w = oneShotWeight(elapsed, 0.68);
    pose.rootPosition = mixVec(pose.rootPosition, [0.24, -0.23, 0.04], w);
    pose.rootRotation = mixVec(pose.rootRotation, [0.2, -0.12, -0.3], w);
    pose.hipsRotation = mixVec(pose.hipsRotation, [0.1, -0.18, 0.16], w);
    pose.torsoRotation = mixVec(pose.torsoRotation, [0.24, 0.18, 0.15], w);
    pose.headRotation = mixVec(pose.headRotation, [-0.16, -0.1, 0.08], w);
    pose.leftArmRotation = mixVec(pose.leftArmRotation, [0.72, 0.1, 0.48], w);
    pose.rightArmRotation = mixVec(pose.rightArmRotation, [0.62, -0.1, -0.48], w);
    pose.leftLegRotation = mixVec(pose.leftLegRotation, [0.68, 0, 0.35], w);
    pose.leftShinRotation = mixVec(pose.leftShinRotation, [-0.92, 0, -0.22], w);
    pose.rightLegRotation = mixVec(pose.rightLegRotation, [-0.38, 0, -0.36], w);
    pose.rightShinRotation = mixVec(pose.rightShinRotation, [-0.65, 0, 0.25], w);
    pose.weaponRotation = mixVec(pose.weaponRotation, [0.2, 0, -0.42], w);
    return pose;
  }

  if (action === "parry") {
    const w = heldWeight(elapsed, 0.16);
    pose.rootPosition = mixVec(pose.rootPosition, [0, -0.08, 0], w);
    pose.torsoRotation = mixVec(pose.torsoRotation, [0.08, 0.02, -0.02], w);
    pose.headRotation = mixVec(pose.headRotation, [-0.05, -0.04, 0], w);
    pose.rightArmRotation = mixVec(pose.rightArmRotation, [-0.62, 0.12, 0.52], w);
    pose.rightForearmRotation = mixVec(pose.rightForearmRotation, [-0.35, 0, 0.18], w);
    pose.leftArmRotation = mixVec(pose.leftArmRotation, [-0.76, -0.18, -0.6], w);
    pose.leftForearmRotation = mixVec(pose.leftForearmRotation, [-0.35, 0, -0.2], w);
    pose.leftLegRotation = mixVec(pose.leftLegRotation, [0.08, 0, 0.24], w);
    pose.rightLegRotation = mixVec(pose.rightLegRotation, [-0.08, 0, -0.24], w);
    pose.weaponRotation = mixVec(pose.weaponRotation, [0.06, 0.05, Math.PI - 0.12], w);
    return pose;
  }

  if (action === "hit") {
    const w = oneShotWeight(elapsed, 0.66);
    const shake = Math.sin(elapsed * 42) * (1 - THREE.MathUtils.clamp(elapsed / 0.66, 0, 1));
    pose.rootPosition = mixVec(pose.rootPosition, [0, 0.08, -0.11], w);
    pose.rootRotation = mixVec(pose.rootRotation, [-0.22, 0, -0.14 + shake * 0.04], w);
    pose.torsoRotation = mixVec(pose.torsoRotation, [-0.3, 0.1, -0.18], w);
    pose.headRotation = mixVec(pose.headRotation, [0.28, -0.12, 0.15], w);
    pose.leftArmRotation = mixVec(pose.leftArmRotation, [0.32, 0.4, 0.78], w);
    pose.rightArmRotation = mixVec(pose.rightArmRotation, [0.36, -0.34, -0.88], w);
    pose.leftLegRotation = mixVec(pose.leftLegRotation, [-0.26, 0, 0.18], w);
    pose.rightLegRotation = mixVec(pose.rightLegRotation, [0.34, 0, -0.12], w);
    pose.rightShinRotation = mixVec(pose.rightShinRotation, [-0.42, 0, 0.05], w);
    pose.weaponRotation = mixVec(pose.weaponRotation, [0.18, 0.2, -0.3], w);
    return pose;
  }

  if (action === "namebreak") {
    const w = heldWeight(elapsed, 0.42);
    pose.rootPosition = mixVec(pose.rootPosition, [0, -0.04, 0], w);
    pose.torsoRotation = mixVec(pose.torsoRotation, [0.01, -0.14, 0.04], w);
    pose.headRotation = mixVec(pose.headRotation, [-0.08, -0.12, 0.02], w);
    pose.leftArmRotation = mixVec(pose.leftArmRotation, [-1.16, -0.26, 0.36], w);
    pose.leftForearmRotation = mixVec(pose.leftForearmRotation, [-0.28, 0.08, -0.28], w);
    pose.rightArmRotation = mixVec(pose.rightArmRotation, [0.02, 0, -0.24], w);
    pose.rightForearmRotation = mixVec(pose.rightForearmRotation, [0, 0, 0.08], w);
    pose.leftLegRotation = mixVec(pose.leftLegRotation, [0.08, 0, 0.16], w);
    pose.rightLegRotation = mixVec(pose.rightLegRotation, [-0.04, 0, -0.14], w);
    pose.weaponRotation = mixVec(pose.weaponRotation, [0, 0, 0.02], w);
    return pose;
  }

  return pose;
}

export function HeroCharacterModel({
  action,
  actionSerial,
  wireframe = false,
  showRig = false,
  showWeaponTrail = true,
  identity = null,
  scale = 1,
}: HeroCharacterModelProps) {
  const root = useRef<THREE.Group>(null);
  const hips = useRef<THREE.Group>(null);
  const torso = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const leftArm = useRef<THREE.Group>(null);
  const leftForearm = useRef<THREE.Group>(null);
  const rightArm = useRef<THREE.Group>(null);
  const rightForearm = useRef<THREE.Group>(null);
  const leftLeg = useRef<THREE.Group>(null);
  const leftShin = useRef<THREE.Group>(null);
  const rightLeg = useRef<THREE.Group>(null);
  const rightShin = useRef<THREE.Group>(null);
  const weapon = useRef<THREE.Group>(null);
  const capeLeft = useRef<THREE.Group>(null);
  const capeCenter = useRef<THREE.Group>(null);
  const capeRight = useRef<THREE.Group>(null);
  const goldenTail = useRef<THREE.Group>(null);
  const actionStartedAt = useRef<number | null>(null);

  useEffect(() => {
    actionStartedAt.current = null;
  }, [action, actionSerial]);

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;
    if (actionStartedAt.current === null) actionStartedAt.current = t;
    const elapsed = Math.max(0, t - actionStartedAt.current);
    const pose = applyActionPose(action, elapsed, t);

    dampGroupPosition(root.current, pose.rootPosition, delta, 18);
    dampGroupRotation(root.current, pose.rootRotation, delta, 18);
    dampGroupRotation(hips.current, pose.hipsRotation, delta);
    dampGroupRotation(torso.current, pose.torsoRotation, delta);
    dampGroupRotation(head.current, pose.headRotation, delta, 18);
    dampGroupRotation(leftArm.current, pose.leftArmRotation, delta, 20);
    dampGroupRotation(leftForearm.current, pose.leftForearmRotation, delta, 22);
    dampGroupRotation(rightArm.current, pose.rightArmRotation, delta, 20);
    dampGroupRotation(rightForearm.current, pose.rightForearmRotation, delta, 22);
    dampGroupRotation(leftLeg.current, pose.leftLegRotation, delta, 20);
    dampGroupRotation(leftShin.current, pose.leftShinRotation, delta, 22);
    dampGroupRotation(rightLeg.current, pose.rightLegRotation, delta, 20);
    dampGroupRotation(rightShin.current, pose.rightShinRotation, delta, 22);
    dampGroupRotation(weapon.current, pose.weaponRotation, delta, 24);

    const locomotion = action === "locomotion_walk" || action === "locomotion_run";
    const actionWind = ["light_1", "light_2", "heavy", "dodge"].includes(action) ? oneShotWeight(elapsed, action === "heavy" ? 1.06 : 0.74) : 0;
    const idleWind = Math.sin(t * 1.45) * 0.035;
    const runWind = locomotion ? (action === "locomotion_run" ? 0.26 : 0.1) : 0;
    dampGroupRotation(capeLeft.current, [0.08 + runWind, 0.04, 0.07 + idleWind - actionWind * 0.1], delta, 9);
    dampGroupRotation(capeCenter.current, [0.05 + runWind, 0, idleWind * 0.35], delta, 9);
    dampGroupRotation(capeRight.current, [0.08 + runWind, -0.04, -0.07 - idleWind + actionWind * 0.14], delta, 9);
    dampGroupRotation(goldenTail.current, [0.12 + runWind * 0.8, -0.04, -0.05 + idleWind * 1.2 + actionWind * 0.18], delta, 8);
  });

  const accent = identity === "pilgrim" ? COLORS.cyan : identity === "captain" ? COLORS.ochre : COLORS.gold;

  return (
    <group scale={scale}>
      <group ref={root}>
        <group ref={hips} position={[0, 1.0, 0]}>
          <mesh position={[0, 0.02, 0]} scale={[0.52, 0.22, 0.34]} castShadow>
            <dodecahedronGeometry args={[0.75, 0]} />
            <Surface color={COLORS.charcoal} wireframe={wireframe} roughness={0.96} />
          </mesh>
          <RigMarker visible={showRig} size={0.055} />

          <group ref={leftLeg} position={[-0.245, 0, 0]}>
            <Leg wireframe={wireframe} showRig={showRig} shinRef={leftShin} />
          </group>
          <group ref={rightLeg} position={[0.245, 0, 0]}>
            <Leg wireframe={wireframe} showRig={showRig} shinRef={rightShin} />
          </group>
        </group>

        <group ref={torso} position={[0, 1.34, 0]}>
          <Torso wireframe={wireframe} accent={accent} />
          <Mantle wireframe={wireframe} accent={accent} />
          <RigMarker visible={showRig} size={0.055} />

          <group ref={leftArm} position={[-0.54, 0.42, 0]}>
            <Arm side="left" wireframe={wireframe} showRig={showRig} forearmRef={leftForearm} />
          </group>
          <group ref={rightArm} position={[0.54, 0.42, 0]}>
            <Arm
              side="right"
              wireframe={wireframe}
              showRig={showRig}
              forearmRef={rightForearm}
              weapon={
                <group ref={weapon} position={[0, -0.49, 0.015]}>
                  <OarWeapon
                    wireframe={wireframe}
                    accent={accent}
                    showTrail={showWeaponTrail}
                    attack={action}
                    actionSerial={actionSerial}
                  />
                </group>
              }
            />
          </group>

          <group position={[0, 0.25, -0.23]}>
            <group ref={capeLeft} position={[-0.32, -0.08, 0]} rotation={[0.08, 0.04, 0.07]}>
              <CapePanel wireframe={wireframe} accent={accent} offset={-1} />
            </group>
            <group ref={capeCenter} position={[0, -0.12, -0.045]} rotation={[0.05, 0, 0]}>
              <CapePanel wireframe={wireframe} accent={accent} />
            </group>
            <group ref={capeRight} position={[0.32, -0.08, 0]} rotation={[0.08, -0.04, -0.07]}>
              <CapePanel wireframe={wireframe} accent={accent} offset={1} />
            </group>
            <group ref={goldenTail} position={[0.28, 0.02, -0.08]} rotation={[0.12, -0.04, -0.05]}>
              <GoldenTail wireframe={wireframe} accent={accent} />
            </group>
          </group>
        </group>

        <group ref={head} position={[0, 2.48, 0.015]}>
          <Head wireframe={wireframe} showRig={showRig} />
        </group>

        <ObservationCrystal visible={action === "observe"} />
        <NameThreads visible={action === "namebreak"} />
      </group>
    </group>
  );
}
