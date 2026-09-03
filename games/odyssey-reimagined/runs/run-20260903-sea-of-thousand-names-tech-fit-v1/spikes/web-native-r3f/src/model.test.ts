import { describe, expect, it } from 'vitest'
import {
  advancePhase,
  createInitialState,
  declareClaim,
  makeFactPublic,
  observeFact,
  stableSnapshot,
} from './model'

describe('saltcape deterministic social-state spike', () => {
  it('derives different spatial permissions and liabilities from each claim', () => {
    const observed = observeFact(createInitialState(), 'broken_guest_token')
    const captain = declareClaim(observed, 'returning_captain')
    const pilgrim = declareClaim(observed, 'storm_pilgrim')

    expect(captain.permissions).toContain('hall')
    expect(captain.permissions).toContain('dock')
    expect(captain.permissions).not.toContain('temple')
    expect(pilgrim.permissions).toContain('temple')
    expect(pilgrim.permissions).not.toContain('hall')
    expect(captain.liabilities).not.toEqual(pilgrim.liabilities)
  })

  it('requires observation before a claim and ignores repeated declarations', () => {
    const initial = createInitialState()
    expect(declareClaim(initial, 'returning_captain')).toEqual(initial)

    const claimed = declareClaim(observeFact(initial, 'temple_salt'), 'storm_pilgrim')
    expect(declareClaim(claimed, 'returning_captain')).toEqual(claimed)
  })

  it('records only public facts the witness can hear before departure', () => {
    let state = observeFact(createInitialState(), 'hidden_ship_seal')
    state = makeFactPublic(state, 'hidden_ship_seal')
    expect(state.ion.memories).toEqual(['hidden_ship_seal'])

    state = advancePhase(advancePhase(advancePhase(state)))
    const afterDeparture = makeFactPublic(observeFact(state, 'temple_salt'), 'temple_salt')
    expect(afterDeparture.ion.memories).toEqual(['hidden_ship_seal'])
    expect(afterDeparture.ion.rumorLocked).toBe(true)
  })

  it('recreates an identical baseline snapshot', () => {
    expect(stableSnapshot(createInitialState())).toBe(stableSnapshot(createInitialState()))
  })
})
