---
name: vertical-slice-design
description: Converts a human-locked concept into an engine-agnostic gameplay, UX, and capability specification. Use after Gate 1 and before technology selection and Gate 2.
---
# Vertical Slice Design

## Inputs and read order
1. `AGENTS.md`; 2. `game-context/index.json`; 3. frozen `GameBrief` and human Gate 1 decision; 4. selected `ConceptCandidate`; 5. indexed gameplay and latest iteration.

## Workflow
1. State the player goal, core verb, cadence, session end, and content budget.
2. Define interaction intent and required input affordances without assuming keyboard, touch, controller, XR, or a platform.
3. Specify engine-agnostic states, events, guards, effects, transitions, illegal-event behavior, and deterministic reset needs.
4. Teach through action-feedback in the first 30 seconds.
5. Map state to HUD and feedback without embedding rendering.
6. Derive technology capabilities from the mechanic: dimensionality, camera, simulation, physics, networking, persistence, content pipeline, deployment, accessibility, performance, and testability.
7. Define graybox outcomes, playtest questions, and Gate 2 evidence.

## Output
Return loop, interaction model, transition table, tutorial, information hierarchy, feedback matrix, capability requirements, deterministic hooks, acceptance scenarios, risks, and human judgement.

## Failure conditions
Stop without human Gate 1 approval, when concept/brief disagree, or the loop needs multiple primary verbs. Do not add levels, progression, currencies, or systems to mask unclear fun.

## Validation
- Start, tutorial, play, pause, success, failure, restart, and illegal-state recovery are specified/reachable.
- Goal is clear within 30 seconds; a run fits five minutes; outcomes are deterministic; Gate 2 remains human.
