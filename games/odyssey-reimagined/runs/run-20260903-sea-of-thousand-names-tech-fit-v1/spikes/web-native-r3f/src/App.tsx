import { Canvas } from '@react-three/fiber'
import { useMemo, useState } from 'react'
import {
  advancePhase,
  createInitialState,
  declareClaim,
  makeFactPublic,
  observeFact,
  type Claim,
  type LocationId,
  type SpikeState,
} from './model'

const locations: Record<LocationId, [number, number, number]> = {
  gate: [-4, 0.4, 3],
  market: [0, 0.4, 1],
  hall: [-3, 1.4, -3],
  temple: [3, 1.8, -3],
  dock: [3, 0.3, 3],
}

function PortScene({ state }: { readonly state: SpikeState }) {
  const ionPosition = locations[state.ion.location]
  const allowed = useMemo(() => new Set(state.permissions), [state.permissions])
  return (
    <>
      <color attach="background" args={['#120f1d']} />
      <ambientLight intensity={1.5} />
      <directionalLight position={[4, 8, 5]} intensity={3} color="#ffd38a" />
      <mesh rotation-x={-Math.PI / 2}>
        <planeGeometry args={[16, 16]} />
        <meshStandardMaterial color="#241f35" roughness={0.95} />
      </mesh>
      {(Object.entries(locations) as [LocationId, [number, number, number]][]).map(([id, position]) => (
        <group key={id} position={position}>
          <mesh>
            <boxGeometry args={[2.2, id === 'temple' || id === 'hall' ? 2.4 : 0.7, 2.2]} />
            <meshStandardMaterial color={allowed.has(id) ? '#b99757' : '#49364f'} />
          </mesh>
          <mesh position={[0, 1.55, 0]}>
            <ringGeometry args={[0.28, 0.4, 24]} />
            <meshBasicMaterial color={allowed.has(id) ? '#fff0b5' : '#9d5b71'} />
          </mesh>
        </group>
      ))}
      <mesh position={ionPosition}>
        <capsuleGeometry args={[0.32, 1.1, 6, 12]} />
        <meshStandardMaterial color={state.ion.rumorLocked ? '#d46255' : '#5bc0be'} />
      </mesh>
      <mesh position={[5, 0.35, 5]} rotation={[0, -0.6, 0]}>
        <boxGeometry args={[3.2, 0.5, 1.1]} />
        <meshStandardMaterial color="#563d54" />
      </mesh>
    </>
  )
}

const claimName: Record<Claim, string> = {
  none: '尚未声明',
  returning_captain: '特洛伊归来的船长',
  storm_pilgrim: '风暴后的无名朝圣者',
}

export function App() {
  const [state, setState] = useState(createInitialState)
  const hasObserved = state.observedFacts.length > 0

  return (
    <main>
      <section className="stage" aria-label="盐岬港技术验证场景">
        <Canvas camera={{ position: [9, 8, 10], fov: 46 }}>
          <PortScene state={state} />
        </Canvas>
        <div className="legend">金色：当前身份允许进入 · 青色：伊翁 · 红色：传闻已锁定</div>
      </section>
      <aside>
        <p className="eyebrow">TECH FIT SPIKE · 非正式游戏资产</p>
        <h1>盐岬港状态切片</h1>
        <p>验证玩法状态能否与 React/Three 呈现分离，并在浏览器中保持确定性。</p>

        <dl>
          <div><dt>身份</dt><dd>{claimName[state.claim]}</dd></div>
          <div><dt>日落阶段</dt><dd>{state.phase}/3</dd></div>
          <div><dt>伊翁位置</dt><dd>{state.ion.location}</dd></div>
          <div><dt>伊翁记忆</dt><dd>{state.ion.memories.join('、') || '无'}</dd></div>
        </dl>

        <div className="actions">
          <button onClick={() => setState((value) => observeFact(value, 'broken_guest_token'))}>
            观察断裂客符
          </button>
          <button disabled={!hasObserved || state.claim !== 'none'} onClick={() => setState((value) => declareClaim(value, 'returning_captain'))}>
            声明：归来的船长
          </button>
          <button disabled={!hasObserved || state.claim !== 'none'} onClick={() => setState((value) => declareClaim(value, 'storm_pilgrim'))}>
            声明：无名朝圣者
          </button>
          <button disabled={!hasObserved || state.ion.rumorLocked} onClick={() => setState((value) => makeFactPublic(value, 'broken_guest_token'))}>
            让伊翁听见客债
          </button>
          <button disabled={state.phase === 3} onClick={() => setState(advancePhase)}>推进日落</button>
          <button className="secondary" onClick={() => setState(createInitialState)}>确定性重置</button>
        </div>

        <h2>派生权限</h2>
        <ul>{state.permissions.map((permission) => <li key={permission}>{permission}</li>)}</ul>
        <h2>身份风险</h2>
        <ul>{state.liabilities.length ? state.liabilities.map((risk) => <li key={risk}>{risk}</li>) : <li>声明后出现</li>}</ul>
      </aside>
    </main>
  )
}
