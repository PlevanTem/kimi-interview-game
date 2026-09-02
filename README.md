# Concept Forge

Concept Forge 是一套“先锁定体验，再生产内容”的 AI 轻量 3D 游戏 Demo 生产系统。它既包含一个可运行的 Web 3D 交互探针，也把概念、玩法、视觉语言、资产、质量证据和每次纠偏都纳入版本化管理。

项目的目标是在五天内交付一个 3–5 分钟、单场景、单核心动词的高质量垂直切片。首版面向 Chrome 桌面端 1920×1080、键鼠与普通集显笔记本；采用 Vite、React、TypeScript、Three.js 和 React Three Fiber，无后端、运行时 AI、联网依赖或复杂物理。

## 当前状态

当前处于 **Repository Bootstrap**，游戏生产工作流已由人类暂停，`games/registry.json` 中没有 active game。系统曾生成以下三个候选用于验证框架，但它们目前只是启动证据，不构成已登记或已锁定的游戏：

- **共振庭院**：用声波脉冲连接节拍节点，形成连锁共振；视觉记忆点是从冷寂到暖亮的同心波纹。
- **折径**：沿预设轴折叠微缩空间，为自动前进的光点接通断路；视觉记忆点是纸雕世界的三维折叠。
- **影迹信标**：转动信标，用投影出的影子桥护送旅者；视觉记忆点是聚光灯下不断重构的几何剪影。

页面保持主题中立，仅用于验证 Web 3D 技术路径、输入、状态机、资产解析和测试设施，不代表最终游戏主题。恢复生产时，必须先创建 `games/<game-id>/` 独立工作区并登记，再进入该游戏自己的 Gate 1。

## 快速开始

建议使用 Node.js 20 LTS 或 22，以及已安装的 Playwright Chromium。

```bash
npm install
npm run dev
```

打开终端显示的本地地址。交互探针支持：

- `W` `A` `S` `D`：移动
- `Space`：与附近锚点交互
- `Esc`：暂停/继续
- `R`：重开
- `M`：静音

## 质量验证

```bash
npm run quality:framework
npm run validate:library
npm run test:e2e
npm run test:performance
```

`quality:framework` 验证上下文、资产、技能、代码、单元测试与构建。完整的 `npm run quality` 还要求 Gate 4 的正式质量报告；在游戏尚未通过 Gate 4 时，它按设计返回非零，防止把半成品误报为发布候选。

发布门槛为总分至少 85/100、任一类别不低于 75、没有 P0/P1，并附带测试输出、截图或性能数据。所有修复都必须留下“问题 → 证据 → 根因 → 修改 → 验证 → 结果”。

## 如何理解项目

- [架构与工作模式](docs/architecture.md)：工作流、数据流、文件系统、职责边界与纠偏路径。
- [多游戏内容治理](docs/content-governance.md)：游戏库注册、目录隔离、命名和共享提升规则。
- [共享上下文治理](docs/context-governance.md)：单一事实源、读取顺序和资产引用规则。
- [质量评分与放行](docs/quality-system.md)：评分权重、证据要求和 Gate 4 条件。
- [变更记录](CHANGELOG.md)：功能、决策、修复与验证记录。
- [`game-context/index.json`](game-context/index.json)：所有代理开始工作的唯一上下文入口。
- [`games/registry.json`](games/registry.json)：正式游戏工作区与 active game 的唯一注册表。

项目级专家位于 `.codex/agents/`，可复用技能位于 `.agents/skills/`。未来每个游戏独立位于 `games/<game-id>/`；未经登记的目录会被校验器拒绝。仓库根目录现有的 `Note.docx` 不属于生产上下文，系统不会读取、修改或删除它。

## 许可与发布

当前项目为私有原型，尚未声明开源许可，也未公开部署。Gate 4 通过后输出静态 `dist/`、操作说明、最终报告、关键截图与完整迭代证据。
