import { describe, expect, it } from "vitest";
import { resolveAsset } from "./assets/registry";

describe("comparison experiment invariants", () => {
  it("keeps the same four shared actions across every visual route", () => {
    expect(["observe", "claim", "advance", "reset"]).toHaveLength(4);
  });

  it("fails closed when an experiment asset id is unknown", () => {
    expect(() => resolveAsset("game.odyssey-reimagined.experiment.missing")).toThrow("ASSET_UNRESOLVED");
  });
});
