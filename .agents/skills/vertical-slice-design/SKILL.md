---
name: vertical-slice-design
description: Converts a human-locked concept into an engine-agnostic gameplay, UX, and capability specification. Use after Gate 1 and before technology selection and Gate 2.
---
# Vertical Slice Design

## Inputs and read order
1. `AGENTS.md`; 2. `games/registry.json`; 3. active game's manifest and context index; 4. frozen `GameBrief` and human Gate 1 decision; 5. selected `ConceptCandidate`; 6. indexed gameplay and latest iteration. Root `game-context/` is historical fixture data, not a production default.

## Workflow
1. State the full-game player goal, gameplay pillars, macro loop, intended session arc when known, and content budget.
2. Select the next highest-risk hypothesis and define a bounded Demo validation slice. State which portion of the full game it represents, which systems are real or simulated, and what it cannot prove.
3. Define interaction intent and required input affordances without assuming keyboard, touch, controller, XR, or a platform.
4. Specify engine-agnostic states, events, guards, effects, transitions, illegal-event behavior, and deterministic reset needs for the slice.
5. Teach through action-feedback early enough for the intended test; set a game-specific target instead of a universal 30-second rule.
6. Map state to HUD and feedback without embedding rendering.
7. Derive technology capabilities from the mechanic: dimensionality, camera, simulation, physics, networking, persistence, content pipeline, deployment, accessibility, performance, and testability.
8. Define graybox outcomes, playtest questions, Gate 2 evidence, and the decision that each possible result will trigger.

## Output
Return full-game-to-slice mapping, slice loop, interaction model, transition table, tutorial, information hierarchy, feedback matrix, capability requirements, deterministic hooks, acceptance scenarios, limitations, risks, and human judgement.

## Failure conditions
Stop without human Gate 1 approval or when concept/brief disagree. Multiple primary verbs in the full game are allowed; if they cannot be tested together affordably, phase them into separate hypotheses without pretending an isolated test proves their combination. Do not add levels, progression, currencies, or systems to mask unclear fun.

## Validation
- Start, tutorial, play, pause, success, failure, restart, and illegal-state recovery are specified/reachable.
- The slice lasts only as long as required for understanding, trial, repetition, and observation; no fixed minute target is inherited from the project.
- Evidence distinguishes what the slice proves, does not prove, and defers; outcomes are reproducible where the test requires it; Gate 2 remains human.
