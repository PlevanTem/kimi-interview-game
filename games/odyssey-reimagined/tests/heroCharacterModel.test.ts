import { describe, expect, it } from "vitest";
import { HERO_LAB_ACTIONS } from "../src/HeroCharacterModel";

const expectedOrder = [
  "idle_neutral",
  "idle_combat",
  "locomotion_walk",
  "locomotion_run",
  "observe",
  "light_1",
  "light_2",
  "heavy",
  "dodge",
  "parry",
  "hit",
  "namebreak",
];

describe("hero character model contract", () => {
  it("keeps the twelve audited action IDs in spritesheet order", () => {
    expect(HERO_LAB_ACTIONS.map((action) => action.id)).toEqual(expectedOrder);
  });

  it("keeps action IDs and labels unique", () => {
    expect(new Set(HERO_LAB_ACTIONS.map((action) => action.id)).size).toBe(12);
    expect(new Set(HERO_LAB_ACTIONS.map((action) => action.label)).size).toBe(12);
  });
});
