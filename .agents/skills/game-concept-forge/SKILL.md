---
name: game-concept-forge
description: Generates and compares exactly three full-game concepts plus scoped validation slices. Use during discovery before Gate 1; not after lock or to choose for the human.
---
# Game Concept Forge

## Inputs and read order
1. `AGENTS.md`; 2. `games/registry.json`; 3. active game's `manifest.json` and `context/index.json`; 4. indexed `GameBrief` and Gate record; 5. current run input and rejected concepts. Root `game-context/` is historical fixture data, not a production default.
Required: audience, full-game experience promise, known product constraints, validation budget, success criteria, and unresolved human decisions. Product duration may be unknown.

## Workflow
1. Convert the brief into hard constraints and rejection tests.
2. Generate exactly three candidates differing in player fantasy, systemic structure, and visual/world motif. A full-game candidate may use multiple scenes, verbs, progression layers, or a long-form arc when they serve the promise.
3. Give each candidate a full-game vision: fantasy, gameplay pillars, repeatable core loop, macro loop, progression/content structure, world or character arc, visual hook, audience fit, production risks, and plausible scope variants.
4. Separately define a `DemoValidationSlice`: the single highest-risk hypothesis, smallest representative playable subset, observable player behavior, pass/fail evidence, omissions, and estimated effort. It may implement only part of the game and has no universal duration.
5. Compare product potential separately from demo tractability. Score product potential as `0.25 thematic distinctiveness + 0.25 systemic depth/variety + 0.20 player fantasy + 0.15 world/emotional potential + 0.15 audience clarity`. Score demo tractability separately as `0.35 hypothesis clarity + 0.25 isolation feasibility + 0.25 evidence quality + 0.15 implementation economy`. Show arithmetic for both, but rank by product potential and use demo tractability only as a risk qualifier; never add them into one total.
6. Expose assumptions and human decisions. Never select or freeze.

## Output
Return `ConceptCandidate[3]`, product-potential comparison, demo-tractability comparison, and Gate 1 checklist. Each has a stable ID and nullable rejection reason.

## Failure conditions
Stop for an absent/contradictory brief, a brief already frozen elsewhere, or missing measurable success criteria. Do not reject a full-game concept merely because it needs multiple scenes, verbs, progression, simulation, backend, network, runtime AI, or substantial assets. Instead expose those dependencies and reject only when the experience promise is incoherent, the dependency has no credible production path, or no affordable slice can test the decisive assumption.

## Validation
- Exactly three distinct IDs, fantasies, systemic structures, and motifs; every required field populated.
- Each candidate clearly separates full-game scope from Demo scope and names what the Demo will not prove.
- The selected validation medium can test the decisive assumption; it need not reproduce the full game, use basic geometry, fit one scene, or end within five minutes.
- No automatic approval language.

