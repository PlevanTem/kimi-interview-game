---
name: technology-fit-selection
description: Selects a prototype technology route from an approved concept and mechanic requirements. Use after Concept Lock and before graybox implementation; never choose a stack from repository precedent alone.
---
# Technology Fit Selection

## Inputs
Read `AGENTS.md`, the active game manifest/context, human Gate 1 decision, engine-agnostic experience specification, target audience/platform constraints, and latest iteration. Treat existing adapters as evidence, not defaults.

## Decision workflow
1. Extract required capabilities: dimensionality, camera, input, simulation, physics, networking, persistence, content pipeline, accessibility, deployment, performance, team skills, iteration speed, and AI implementation risk.
2. Separate hard requirements from preferences and unknowns. Reject requirements invented solely to justify a familiar stack.
3. Compare at most three viable routes using weighted criteria derived from the concept. Include scope cost, failure modes, asset fit, testability, delivery friction, and reversibility.
4. For any decision-driving unknown, implement a time-boxed spike of the riskiest mechanic rather than a decorative scene.
5. Record the evidence, rejected alternatives, migration boundary, verification commands, and human decision in `technology-decision.json`.

## Output
Return requirements, candidate matrix, spike result, recommendation with uncertainties, rollback boundary, and the exact human approval still required. Do not modify gameplay to make a preferred technology win.

## Failure conditions
Stop when Gate 1 is absent, requirements conflict, a platform constraint is unknown and material, or evidence cannot distinguish candidates. No stack is locked until a human records approval.
