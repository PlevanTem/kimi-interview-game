---
name: visual-language-system
description: Defines a coherent lightweight 3D Art Bible, shared design tokens, keyframe brief, and generation prompts. Use after Fun Lock and before Gate 3; not to approve art or expand gameplay.
---
# Visual Language System

## Inputs and read order
1. `AGENTS.md`; 2. `game-context/index.json`; 3. frozen brief and human Gate 1/2 decisions; 4. gameplay/UX specification; 5. indexed StyleBible and registry.

## Workflow
1. Extract emotional promise, gameplay focus, readability needs, and prohibited motifs.
2. Define world rules, semantic colors, at most three shape families, and at most three material families.
3. Define composition, focal hierarchy, camera assumptions, lighting, depth, and contrast.
4. Map shared semantic tokens to UI, 3D materials, particles, and feedback.
5. Define motion duration/easing/amplitude, reduced-motion substitutions, and sound-to-motion intent.
6. Produce one target-keyframe brief, English prompt prefix, negative prompt, and deviation checklist.

## Output
Return machine-readable `StyleBible`, UI/CSS and 3D token maps, motion tokens, keyframe brief, prompt kit, prohibitions, and Gate 3 checklist.

## Failure conditions
Stop without Fun Lock, known focal states, or when approved tokens conflict. Do not fix hierarchy by adding colors, materials, particles, or ornament.

## Validation
- Each gameplay state has consistent focus and semantic color.
- Family limits hold; UI/3D/motion share meanings; contrast and reduced motion are reviewable.
- Gate 3 explicitly requires human approval of StyleBible and keyframe.

