import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group, Mesh } from 'three'
import { DoubleSide } from 'three'
import type { Decoration, TerrainBlock } from '../content/types'
import { PALETTE } from './palette'

/**
 * 全部几何体都由 three.js 图元程序化拼装，零外部资产。
 * 统一 flatShading + 低分段数，硬边、无贴图——这是黑绘式陶瓶画的三维等价物。
 */

type Pose = 'stand' | 'kneel' | 'lie' | 'reach' | 'flee' | 'sit'

/** 姿态只改几个关节角度和整体高度。没有骨骼、没有关键帧、没有动画曲线。 */
const POSES: Record<Pose, { lean: number; armL: number; armR: number; drop: number; legSpread: number }> = {
  stand: { lean: 0, armL: 0.15, armR: -0.15, drop: 0, legSpread: 0.12 },
  kneel: { lean: 0.18, armL: 0.4, armR: -0.2, drop: 0.42, legSpread: 0.3 },
  lie: { lean: 1.45, armL: 0.9, armR: -0.9, drop: 0.85, legSpread: 0.2 },
  reach: { lean: 0.35, armL: -1.25, armR: -1.35, drop: 0.05, legSpread: 0.35 },
  flee: { lean: 0.3, armL: -0.9, armR: 0.7, drop: 0, legSpread: 0.5 },
  sit: { lean: 0.1, armL: 0.5, armR: 0.3, drop: 0.55, legSpread: 0.45 },
}

export interface FigureProps {
  position: readonly [number, number]
  facing: number
  pose?: Pose
  /** 黑绘式剪影用黑釉；主角与被高亮者用陶土红。 */
  accent?: boolean
  giant?: boolean
  scale?: number
  /** 记忆定影中的人物做极轻微的呼吸浮动，其余静止。 */
  breathing?: boolean
  highlighted?: boolean
}

export function Figure({
  position,
  facing,
  pose = 'stand',
  accent = false,
  giant = false,
  scale = 1,
  breathing = false,
  highlighted = false,
}: FigureProps) {
  const ref = useRef<Group>(null)
  const p = POSES[pose]
  const s = (giant ? 2.6 : 1) * scale
  const color = accent ? PALETTE.terracotta : PALETTE.glaze
  const trim = highlighted ? PALETTE.gold : accent ? PALETTE.ivory : PALETTE.terracotta

  useFrame(({ clock }) => {
    if (!ref.current || !breathing) return
    ref.current.position.y = Math.sin(clock.elapsedTime * 1.1 + position[0]) * 0.025
  })

  return (
    <group position={[position[0], 0, position[1]]} rotation={[0, facing, 0]} scale={s}>
      <group ref={ref} position={[0, -p.drop, 0]} rotation={[p.lean, 0, 0]}>
        {/* 躯干：上窄下宽的锥台，是希腊长袍最省事也最准确的抽象 */}
        <mesh position={[0, 0.62, 0]} castShadow>
          <cylinderGeometry args={[0.17, 0.31, 0.82, 7]} />
          <meshStandardMaterial color={color} flatShading roughness={0.95} />
        </mesh>
        {/* 头 */}
        <mesh position={[0, 1.18, 0]} castShadow>
          <icosahedronGeometry args={[0.155, 0]} />
          <meshStandardMaterial color={color} flatShading roughness={0.95} />
        </mesh>
        {/* 双臂 */}
        <mesh position={[-0.22, 0.78, 0]} rotation={[p.armL, 0, 0.25]} castShadow>
          <cylinderGeometry args={[0.052, 0.042, 0.52, 5]} />
          <meshStandardMaterial color={color} flatShading roughness={0.95} />
        </mesh>
        <mesh position={[0.22, 0.78, 0]} rotation={[p.armR, 0, -0.25]} castShadow>
          <cylinderGeometry args={[0.052, 0.042, 0.52, 5]} />
          <meshStandardMaterial color={color} flatShading roughness={0.95} />
        </mesh>
        {/* 双腿 */}
        <mesh position={[-p.legSpread * 0.5, 0.16, 0]} rotation={[0, 0, p.legSpread * 0.4]}>
          <cylinderGeometry args={[0.06, 0.05, 0.4, 5]} />
          <meshStandardMaterial color={color} flatShading roughness={0.95} />
        </mesh>
        <mesh position={[p.legSpread * 0.5, 0.16, 0]} rotation={[0, 0, -p.legSpread * 0.4]}>
          <cylinderGeometry args={[0.06, 0.05, 0.4, 5]} />
          <meshStandardMaterial color={color} flatShading roughness={0.95} />
        </mesh>
        {/* 腰带：陶瓶画上唯一允许的一道红/白细节 */}
        <mesh position={[0, 0.46, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.26, 0.022, 4, 12]} />
          <meshBasicMaterial color={trim} />
        </mesh>
      </group>
    </group>
  )
}

