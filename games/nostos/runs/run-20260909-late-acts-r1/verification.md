# 后五幕美术与结尾验证
版本 2026.09.09-late-r1；分支 codex/late-acts-art。等待人类审美检视，不代表 Gate 3/4 批准，未合入 main。
## 可复现检查
- npm run test:nostos — exit 0；13 files; 120 tests passed (final terrain/geometry state)
- npm run assets:nostos — exit 0；20 shared narrative assets; generated asset-library.html
- npm run build:nostos — exit 0；TypeScript and production Vite build passed
- $env:NOSTOS_E2E_PORT=4178; node node_modules/@playwright/test/cli.js test --config=games/nostos/playwright.config.ts late-acts.spec.ts — exit 0；1 passed; later five acts, NPC interactions, memory, natural ending and pause freeze; 8.7m
- $env:NOSTOS_E2E_PORT=4179; node node_modules/@playwright/test/cli.js test --config=games/nostos/playwright.config.ts late-workbench.spec.ts — exit 0；2 passed; workbench all 20 cards, final face/memory/cave closeups and ending skip; 2.0m
- $env:NOSTOS_E2E_PORT=4179; node node_modules/@playwright/test/cli.js test --config=games/nostos/playwright.config.ts late-workbench.spec.ts --grep "final close-up" — exit 0；1 passed on final terrain support correction; 2.4m
- npm run validate:library — exit 0；PASS
- npm run validate:context — exit 0；PASS
- npm run audit:assets — exit 0；PASS
- git diff --check — exit 0；PASS
- GET http://127.0.0.1:4175/src/content/revision.ts — exit 0；HTTP 200; 2026.09.09-late-r1
## 实拍
目录 after/：藤门、配重织机、三位NPC、磨名界石、绳、四泉、二十树桩、成衣与屋顶烟。
最终近景以 circe-face-final.jpg、circe-memory-final.jpg、calypso-cave-final.jpg 为准；工作台见 late-workbench.jpg。
完整流程证据 browser-verification.json。结尾先测试自然播放和暂停，再在最终补丁测试中验证空格跳过。
## 范围说明
人物为三维静态雕塑与已有低幅呼吸，非骨骼/口型动画。泉水为美术化动态水面，非流体模拟。软件渲染浏览器不作为真实硬件性能达标证明。
## 本地审阅
- 第三幕：http://127.0.0.1:4175/?preview=circe
- 伊萨卡：http://127.0.0.1:4175/?preview=ithaca （门槛回忆后自动播放归家镜头）
- 同版资产：http://127.0.0.1:4175/docs/asset-library.html
