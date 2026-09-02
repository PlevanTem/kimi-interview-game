---
name: game-quality-loop
description: Evaluates a game build and drives evidence-based iterations across gameplay, visuals, interaction, performance, stability, motion, and sound. Use for Gate reviews, regressions, and release-candidate audits.
---
# Game Quality Loop

## Inputs and read order
1. `AGENTS.md`; 2. `game-context/index.json`; 3. brief, Gates, gameplay, StyleBible, registry; 4. build ID/environment; 5. prior `EvalRun` and unresolved iterations.

## Workflow
1. Record environment, commands, exit codes, seed, viewport, and build ID.
2. Run context/schema/assets, state tests, E2E, fixed visual checkpoints, and 60-second performance path.
3. Classify P0–P3 with evidence; separate observation from supported root cause.
4. Score functionality 30, visuals 25, interaction 20, performance 15, motion/sound 10; show totals.
5. Record `问题 → 证据 → 根因 → 最小修改 → 验证方法 → 前后结果`; unknown cause is `待诊断`.
6. Retest change and regression surface; after two non-improving rounds recommend rollback/scope reduction.

## Output
Return `EvalRun`, defects, evidence, arithmetic, IterationEntry updates, missing checks, and Gate recommendation.

## Failure conditions
Fail below total 85, any normalized category below 75, any P0/P1, missing evidence, console errors, sustained resource growth, median FPS below 55, or one continuous second below 45 FPS. Never fabricate causes or waive checks without contract evidence.

## Validation
- Entry/action/failure/success images use fixed seed/camera/time.
- E2E covers entry, win, fail/retry, input, mute, reduced motion, 1080p, and missing-asset fallback.
- Scores recompute; every defect has owner/retest; Gate 4 remains human.

