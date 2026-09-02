---
name: adaptive-prototype-build
description: Implements and verifies a lightweight game slice using the human-approved technology decision. Use for graybox and integration after Tech Fit Lock; it is engine- and platform-agnostic.
---
# Adaptive Prototype Build

## Inputs
Read `AGENTS.md`, the active game manifest/context, passed Gate records, approved `technology-decision.json`, gameplay specification, relevant StyleBible, asset registry, source/tests/config, EvalRun, and latest iteration.

## Workflow
1. Confirm authority: Concept Lock and Tech Fit Lock for graybox; Fun Lock for final visuals; Visual Lock for release integration.
2. Follow the selected stack's architecture and verification commands recorded in the game manifest; do not import conventions from the Web 3D reference adapter unless explicitly selected.
3. Keep domain gameplay state independent from presentation where the selected tool permits it, and preserve deterministic test hooks for the core loop.
4. Implement the smallest accepted loop and the highest-risk mechanic first. Add libraries only when an approved requirement cannot be met more simply.
5. Resolve assets through the game registry and share StyleBible semantics across world, UI, motion, and sound.
6. Run stack-appropriate narrow checks, then the game manifest's integrated quality command.

## Output
Return modified paths, implemented contracts, commands and exit codes, evidence, risks, and required IterationEntry data.

## Failure conditions
Stop for missing Gate/Tech Fit authority, conflicting contracts, unknown asset IDs, changed product intent, or absent verification commands. Never weaken acceptance criteria to fit the chosen tool.