/** 地形块：盒或圆柱，渲染与碰撞共用同一份数据。 */
export function TerrainMesh({ block }: { block: TerrainBlock }) {
  const [x, z] = block.position
  const common = {
    color: block.color,
    flatShading: true as const,
    roughness: 0.98,
  }
  if (block.kind === 'cylinder') {
    return (
      <mesh position={[x, block.height / 2, z]} castShadow receiveShadow>
        <cylinderGeometry args={[block.size[0], block.size[0] * 1.08, block.height, 8]} />
        <meshStandardMaterial {...common} />
      </mesh>
    )
  }
  return (
    <mesh
      position={[x, block.height / 2, z]}
      rotation={[0, block.rotation ?? 0, 0]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[block.size[0], block.height, block.size[1]]} />
      <meshStandardMaterial {...common} />
    </mesh>
  )
}

/** 装饰道具。全部是三到八个图元的组合，不参与碰撞（除非 solid）。 */
export function DecorationMesh({ deco }: { deco: Decoration }) {
  const [x, z] = deco.position
  const s = deco.scale ?? 1
  const rot = deco.rotation ?? 0

  switch (deco.kind) {
    case 'column':
      return (
        <group position={[x, 0, z]} scale={s} rotation={[0, rot, 0]}>
          <mesh position={[0, 1.6, 0]} castShadow>
            <cylinderGeometry args={[0.26, 0.3, 3.2, 9]} />
            <meshStandardMaterial color={PALETTE.ivory} flatShading roughness={0.95} />
          </mesh>
          <mesh position={[0, 3.3, 0]} castShadow>
            <boxGeometry args={[0.78, 0.22, 0.78]} />
            <meshStandardMaterial color={PALETTE.ivory} flatShading roughness={0.95} />
          </mesh>
          <mesh position={[0, 0.08, 0]}>
            <boxGeometry args={[0.82, 0.16, 0.82]} />
            <meshStandardMaterial color={PALETTE.shade} flatShading roughness={0.95} />
          </mesh>
        </group>
      )
    case 'urn':
      return (
        <group position={[x, 0, z]} scale={s} rotation={[0, rot, 0]}>
          <mesh position={[0, 0.42, 0]} castShadow>
            <sphereGeometry args={[0.36, 8, 6]} />
            <meshStandardMaterial color={PALETTE.terracotta} flatShading roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.82, 0]}>
            <cylinderGeometry args={[0.14, 0.2, 0.28, 8]} />
            <meshStandardMaterial color={PALETTE.glaze} flatShading roughness={0.9} />
          </mesh>
        </group>
      )
    case 'olive':
      return (
        <group position={[x, 0, z]} scale={s} rotation={[0, rot, 0]}>
          <mesh position={[0, 0.9, 0]} castShadow>
            <cylinderGeometry args={[0.11, 0.19, 1.8, 6]} />
            <meshStandardMaterial color={PALETTE.shade} flatShading roughness={0.98} />
          </mesh>
          <mesh position={[0, 2.05, 0]} castShadow>
            <icosahedronGeometry args={[0.82, 0]} />
            <meshStandardMaterial color={PALETTE.glaze} flatShading roughness={0.98} />
          </mesh>
          <mesh position={[0.42, 1.72, 0.2]} castShadow>
            <icosahedronGeometry args={[0.44, 0]} />
            <meshStandardMaterial color={PALETTE.glaze} flatShading roughness={0.98} />
          </mesh>
        </group>
      )
    case 'rock':
      return (
        <mesh position={[x, 0.34 * s, z]} scale={s} rotation={[0.2, rot, 0.15]} castShadow receiveShadow>
          <dodecahedronGeometry args={[0.62, 0]} />
          <meshStandardMaterial color={PALETTE.shade} flatShading roughness={1} />
        </mesh>
      )
    case 'sheep':
      return (
        <group position={[x, 0, z]} scale={s} rotation={[0, rot, 0]}>
          <mesh position={[0, 0.46, 0]} castShadow>
            <icosahedronGeometry args={[0.36, 0]} />
            <meshStandardMaterial color={PALETTE.ivory} flatShading roughness={1} />
          </mesh>
          <mesh position={[0, 0.52, 0.36]}>
            <icosahedronGeometry args={[0.15, 0]} />
            <meshStandardMaterial color={PALETTE.glaze} flatShading roughness={1} />
          </mesh>
          {[-0.16, 0.16].map((dx) =>
            [-0.16, 0.16].map((dz) => (
              <mesh key={`${dx}:${dz}`} position={[dx, 0.13, dz]}>
                <cylinderGeometry args={[0.035, 0.035, 0.26, 4]} />
                <meshStandardMaterial color={PALETTE.glaze} flatShading />
              </mesh>
            )),
          )}
        </group>
      )
    case 'cattle':
      return (
        <group position={[x, 0, z]} scale={s} rotation={[0, rot, 0]}>
          <mesh position={[0, 0.72, 0]} castShadow>
            <boxGeometry args={[0.56, 0.52, 1.05]} />
            <meshStandardMaterial color={PALETTE.gold} flatShading roughness={0.85} />
          </mesh>
          <mesh position={[0, 0.82, 0.66]} castShadow>
            <boxGeometry args={[0.34, 0.34, 0.4]} />
            <meshStandardMaterial color={PALETTE.gold} flatShading roughness={0.85} />
          </mesh>
          <mesh position={[-0.2, 1.02, 0.7]} rotation={[0, 0, 0.6]}>
            <cylinderGeometry args={[0.03, 0.05, 0.3, 4]} />
            <meshStandardMaterial color={PALETTE.ivory} flatShading />
          </mesh>
          <mesh position={[0.2, 1.02, 0.7]} rotation={[0, 0, -0.6]}>
            <cylinderGeometry args={[0.03, 0.05, 0.3, 4]} />
            <meshStandardMaterial color={PALETTE.ivory} flatShading />
          </mesh>
          {[-0.2, 0.2].map((dx) =>
            [-0.36, 0.36].map((dz) => (
              <mesh key={`${dx}:${dz}`} position={[dx, 0.23, dz]}>
                <cylinderGeometry args={[0.055, 0.055, 0.46, 4]} />
                <meshStandardMaterial color={PALETTE.shade} flatShading />
              </mesh>
            )),
          )}
        </group>
      )
    case 'flame':
      return <FlameDeco position={[x, z]} scale={s} />
    case 'lotus':
      return (
        <group position={[x, 0, z]} scale={s} rotation={[0, rot, 0]}>
          <mesh position={[0, 0.28, 0]}>
            <cylinderGeometry args={[0.02, 0.03, 0.56, 4]} />
            <meshStandardMaterial color={PALETTE.glaze} flatShading />
          </mesh>
          {[0, 1, 2, 3, 4].map((i) => (
            <mesh
              key={i}
              position={[Math.cos((i / 5) * Math.PI * 2) * 0.14, 0.6, Math.sin((i / 5) * Math.PI * 2) * 0.14]}
              rotation={[0.7, (i / 5) * Math.PI * 2, 0]}
            >
              <coneGeometry args={[0.1, 0.3, 4]} />
              <meshStandardMaterial color={PALETTE.ivory} flatShading side={DoubleSide} />
            </mesh>
          ))}
          <mesh position={[0, 0.64, 0]}>
            <icosahedronGeometry args={[0.09, 0]} />
            <meshStandardMaterial color={PALETTE.gold} flatShading />
          </mesh>
        </group>
      )
    case 'wave':
      return (
        <group position={[x, 0.02, z]} scale={s}>
          {[-1, 0, 1].map((i) => (
            <mesh key={i} position={[i * 1.1, 0, Math.abs(i) * 0.28]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.44, 0.56, 12, 1, 0, Math.PI]} />
              <meshBasicMaterial color={PALETTE.sea} transparent opacity={0.7} side={DoubleSide} />
            </mesh>
          ))}
        </group>
      )
  }
}

