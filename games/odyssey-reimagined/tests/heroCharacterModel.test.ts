import { readFile } from "node:fs/promises";
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

  it("registers the active code model against the current turnaround and action sheet", async () => {
    const registry = JSON.parse(
      await readFile(new URL("../assets/asset-registry-v1.json", import.meta.url), "utf8"),
    ) as { assets: Array<{ id: string; version: string; locator: { value: string }; dependencies: string[] }> };
    const hero = registry.assets.find((asset) => asset.id === "game.odyssey-reimagined.character.hero");

    expect(hero).toMatchObject({
      version: "0.3.0",
      locator: { value: "games/odyssey-reimagined/src/HeroCharacterModel.tsx#HeroCharacterModel" },
      dependencies: [
        "game.odyssey-reimagined.previsual.hero-turnaround-chibi-v3",
        "game.odyssey-reimagined.previsual.hero-action-spritesheet-chibi-v2",
      ],
    });
  });
});
