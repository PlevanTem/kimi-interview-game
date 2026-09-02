---
name: game-concept-forge
description: Generates and scores exactly three constrained lightweight 3D game concepts. Use during discovery before Gate 1; not after lock or to choose for the human.
---
# Game Concept Forge

## Inputs and read order
1. `AGENTS.md`; 2. `game-context/index.json`; 3. indexed `GameBrief` and Gate record; 4. current run input and rejected concepts.
Required: audience, promise, 3–5 minute duration, one-scene/one-verb scope, constraints, success criteria.

## Workflow
1. Convert the brief into hard constraints and rejection tests.
2. Generate exactly three candidates differing in fantasy, verb, and visual motif without systemic complexity.
3. Give each fantasy, 20–40 second loop, controls, visual hook, content budget, risks, and graybox proof.
4. Score 0–100 inputs as `0.30 feasibility + 0.25 core fun + 0.20 visual memorability + 0.15 learnability + 0.10 scope safety`; show arithmetic.
5. Expose assumptions and human decisions. Never select or freeze.

## Output
Return `ConceptCandidate[3]`, comparison, and Gate 1 checklist. Each has a stable ID and nullable rejection reason.

## Failure conditions
Stop for an absent/contradictory brief, a brief already frozen elsewhere, or missing measurable success criteria. Reject needs for multiple scenes/verbs, complex physics, backend, network, runtime AI, or unbudgeted assets.

## Validation
- Exactly three distinct IDs/motifs; every field populated; weights total 100%.
- Basic geometry can test the promised fun; no automatic approval language.