function FlameDeco({ position, scale }: { position: readonly [number, number]; scale: number }) {
  const ref = useRef<Mesh>(null)
  useFrame(({ clock }) => {
    if (!ref.current) return
    // 唯一的循环动画：火焰的呼吸。整部游戏的动画预算就到此为止。
    const t = clock.elapsedTime * 3 + position[0]
    ref.current.scale.set(1, 1 + Math.sin(t) * 0.12, 1)
  })
  return (
    <group position={[position[0], 0, position[1]]} scale={scale}>
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.42, 0.5, 0.2, 8]} />
        <meshStandardMaterial color={PALETTE.shade} flatShading roughness={1} />
      </mesh>
      <mesh ref={ref} position={[0, 0.48, 0]}>
        <coneGeometry args={[0.24, 0.62, 5]} />
        <meshBasicMaterial color={PALETTE.terracotta} />
      </mesh>
      <pointLight position={[0, 0.8, 0]} color={PALETTE.terracotta} intensity={3} distance={6} />
    </group>
  )
}

/** 证物在场景中的标记：一根很矮的方碑，靠近时亮起。 */
export function EvidenceMarker({
  position,
  examined,
  active,
}: {
  position: readonly [number, number]
  examined: boolean
  active: boolean
}) {
  const ref = useRef<Mesh>(null)
  useFrame(({ clock }) => {
    if (!ref.current) return
    ref.current.rotation.y = clock.elapsedTime * 0.4
    ref.current.position.y = 0.52 + Math.sin(clock.elapsedTime * 1.6 + position[0]) * 0.04
  })
  const color = examined ? PALETTE.shade : active ? PALETTE.gold : PALETTE.terracotta
  return (
    <group position={[position[0], 0, position[1]]}>
      <mesh ref={ref} position={[0, 0.52, 0]}>
        <octahedronGeometry args={[active ? 0.19 : 0.15, 0]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[0.42, 0.5, 16]} />
        <meshBasicMaterial color={color} transparent opacity={active ? 0.85 : 0.35} />
      </mesh>
      {active && <pointLight position={[0, 0.9, 0]} color={PALETTE.gold} intensity={2.4} distance={4} />}
    </group>
  )
}

