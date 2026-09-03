export type Claim = 'none' | 'returning_captain' | 'storm_pilgrim'
export type FactId = 'broken_guest_token' | 'temple_salt' | 'hidden_ship_seal'
export type LocationId = 'gate' | 'market' | 'hall' | 'temple' | 'dock'

export interface SpikeState {
  readonly seed: 'saltcape_tech_spike_v1'
  readonly phase: 0 | 1 | 2 | 3
  readonly claim: Claim
  readonly observedFacts: readonly FactId[]
  readonly publicFacts: readonly FactId[]
  readonly permissions: readonly LocationId[]
  readonly liabilities: readonly string[]
  readonly ion: {
    readonly location: LocationId
    readonly memories: readonly FactId[]
    readonly rumorLocked: boolean
  }
}

const unique = <T,>(values: readonly T[]): readonly T[] => [...new Set(values)]

export const createInitialState = (): SpikeState => ({
  seed: 'saltcape_tech_spike_v1',
  phase: 0,
  claim: 'none',
  observedFacts: [],
  publicFacts: [],
  permissions: ['gate', 'market'],
  liabilities: [],
  ion: { location: 'market', memories: [], rumorLocked: false },
})

const deriveClaim = (claim: Claim): Pick<SpikeState, 'permissions' | 'liabilities'> => {
  if (claim === 'returning_captain') {
    return {
      permissions: ['gate', 'market', 'hall', 'dock'],
      liabilities: ['必须解释缺失船印', '船员口供可被核对'],
    }
  }
  if (claim === 'storm_pilgrim') {
    return {
      permissions: ['gate', 'market', 'temple'],
      liabilities: ['不得公开持有贵重船印', '不得被看见指挥船员'],
    }
  }
  return { permissions: ['gate', 'market'], liabilities: [] }
}

export const observeFact = (state: SpikeState, fact: FactId): SpikeState => ({
  ...state,
  observedFacts: unique([...state.observedFacts, fact]),
})

export const declareClaim = (state: SpikeState, claim: Exclude<Claim, 'none'>): SpikeState => {
  if (state.claim !== 'none' || state.observedFacts.length === 0) return state
  const derived = deriveClaim(claim)
  return { ...state, claim, ...derived }
}

export const makeFactPublic = (state: SpikeState, fact: FactId): SpikeState => {
  if (!state.observedFacts.includes(fact) || state.ion.rumorLocked) return state
  const publicFacts = unique([...state.publicFacts, fact])
  const ionCanHear = state.ion.location === 'market'
  return {
    ...state,
    publicFacts,
    ion: {
      ...state.ion,
      memories: ionCanHear ? unique([...state.ion.memories, fact]) : state.ion.memories,
    },
  }
}

export const advancePhase = (state: SpikeState): SpikeState => {
  if (state.phase === 3) return state
  const phase = (state.phase + 1) as SpikeState['phase']
  const location: LocationId = phase === 1 ? 'market' : phase === 2 ? 'dock' : 'dock'
  return {
    ...state,
    phase,
    ion: {
      ...state.ion,
      location,
      rumorLocked: phase === 3,
    },
  }
}

export const stableSnapshot = (state: SpikeState): string => JSON.stringify(state)
