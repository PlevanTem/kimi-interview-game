export type Phase =
  | "title"
  | "shore"
  | "identity"
  | "guard"
  | "warden"
  | "resolution"
  | "rumor"
  | "success"
  | "failure"
  | "paused";

export type Identity = "captain" | "pilgrim";
export type Telegraph = "none" | "parryable" | "ring";
export type ActionName = "idle" | "observe" | "light" | "heavy" | "dodge" | "parry" | "namebreak" | "hit";
export type RumorChoice = "reveal" | "bind" | "sever";

export interface EnemyState {
  kind: "none" | "guard" | "warden";
  poise: number;
  maxPoise: number;
  threads: number;
  telegraph: Telegraph;
  attackIndex: number;
}

export interface GameState {
  phase: Phase;
  previousPhase: Phase | null;
  identity: Identity | null;
  health: number;
  breath: number;
  enemy: EnemyState;
  parryArmed: boolean;
  dodging: boolean;
  observedGuestToken: boolean;
  action: ActionName;
  actionSerial: number;
  feedback: string;
  objective: string;
  rumorChoice: RumorChoice | null;
  rumorFacts: string[];
  tutorialStep: number;
  cameraShake: boolean;
  highContrast: boolean;
}

export type GameEvent =
  | { type: "START" }
  | { type: "OBSERVE_TOKEN" }
  | { type: "CLAIM_IDENTITY"; identity: Identity }
  | { type: "PLAYER_ATTACK"; attack: "light" | "heavy" }
  | { type: "DODGE_START" }
  | { type: "DODGE_END" }
  | { type: "PARRY_START" }
  | { type: "PARRY_END" }
  | { type: "ENEMY_TELEGRAPH"; telegraph: Exclude<Telegraph, "none"> }
  | { type: "ENEMY_STRIKE" }
  | { type: "ENEMY_RECOVER" }
  | { type: "NAME_BREAK" }
  | { type: "RESOLVE_NAME"; choice: RumorChoice }
  | { type: "DEPART" }
  | { type: "RESTORE_BREATH" }
  | { type: "PAUSE" }
  | { type: "RESUME" }
  | { type: "RESTART" }
  | { type: "TOGGLE_SHAKE" }
  | { type: "TOGGLE_CONTRAST" };

const noEnemy = (): EnemyState => ({ kind: "none", poise: 0, maxPoise: 0, threads: 0, telegraph: "none", attackIndex: 0 });
const guardEnemy = (): EnemyState => ({ kind: "guard", poise: 3, maxPoise: 3, threads: 0, telegraph: "none", attackIndex: 0 });
const wardenEnemy = (): EnemyState => ({ kind: "warden", poise: 6, maxPoise: 6, threads: 0, telegraph: "none", attackIndex: 0 });

export const initialGameState = (): GameState => ({
  phase: "title",
  previousPhase: null,
  identity: null,
  health: 4,
  breath: 3,
  enemy: noEnemy(),
  parryArmed: false,
  dodging: false,
  observedGuestToken: false,
  action: "idle",
  actionSerial: 0,
  feedback: "海上有许多名字，归途只认你留下的事实。",
  objective: "驶向盐岬港",
  rumorChoice: null,
  rumorFacts: [],
  tutorialStep: 0,
  cameraShake: true,
  highContrast: false,
});

const isCombat = (phase: Phase) => phase === "guard" || phase === "warden";

const actionState = (state: GameState, action: ActionName, feedback: string): GameState => ({
  ...state,
  action,
  actionSerial: state.actionSerial + 1,
  feedback,
});

const enterWarden = (state: GameState): GameState => ({
  ...state,
  phase: "warden",
  enemy: wardenEnemy(),
  action: "idle",
  objective: "击败潮门誓卫 · 招架三次暴露誓名",
  feedback: "守卫退开。潮门誓卫以三枚誓环封住归途。",
  tutorialStep: 4,
});

