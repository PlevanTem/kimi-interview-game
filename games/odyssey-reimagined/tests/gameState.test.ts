import { describe, expect, it } from "vitest";
import { canNameBreak, gameReducer, initialGameState } from "../src/gameState";

const beginCombat = (identity: "captain" | "pilgrim" = "captain") => {
  let state = initialGameState();
  state = gameReducer(state, { type: "START" });
  state = gameReducer(state, { type: "OBSERVE_TOKEN" });
  return gameReducer(state, { type: "CLAIM_IDENTITY", identity });
};

const parry = (state: ReturnType<typeof initialGameState>) => {
  state = gameReducer(state, { type: "ENEMY_TELEGRAPH", telegraph: "parryable" });
  state = gameReducer(state, { type: "PARRY_START" });
  return gameReducer(state, { type: "ENEMY_STRIKE" });
};

describe("Sea of a Thousand Names domain state", () => {
  it("does not allow identity selection before observing the guest token", () => {
    const started = gameReducer(initialGameState(), { type: "START" });
    expect(gameReducer(started, { type: "CLAIM_IDENTITY", identity: "captain" })).toBe(started);
  });

  it("makes captain heavy attacks mechanically stronger", () => {
    const captain = gameReducer(beginCombat("captain"), { type: "PLAYER_ATTACK", attack: "heavy" });
    const pilgrim = gameReducer(beginCombat("pilgrim"), { type: "PLAYER_ATTACK", attack: "heavy" });
    expect(captain.enemy.poise).toBe(0);
    expect(pilgrim.enemy.poise).toBe(1);
  });

  it("requires a parry thread and broken guard before the warden", () => {
    let state = beginCombat();
    state = parry(state);
    state = gameReducer(state, { type: "PLAYER_ATTACK", attack: "heavy" });
    expect(state.phase).toBe("warden");
    expect(state.enemy.maxPoise).toBe(6);
  });

  it("fails on four unavoided strikes and reports a specific response", () => {
    let state = beginCombat();
    for (let i = 0; i < 4; i += 1) {
      state = gameReducer(state, { type: "ENEMY_TELEGRAPH", telegraph: "ring" });
      state = gameReducer(state, { type: "ENEMY_STRIKE" });
    }
    expect(state.phase).toBe("failure");
    expect(state.feedback).toContain("不可招架");
  });

  it("completes the warden fight only after three threads and poise break", () => {
    let state = beginCombat();
    state = parry(state);
    state = gameReducer(state, { type: "PLAYER_ATTACK", attack: "heavy" });
    state = parry(state);
    state = parry(state);
    state = parry(state);
    state = gameReducer(state, { type: "PLAYER_ATTACK", attack: "heavy" });
    state = gameReducer(state, { type: "PLAYER_ATTACK", attack: "heavy" });
    expect(canNameBreak(state)).toBe(true);
    state = gameReducer(state, { type: "NAME_BREAK" });
    expect(state.phase).toBe("resolution");
  });

  it("resolves consecutive parry telegraphs deterministically", () => {
    let state = beginCombat();
    state = gameReducer(state, { type: "ENEMY_TELEGRAPH", telegraph: "parryable" });
    state = gameReducer(state, { type: "PARRY_START" });
    expect(state.enemy).toMatchObject({ threads: 1, attackIndex: 1, telegraph: "none" });

    state = gameReducer(state, { type: "ENEMY_TELEGRAPH", telegraph: "parryable" });
    state = gameReducer(state, { type: "PARRY_START" });
    expect(state.enemy).toMatchObject({ threads: 2, attackIndex: 2, telegraph: "none" });
  });

  it("writes different rumor consequences and restarts deterministically", () => {
    const base = { ...initialGameState(), phase: "resolution" as const };
    const reveal = gameReducer(base, { type: "RESOLVE_NAME", choice: "reveal" });
    const sever = gameReducer(base, { type: "RESOLVE_NAME", choice: "sever" });
    expect(reveal.rumorFacts.at(-1)).not.toBe(sever.rumorFacts.at(-1));
    const reset = gameReducer(reveal, { type: "RESTART" });
    expect(reset).toMatchObject(initialGameState());
  });

  it("freezes phase through pause and restores it on resume", () => {
    const state = beginCombat();
    const paused = gameReducer(state, { type: "PAUSE" });
    expect(paused.phase).toBe("paused");
    expect(gameReducer(paused, { type: "RESUME" }).phase).toBe("guard");
  });
});