/** 地面：一块贴合岛屿边界的陆地 + 一圈回纹（meander）边饰 + 四周的海。 */
export function Ground({ bounds, color }: { bounds: readonly [number, number]; color: string }) {
  const meander = useMemo(() => {
    const segments: { x: number; z: number; w: number; d: number }[] = []
    const [bx, bz] = bounds
    const stepSize = 1.6
    for (let x = -bx; x <= bx; x += stepSize) {
      segments.push({ x, z: -bz + 0.5, w: 1.0, d: 0.12 })
      segments.push({ x, z: bz - 0.5, w: 1.0, d: 0.12 })
    }
    for (let z = -bz; z <= bz; z += stepSize) {
      segments.push({ x: -bx + 0.5, z, w: 0.12, d: 1.0 })
      segments.push({ x: bx - 0.5, z, w: 0.12, d: 1.0 })
    }
    return segments
  }, [bounds])

  return (
    <group>
      {/* 海：一块远大于岛屿的低平面，让每座岛真的像一座岛 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.55, 0]}>
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial color={PALETTE.sea} flatShading roughness={0.6} />
      </mesh>
      {/* 浅滩：陆地与海之间的一圈过渡 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.22, 0]}>
        <planeGeometry args={[bounds[0] * 2 + 5, bounds[1] * 2 + 5]} />
        <meshStandardMaterial color={PALETTE.shade} flatShading roughness={0.9} />
      </mesh>
      {/* 陆地：正好覆盖可行走范围 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[bounds[0] * 2 + 1.2, bounds[1] * 2 + 1.2]} />
        <meshStandardMaterial color={color} flatShading roughness={1} />
      </mesh>
      {meander.map((seg, i) => (
        <mesh key={i} position={[seg.x, 0.015, seg.z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[seg.w, seg.d]} />
          <meshBasicMaterial color={PALETTE.glaze} transparent opacity={0.35} />
        </mesh>
      ))}
    </group>
  )
}
