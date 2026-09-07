# main 海图与美术修订集成

- Run: `run-20260907-review-r3` integration follow-up, 2026-09-07.
- User authority: preserve local art changes; merge main into current branch, resolve conflicts, verify and reopen.
- Input: current branch `codex/game-asset-polish` at `a65a39e`; main `f334fe7073ae46f61b8e293f7f8ebb3f6c83b370`; StyleBible 6 / asset registry 9.
- Recovery: retained Git stash `nostos-art-before-main-f334fe7-20260907`, including NOSTOS untracked art source; excluded unrelated skills and Python cache. Not dropped.
- Recovery object: `badf966bf9bce1d21646d37c0738c2b3536d5d8c`.
- Final production build: `dist/assets/index-1aslOchB.js` / `index-Bnr4NsqP.css`.
- Initial Git integration: fast-forwarded current branch to main; restored art changes as uncommitted work. Subsequently the user explicitly requested "推送合入main", authorizing a scoped NOSTOS commit and main push. No Gate approval inferred.

## Issue → evidence → cause → change

Esc lacked the merged sea chart. `git merge-base --is-ancestor f334fe7 HEAD` returned 1 before integration, and the served overlay lacked chart imports. Vite was correctly serving the art branch, but that branch had not incorporated main. Restarting alone could not fix a missing source change.

Fast-forward main, then apply retained art stash. Resolve `overlay.ts` and `styles.css` by retaining main's chart/layout/volume slider and reconnecting revision/workbench, synchronized motion controls, resume focus and Escape pointer-lock fix. Remove superseded one-column heading/controls rather than duplicate menus. Include workbench links in keyboard focus loop.

## Verification

- `npm run validate:library`: exit 0, PASS before integration.
- `npm run build:nostos`: exit 0.
- `npm run test:nostos`: exit 0, 98 tests / 12 files passed, including chart relief and r3 art tests.
- Scoped ESLint for overlay, flow and main-integration E2E: exit 0.
- `npm run validate:context`, `npm run audit:assets`, `git diff --check`: exit 0.
- Ancestor check after integration: exit 0. No unmerged paths remain.
- Compared world/engine/scene changes against retained stash: only main's intentional audio and terrain refactor differs; local art source remains intact.
- Browser attempt 1: exit 1, total 360-second test budget exhausted at workbench load after full entry, 1080p, settings and 720p/narrow assertions passed.
- Browser attempt 2: exit 1. Full entry, 1080p, settings, 720p/narrow and actual workbench version/10-hero assertions passed. Final re-pause failed because a concurrent `assets:nostos` build triggered Vite reload. Trace shows the original page reconnecting at 556459ms; both resource snapshots report phase `title` / act 0 instead of `roaming` / act 1. This invalidates that return-path observation; it is not accepted as a game pass.
- Correction: stop testing against mutable dev builds. Keep the observed layout/workbench evidence and run the affected Esc return path on isolated production preview port 4178 (`NOSTOS_E2E_PORT=4178`, `--grep '@main-resume'`), with explicit roaming assertions. No game-source changes or builds during this run. Final result: exit 0, 1 passed (1.9 minutes); errors [], 61.64-second observation, geometries 27→27, textures 9→9, roaming preserved, re-pause and resume focus passed. Evidence: `production-esc.jpg`, `report.json`.
- Coverage boundary: production return-path retest passed; desktop/narrow/settings/workbench assertions passed before the invalidating dev reload in attempt 2. The long combined test is not claimed to have passed end-to-end. No functional failures remain from this integration; failure history is retained above.
- Concurrent unit rerun: 96 passed, 2 timed out at 5000ms under software-renderer contention. After the browser exited, the same unmodified `npm run test:nostos` passed 98/98 in 4.22 seconds, exit 0. No test threshold was weakened.
- `npm run assets:nostos`: exit 0. Export and dist copy SHA256: `62DFB5D822A429FAA8D3883CAB7A82948260B331F22BB732D233272D62880980`.
- Gate 4 is not evaluated by this integration check. SwiftShader observations are not hardware FPS certification.
