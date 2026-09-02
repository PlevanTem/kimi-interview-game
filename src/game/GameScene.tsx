import { Canvas, useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { Color, MathUtils, type Group, type Mesh } from 'three'
import { resolveAsset } from '../assets/catalog'
import { ANCHORS, type GameState } from './model'
function Probe({ state }: { state: GameState }) {
  const ref = useRef<Group>(null)
  const geometry = resolveAsset('geometry.probe')
  const ring = resolveAsset('geometry.probeRing')
  useFrame((_, delta) => { if (!ref.current) return; ref.current.position.x = MathUtils.damp(ref.current.position.x, state.player.x, 8, delta); ref.current.position.z = MathUtils.damp(ref.current.position.z, state.player.z, 8, delta); if (!state.reducedMotion) ref.current.rotation.y += delta * 0.8 })
  return <group ref={ref} position={[state.player.x, .54, state.player.z]}><mesh castShadow><icosahedronGeometry args={[geometry.radius, geometry.detail]} /><meshStandardMaterial {...resolveAsset('material.probe')} emissiveIntensity={.32} /></mesh><mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[ring.radius, ring.tube, ring.radialSegments, ring.tubularSegments]} /><meshBasicMaterial color={resolveAsset('palette.signal')} transparent opacity={.58} /></mesh><pointLight color={resolveAsset('palette.signal')} intensity={1.4} distance={4} /></group>
}
function Anchor({ x, z, active, reducedMotion }: { x: number; z: number; active: boolean; reducedMotion: boolean }) {
  const ref = useRef<Mesh>(null)
  const geometry = resolveAsset('geometry.anchor')
  const ring = resolveAsset('geometry.anchorRing')
  useFrame(({ clock }) => { if (!ref.current || reducedMotion) return; ref.current.rotation.y = clock.elapsedTime * .35 + x; ref.current.position.y = .75 + Math.sin(clock.elapsedTime * 1.25 + z) * .08 })
  return <group position={[x, 0, z]}><mesh ref={ref} position={[0, .75, 0]} castShadow visible={active}><octahedronGeometry args={[geometry.radius, geometry.detail]} /><meshStandardMaterial {...resolveAsset('material.anchor')} emissiveIntensity={.8} /></mesh><mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .018, 0]}><ringGeometry args={[ring.innerRadius, ring.outerRadius, ring.segments]} /><meshBasicMaterial color={active ? resolveAsset('palette.signalSoft') : resolveAsset('palette.inactive')} transparent opacity={active ? .6 : .2} /></mesh><pointLight color={resolveAsset('palette.signalSoft')} intensity={active ? .7 : 0} distance={3} /></group>
}
function Field({ state }: { state: GameState }) {
  const bars = useMemo(() => Array.from({ length: 18 }, (_, i) => ({ x: -8.2 + (i % 9) * 2.05, z: i < 9 ? -6.5 : 7.1, h: .22 + ((i * 7) % 5) * .14 })), [])
  const floor = resolveAsset('geometry.floor')
  const bar = resolveAsset('geometry.fieldBar')
  return <><mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[floor.width, floor.depth, floor.widthSegments, floor.depthSegments]} /><meshStandardMaterial {...resolveAsset('material.floor')} /></mesh><gridHelper args={[floor.width, floor.widthSegments, new Color(resolveAsset('palette.gridMajor')), new Color(resolveAsset('palette.gridMinor'))]} position={[0, .012, 0]} />{bars.map((b, i) => <mesh key={i} position={[b.x, b.h / 2, b.z]}><boxGeometry args={[bar.width, b.h, bar.depth]} /><meshBasicMaterial color={resolveAsset('palette.gridMajor')} transparent opacity={.48} /></mesh>)}{ANCHORS.map((a) => <Anchor key={a.id} {...a} active={!state.collected.includes(a.id)} reducedMotion={state.reducedMotion} />)}<Probe state={state} /></>
}
export function GameScene({ state }: { state: GameState }) {
  return <Canvas dpr={[1, 1.5]} camera={{ position: [9.5, 11.5, 13], fov: 34 }} shadows gl={{ antialias: true, powerPreference: 'high-performance' }} aria-label="Abstract interaction calibration field"><color attach="background" args={[resolveAsset('palette.void')]} /><fog attach="fog" args={[resolveAsset('palette.void'), 14, 29]} /><ambientLight intensity={.65} color={resolveAsset('palette.ambient')} /><directionalLight position={[2, 8, 6]} intensity={2.2} color={resolveAsset('palette.key')} castShadow shadow-mapSize={[1024, 1024]} /><pointLight position={[-7, 3, -5]} intensity={5} distance={14} color={resolveAsset('palette.fill')} /><Field state={state} /></Canvas>
}