const strikeResult = (state: GameState): GameState => {
  const enemy: EnemyState = { ...state.enemy, telegraph: "none", attackIndex: state.enemy.attackIndex + 1 };
  if (state.dodging) {
    return actionState({ ...state, enemy }, "dodge", "你从誓约的落点外穿过。");
  }
  if (state.parryArmed && state.enemy.telegraph === "parryable") {
    const nextPoise = Math.max(0, state.enemy.poise - 1);
    const nextThreads = Math.min(3, state.enemy.threads + 1);
    const parried = actionState(
      { ...state, enemy: { ...enemy, poise: nextPoise, threads: nextThreads }, parryArmed: false, tutorialStep: Math.max(3, state.tutorialStep) },
      "parry",
      nextThreads === 3 ? "第三条名线已显形。破尽守势，然后拆名。" : `精准招架：第 ${nextThreads} 条名线被拉出。`,
    );
    if (state.phase === "guard" && nextPoise === 0 && nextThreads >= 1) return enterWarden(parried);
    return parried;
  }
  const nextHealth = Math.max(0, state.health - 1);
  if (nextHealth === 0) {
    return actionState(
      { ...state, phase: "failure", health: 0, enemy, objective: "归途在潮门前中断" },
      "hit",
      state.enemy.telegraph === "ring" ? "金色环击不可招架：用闪避离开范围。" : "可招架突刺命中：等吸气收束后再举桨。",
    );
  }
  return actionState(
    { ...state, health: nextHealth, enemy, parryArmed: false },
    "hit",
    state.enemy.telegraph === "ring" ? "金色环击穿过招架。下次闪避。" : "你错过了青色吸气的招架窗口。",
  );
};

