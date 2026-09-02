import { describe, expect, it } from 'vitest'
import { ANCHORS, gameReducer, initialGameState, nearestCollectible } from './model'
describe('gameReducer', () => {
  it('supports start, pause and restart', () => { const playing = gameReducer(initialGameState,{type:'START'}); expect(playing.phase).toBe('playing'); expect(gameReducer(playing,{type:'TOGGLE_PAUSE'}).phase).toBe('paused'); expect(gameReducer(playing,{type:'RESTART'})).toMatchObject({phase:'gate',run:2}) })
  it('completes after all anchors', () => { let state=gameReducer(initialGameState,{type:'START'}); for(const anchor of ANCHORS) state=gameReducer(state,{type:'COLLECT',id:anchor.id}); expect(state.phase).toBe('complete') })
  it('fails at zero and recovers invalid movement safely', () => { const playing={...gameReducer(initialGameState,{type:'START'}),timeRemaining:1}; expect(gameReducer(playing,{type:'TICK',seconds:1}).phase).toBe('failed'); expect(gameReducer(initialGameState,{type:'MOVE',x:9,z:9})).toEqual(initialGameState) })
  it('finds a nearby uncollected anchor', () => { const state={...gameReducer(initialGameState,{type:'START'}),player:{x:ANCHORS[0].x,z:ANCHORS[0].z}}; expect(nearestCollectible(state)).toBe(ANCHORS[0].id) })
})
