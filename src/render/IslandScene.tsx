import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useRef } from 'react'
import type { OrthographicCamera as OrthoCam } from 'three'
import { MathUtils, Vector3 } from 'three'
import { TABLEAU_BY_ID } from '../content'
import type { Island, Tableau } from '../content/types'
import type { GameState } from '../domain/state'
import { DitherPass } from './DitherPass'
import { DecorationMesh, EvidenceMarker, Figure, Ground, TerrainMesh } from './pieces'
import { PALETTE } from './palette'

/**
 * 固定 2.5D 正交相机。
 *
 * 仰角约 34°、偏航 45°，**不可旋转**——每座岛的地形都是照着这个唯一机位手工
 * 排布的，高物体一律靠边，所以从源头就不会出现遮挡。可旋转的相机会逼着我们做
 * 遮挡剔除、透明墙、动态裁剪，那些都属于"AI 自己发明的额外系统"，本作不做。
 */
const CAM_OFFSET = new Vector3(15, 17.5, 15)

/**
 * span = 纵向可见的世界单位数。正交相机的 zoom 是「像素 / 世界单位」，
 * 所以直接按视口高度换算，窗口大小变化时可见范围保持不变。
 */
function CameraRig({ target, span }: { target: readonly [number, number]; span: number }) {
  const { camera, size } = useThree()
  const focus = useRef(new Vector3(target[0], 0, target[1]))

  useFrame((_, delta) => {
    const cam = camera as OrthoCam
    focus.current.x = MathUtils.damp(focus.current.x, target[0], 6, delta)
    focus.current.z = MathUtils.damp(focus.current.z, target[1], 6, delta)
    cam.position.copy(focus.current).add(CAM_OFFSET)
    cam.lookAt(focus.current)

    const desired = size.height / span
    cam.zoom = MathUtils.damp(cam.zoom, desired, 5, delta)
    cam.updateProjectionMatrix()
  })
  return null
}

/** 探索视图：岛屿本体 + 证物标记 + NPC + 玩家。 */
function ExploreView({ island, state }: { island: Island; state: GameState }) {
  const activeEvidence = state.activeEvidence
  return (
    <group>
      <Ground bounds={island.bounds} color={island.ground} />
      {island.terrain.map((block, i) => (
        <TerrainMesh key={i} block={block} />
      ))}
      {island.decorations.map((deco, i) => (
        <DecorationMesh key={i} deco={deco} />
      ))}

      {island.evidence.map((ev) => (
        <EvidenceMarker
          key={ev.id}
          position={ev.position}
          examined={state.examined.has(ev.id)}
          active={activeEvidence === ev.id}
        />
      ))}

      {island.npcs.map((npc) => (
        <Figure
          key={npc.id}
          position={npc.position}
          facing={npc.facing}
          giant={npc.giant}
          pose={npc.giant ? 'sit' : 'stand'}
          breathing
        />
      ))}

      {/* 离岛点：一道朝海的门 */}
      <group position={[island.departure[0], 0, island.departure[1]]}>
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.9, 1.15, 20]} />
          <meshBasicMaterial color={PALETTE.sea} transparent opacity={0.8} />
        </mesh>
      </group>

      {/* 抉择点 */}
      {!state.flags.has(`done:${island.choice.id}`) && (
        <group position={[island.choice.position[0], 0, island.choice.position[1]]}>
          <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.75, 0.95, 20]} />
            <meshBasicMaterial color={PALETTE.gold} transparent opacity={0.65} />
          </mesh>
        </group>
      )}

      {/* 玩家：唯一用陶土红的人形 */}
      <Figure
        position={[state.player.x, state.player.z]}
        facing={state.facing}
        accent
        highlighted={false}
      />
      <pointLight position={[state.player.x, 2.4, state.player.z]} intensity={2.2} distance={7} color={PALETTE.ivory} />
    </group>
  )
}

/**
 * 记忆定影视图：同一片地形，但只留下凝固的人物。
 * 玩家可以在定影中心附近走动绕看——这是本作对《Obra Dinn》"走进记忆"的等价物。
 */
function TableauView({ island, tableau, state }: { island: Island; tableau: Tableau; state: GameState }) {
  return (
    <group>
      <Ground bounds={island.bounds} color={island.ground} />
      {island.terrain.map((block, i) => (
        <TerrainMesh key={i} block={block} />
      ))}
      {island.decorations.map((deco, i) => (
        <DecorationMesh key={i} deco={deco} />
      ))}

      {tableau.figures.map((figure) => (
        <Figure
          key={figure.id}
          position={figure.position}
          facing={figure.facing}
          pose={figure.pose}
          giant={figure.giant}
        />
      ))}

      <mesh position={[tableau.center[0], 0.02, tableau.center[1]]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[3.0, 3.2, 32]} />
        <meshBasicMaterial color={PALETTE.ivory} transparent opacity={0.5} />
      </mesh>

      <Figure position={[state.player.x, state.player.z]} facing={state.facing} accent />
    </group>
  )
}

export function IslandScene({ island, state }: { island: Island; state: GameState }) {
  const inTableau = state.phase === 'tableau' && state.activeTableau !== null
  const tableau = state.activeTableau ? TABLEAU_BY_ID.get(state.activeTableau) : undefined

  return (
    <Canvas
      orthographic
      dpr={[1, 1.75]}
      camera={{ position: [15, 17.5, 15], zoom: 33, near: -200, far: 400 }}
      shadows
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      aria-label={`${island.name} 场景`}
    >
      <color attach="background" args={[inTableau ? PALETTE.clay : PALETTE.sea]} />
      <fog attach="fog" args={[inTableau ? PALETTE.clay : PALETTE.sea, 60, 150]} />

      <ambientLight intensity={inTableau ? 2.4 : 0.85} color={PALETTE.ivory} />
      <directionalLight
        position={[12, 20, 8]}
        intensity={2.0}
        color={PALETTE.ivory}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-25}
        shadow-camera-right={25}
        shadow-camera-top={25}
        shadow-camera-bottom={-25}
      />
      <directionalLight position={[-10, 8, -12]} intensity={0.5} color={PALETTE.sea} />

      <CameraRig
        target={inTableau && tableau ? tableau.center : [state.player.x, state.player.z]}
        span={inTableau ? 11 : 27}
      />

      {inTableau && tableau ? (
        <TableauView island={island} tableau={tableau} state={state} />
      ) : (
        <ExploreView island={island} state={state} />
      )}

      <DitherPass active={inTableau} />
    </Canvas>
  )
}