export function gameReducer(state: GameState, event: GameEvent): GameState {
  switch (event.type) {
    case "START":
      if (state.phase !== "title") return state;
      return { ...state, phase: "shore", objective: "沿发光织路寻找断裂客符", feedback: "WASD 移动，F 观察发光痕迹。", tutorialStep: 1 };
    case "OBSERVE_TOKEN":
      if (state.phase !== "shore") return state;
      return actionState({ ...state, phase: "identity", observedGuestToken: true, objective: "在客门前声明一个身份", tutorialStep: 2 }, "observe", "客符两半仍能咬合：这里欠你一份旧款待。身份会给权限，也会留下债。 ");
    case "CLAIM_IDENTITY":
      if (state.phase !== "identity") return state;
      return {
        ...state,
        phase: "guard",
        identity: event.identity,
        enemy: guardEnemy(),
        objective: "越过守卫 · 先读招，再反击",
        feedback: event.identity === "captain" ? "船长：重击多破一格守势；失手会被记作武力索船。" : "朝圣者：闪避恢复更快；主动挥桨会破坏无武身份。",
        tutorialStep: 3,
      };
    case "PLAYER_ATTACK": {
      if (!isCombat(state.phase) || state.enemy.poise <= 0) return state;
      const captainHeavy = state.identity === "captain" && event.attack === "heavy" ? 1 : 0;
      const base = event.attack === "heavy" ? 2 : 1;
      const poise = Math.max(0, state.enemy.poise - base - captainHeavy);
      const attacked = actionState(
        {
          ...state,
          enemy: { ...state.enemy, poise },
          rumorFacts: state.identity === "pilgrim" && event.attack === "light" && !state.rumorFacts.includes("持武朝圣") ? [...state.rumorFacts, "持武朝圣"] : state.rumorFacts,
        },
        event.attack,
        poise === 0 ? "守势已破；还需要从准确招架中取得名线。" : `${event.attack === "heavy" ? "重击" : "轻击"}削去 ${base + captainHeavy} 格守势。`,
      );
      if (state.phase === "guard" && poise === 0 && state.enemy.threads >= 1) return enterWarden(attacked);
      return attacked;
    }
    case "DODGE_START":
      if (!isCombat(state.phase) || state.breath <= 0) return state;
      if (state.enemy.telegraph === "ring") {
        return actionState(
          {
            ...state,
            breath: state.breath - 1,
            dodging: true,
            enemy: { ...state.enemy, telegraph: "none", attackIndex: state.enemy.attackIndex + 1 },
          },
          "dodge",
          "你在金环闭合前离开了誓约的落点。",
        );
      }
      return actionState({ ...state, dodging: true, breath: state.breath - 1 }, "dodge", "闪避消耗一枚呼吸结。离开金色环击。 ");
    case "DODGE_END":
      return { ...state, dodging: false, action: "idle" };
    case "PARRY_START":
      if (!isCombat(state.phase)) return state;
      if (state.enemy.telegraph === "parryable") return strikeResult({ ...state, parryArmed: true });
      return actionState({ ...state, parryArmed: true }, "parry", "招架姿态：等待武器落入青色窗口。 ");
    case "PARRY_END":
      return { ...state, parryArmed: false, action: state.action === "parry" ? "idle" : state.action };
    case "ENEMY_TELEGRAPH":
      if (!isCombat(state.phase) || state.enemy.telegraph !== "none") return state;
      return {
        ...state,
        enemy: { ...state.enemy, telegraph: event.telegraph },
        feedback: event.telegraph === "parryable" ? "青色吸气：现在准备招架。" : "金色环击：不可招架，闪避。",
      };
    case "ENEMY_STRIKE":
      if (!isCombat(state.phase) || state.enemy.telegraph === "none") return state;
      return strikeResult(state);
    case "ENEMY_RECOVER":
      return { ...state, enemy: { ...state.enemy, telegraph: "none" }, action: "idle" };
    case "NAME_BREAK":
      if (state.phase !== "warden" || state.enemy.poise > 0 || state.enemy.threads < 3) return actionState(state, "idle", "拆名需要三条名线与归零守势。 ");
      return actionState({ ...state, phase: "resolution", objective: "决定世界如何记住这场胜利" }, "namebreak", "三条名线围住誓卫：公开、绑定，还是斩断？");
    case "RESOLVE_NAME": {
      if (state.phase !== "resolution") return state;
      const facts: Record<RumorChoice, string> = {
        reveal: "盐岬港共同见证：执政官违背客礼。",
        bind: "潮门誓卫欠归乡者一次通行。",
        sever: "无人能确认是谁打开了潮门。",
      };
      return { ...state, phase: "rumor", rumorChoice: event.choice, rumorFacts: [...state.rumorFacts, facts[event.choice]], objective: "查看传播路径，然后登上归潮号", feedback: facts[event.choice] };
    }
    case "DEPART":
      if (state.phase !== "rumor") return state;
      return { ...state, phase: "success", enemy: noEnemy(), objective: "盐岬已在身后", feedback: "归潮号离港。下一座岛会先听见你留下的名字。" };
    case "RESTORE_BREATH":
      if (!isCombat(state.phase) || state.breath >= 3) return state;
      return { ...state, breath: state.breath + 1 };
    case "PAUSE":
      if (state.phase === "paused" || state.phase === "title") return state;
      return { ...state, previousPhase: state.phase, phase: "paused" };
    case "RESUME":
      if (state.phase !== "paused" || !state.previousPhase) return state;
      return { ...state, phase: state.previousPhase, previousPhase: null };
    case "RESTART": {
      const reset = initialGameState();
      return { ...reset, cameraShake: state.cameraShake, highContrast: state.highContrast };
    }
    case "TOGGLE_SHAKE":
      return { ...state, cameraShake: !state.cameraShake };
    case "TOGGLE_CONTRAST":
      return { ...state, highContrast: !state.highContrast };
    default:
      return state;
  }
}

export const canNameBreak = (state: GameState) => state.phase === "warden" && state.enemy.poise === 0 && state.enemy.threads >= 3;

export const rumorOutcome = (choice: RumorChoice | null) => {
  if (choice === "reveal") return { permission: "证人欢迎", risk: "权势家族敌视", island: "蜜酒礁" };
  if (choice === "bind") return { permission: "守卫债务", risk: "债务必须兑现", island: "回声谷" };
  if (choice === "sever") return { permission: "隐匿抵达", risk: "失去公开客权", island: "无灯岛" };
  return { permission: "未知", risk: "尚未形成", island: "远岛" };
};
