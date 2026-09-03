# 《下一盏灯》灰盒

本构建只验证“铺设使下一段可走”的核心体验。它使用固定八段、程序化基础几何和 DOM 状态反馈，不代表最终视觉方向。第 2–8 段的可见断口会阻止直线通关，玩家必须在同一“铺设”动作内选择绕行；绘制中实时显示原因与剩余长度。

控制：点击“开始旅程”；在画布内按住并从圆形起点拖到方形落点，松开提交；右键取消草案；可暂停、继续或重开。三次连续无效提交进入失败状态，第八段通过后进入成功状态。

验证命令从仓库根目录执行：

- `npm run validate:library`
- `npx tsc --project games/odyssey-drifter/tsconfig.json`
- `npx vitest run --config games/odyssey-drifter/vitest.config.ts`
- `npx vite build --config games/odyssey-drifter/vite.config.ts`
- `npx playwright test --config games/odyssey-drifter/playwright.config.ts`
- `node games/odyssey-drifter/scripts/verify-assets.mjs`

自动证据位于 `runs/run-20260902-odyssey-graybox/evidence/`，包含成功截图、空间选择截图、性能数据和三项浏览器 trace。

Gate 2 仍需真人判断：5 名新手中是否至少 4 名在 30 秒内首次完成铺设、至少 3 名能描述有意义选择、失败是否温和，以及八段是否实际落在 3–5 分钟。自动化不能替代这些结论。
