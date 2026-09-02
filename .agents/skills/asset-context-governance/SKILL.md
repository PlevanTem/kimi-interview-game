---
name: asset-context-governance
description: Registers, resolves, and audits procedural and file-based game assets through stable IDs. Use when adding, changing, referencing, or validating models, textures, fonts, sounds, or generated media.
---
# Asset Context Governance

## Inputs and read order
1. `AGENTS.md`; 2. `game-context/index.json`; 3. frozen brief, Gate records, approved StyleBible; 4. indexed registry/resolver; 5. changed sources or procedural entrypoints.

## Workflow
1. Allocate or reuse a stable asset ID; identity never comes from a path.
2. Record type, version, source, license, generated prompt hash, style tags, size budget, dependencies, approval, and path or procedural entrypoint.
3. Reference scene assets only through the resolver.
4. Preserve an ID only for compatible semantics; otherwise create an ID and migrate dependents.
5. Audit duplicate IDs, targets, orphans, dependencies, licenses, budgets, style tags, and direct paths.

## Output
Return changed `AssetRecord` entries, resolution/dependency changes, audit results, consumers, approval needs, and validation commands.

## Failure conditions
Reject unlicensed or provenance-free sources, ambiguous ownership, cycles, unresolved paths, or locked-style violations. Never silently substitute; document an approved fallback ID.

## Validation
- Every ID resolves once; every target exists; no duplicates, cycles, unapproved orphans, or direct scene paths.
- License, provenance, style, dependencies, budgets, and generated prompt/version traceability are complete.

