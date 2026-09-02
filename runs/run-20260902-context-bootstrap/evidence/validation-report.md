# Day 1 验证报告

日期：2026-09-02  
环境：Windows、Chrome/Chromium、1920×1080、AMD Radeon 集显 D3D11

## 已通过

- `node scripts/validate-library.mjs`：PASS；空游戏库、暂停状态与模板结构有效。
- 失败路径：临时创建未登记 `games/unmanaged-proof/` 后校验按预期 FAIL (1)，清理后复验 PASS。
- `node scripts/validate-context.mjs`：PASS；概念恰好 3 个，Gate 1 pending，Brief 未冻结，StyleBible blocked。
- `node scripts/audit-assets.mjs`：PASS；22 个代码资产 ID 与注册表双向一致。
- `node scripts/validate-skills.mjs`：PASS；5 个专家配置与 6 个技能位于正式项目目录且契约完整。
- `npm run lint`：PASS。
- `npm run test`：1 个文件、4 个 reducer 测试全部通过。
- `npm run build`：PASS；静态 `dist` 已生成。
- `npm run test:e2e`：4/4 PASS，覆盖进入校准、暂停、静音、重开、视觉基线与性能。
- 性能：ANGLE AMD Radeon D3D11，5 秒窗口中位 FPS 59.9，达到 ≥55 的框架阶段门槛。
- 浏览器人工检查：Gate 1 页面与三个概念可见，暂停对话框有效，控制台无 error/warning。
- `npm run quality:framework`：PASS；上述上下文、资产、技能、Lint、Unit 与 Build 已在正式目录结构下串行复验。

## 诊断记录

首次无头性能测试为 SwiftShader 软件渲染，仅 15.0 FPS。根因不是场景复杂度，而是测试渲染器错误；改为硬件 D3D11 后同一场景达到 59.9 FPS。详见 `game-context/iterations.json`。

## 尚未评测

游戏生产已由人类暂停且没有 active game，因此玩法、正式视觉、声音反馈与发布总分保持为空；`npm run quality:report` 按设计返回非零。
