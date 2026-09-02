# Changelog

本文件记录项目中可观察的功能变化、关键决策、根因修复与验证结果。版本格式遵循 Semantic Versioning；尚未发布的工作归入 `Unreleased`。更细粒度的“问题 → 根因 → 修改 → 验证”记录位于 `game-context/iterations.json`。

## [Unreleased]

### Pending

- 游戏生产工作流由人类暂停；没有 active game，不进入 Gate 1–4。
- 「共振庭院」「折径」「影迹信标」仅保留为框架启动证据，系统没有自动确定主题。

### Added

- 新增 `games/registry.json` 全局游戏注册表和 `games/_template/` 标准工作区模板。
- 新增游戏库与 manifest Schema、`validate:library` 校验器，以及未登记目录拒绝机制。
- 新增始终生效的 `.cursor/rules/content-governance.mdc` 和多游戏内容治理文档。
- 新增 Tech Fit Review、`TechnologyDecision` Schema、风险 Spike 规范和持久技术选择规则。
- 新增 `technology-fit-selection` 与 `adaptive-prototype-build` 技能。

### Changed

- 将仓库明确划分为根级生产系统控制面与 `games/<game-id>/` 游戏内容面。
- 正式游戏必须独立管理 context、runs、assets、src、tests、docs，并禁止隐式跨游戏引用。
- GitHub 仓库创建与首次提交提前到生产工作流之前。
- 将 Vite/React/Three.js 从全局技术基线降级为可选的 Web 3D 参考适配器。
- 将 `web3d-engineer` 调整为技术中立的 `prototype-engineer`；技术选型改由策划和玩法能力需求驱动，并要求人工 Tech Fit Lock。

### Fixed

- 修复首个参考实现的交付约束被错误提升为所有未来游戏系统级约束的问题，避免技术栈在创意前过早锁定。

## [0.1.0] - 2026-09-02

### Added

- 建立 Vite、React、TypeScript、Three.js、React Three Fiber 的静态 Web 3D 技术骨架。
- 建立主题中立的交互探针，覆盖键鼠输入、暂停、重开、静音、完成与失败状态。
- 建立 5 个窄职责项目级专家：概念导演、体验设计、视觉导演、Web 3D 工程、质量审计。
- 建立 6 个可复用技能：概念生成、垂直切片设计、视觉语言、资产治理、Web 3D 构建、质量循环。
- 建立 `game-context/` 单一事实源、10 份 JSON Schema、唯一 `run-id` 目录与 Gate 状态记录。
- 生成恰好 3 个主题候选及加权评分、风险、内容预算和灰盒方案。
- 建立 22 项主题中立的程序化资产注册表与统一 resolver。
- 建立上下文校验、资产双向审计、技能校验、单元测试、Playwright E2E、视觉回归和 60 秒性能测试。
- 建立入口、核心交互、失败、成功的确定性视觉测试规范；当前保存 Gate 入口基线与 Day 1 证据包。
- 新增用户 README、架构文档、上下文治理文档、质量体系文档和本变更记录。

### Changed

- 将远程 Google Fonts 改为系统字体栈，确保静态构建在离线环境下保持可用和稳定。
- 将 Vite 7 降至 Vite 6.4.3，以兼容当前 Node.js 22.11 环境并消除核心构建引擎警告。
- 将场景中的颜色、材质和程序化几何全部改为稳定资产 ID 引用，禁止散落硬编码资源路径。
- 将 Playwright 测试改为串行，并为性能项目显式启用 D3D11 硬件渲染与关闭后台节流。

### Fixed

- 修复初版资产审计只检查注册表内部、无法发现代码漏登记资产的问题；现在执行代码目录与注册表双向校验。
- 修复无头 Chromium 使用 SwiftShader 导致约 15 FPS 的错误性能结论；AMD Radeon D3D11 环境复测中位数为 59.9 FPS。

### Verified

- 上下文 Schema 与索引校验通过。
- 22 个资产记录的 ID、来源、许可、风格、预算与代码引用双向审计通过。
- TypeScript 状态机单元测试 4/4 通过。
- Playwright 功能、视觉和性能测试 4/4 通过；浏览器控制台无 warning/error。
- 生产构建成功；详细证据见 `runs/run-20260902-context-bootstrap/evidence/validation-report.md`。

### Decisions

- 人类 Gate 优先于自动评分；两个候选同为 86.15 分也不触发自动选择。
- Gate 1 前仅生产主题中立的系统与交互探针，避免在未锁定世界观时制造正式资产债务。
- 以程序化几何、材质和灯光为主，不引入 Blender 或 AI glTF 主生产线。
