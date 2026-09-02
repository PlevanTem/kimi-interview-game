---
name: web3d-demo-build
description: Implements and verifies the approved lightweight 3D slice with Vite, React, TypeScript, Three.js, and React Three Fiber. Use for graybox, integration, static build, and targeted performance work after the relevant Gate.
---
# Web 3D Demo Build

## Inputs and read order
1. `AGENTS.md`; 2. `game-context/index.json`; 3. frozen brief and required human Gate decisions; 4. gameplay, approved StyleBible when beyond graybox, and registry; 5. source/tests/config/EvalRun/latest iteration.

## Workflow
1. Confirm authority: Gate 1 for graybox, Gate 2 for final visuals, Gate 3 for release integration.
2. Keep pure TypeScript state/reducer separate from rendering.
3. Use React DOM UI, shared StyleBible tokens, and the asset resolver.
4. Preserve fixed seed/cameras/time, pause/restart, outcomes, mute, and reduced motion.
5. Implement the smallest accepted loop; add no extra state, physics, or audio framework.
6. Run narrow checks, then affected integrated quality checks.

## Output
Return modified paths, behavior/contracts, commands and exit codes, evidence, risks, and required IterationEntry data.

## Failure conditions
Stop for missing Gate authority, conflicting contracts, unknown asset IDs, or changed product intent. Never complete with failed/skipped required checks.

## Validation
- Typecheck/build and affected unit/E2E pass; context/asset audits pass; no hardcoded scene paths.
- Chrome 1920×1080 keyboard/mouse flow and deterministic visual checkpoints reproduce.
- Release-affecting work includes the 60-second performance evidence.

